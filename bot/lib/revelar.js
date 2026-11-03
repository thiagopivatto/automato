/**
 * Visualização única → mídia NORMAL.
 *
 * Fluxo:
 * 1) Ao receber VO com mídia → baixa → reenvia no mesmo chat sem viewOnce
 * 2) !revelar respondendo a VO → mesma lógica a partir do quote
 */
import {
    downloadContentFromMessage,
    downloadMediaMessage,
    getContentType
} from '@whiskeysockets/baileys'
import { tiposMensagem } from '../baileys/mensagem.js'
import * as socket from '../baileys/socket.js'

const KIND = {
    [tiposMensagem.imagem]: 'image',
    [tiposMensagem.video]: 'video',
    [tiposMensagem.audio]: 'audio'
}

/** Evita reenviar a mesma msg 2x (upsert duplicado) */
const jaReenviadas = new Set()
const MAX_MEM = 3000

function chaveMsg(key) {
    if (!key?.id) return null
    return `${key.remoteJid}|${key.id}`
}

function marcarReenviada(key) {
    const k = chaveMsg(key)
    if (!k) return
    jaReenviadas.add(k)
    if (jaReenviadas.size > MAX_MEM) {
        const first = jaReenviadas.values().next().value
        jaReenviadas.delete(first)
    }
}

function jaFoiReenviada(key) {
    const k = chaveMsg(key)
    return !!(k && jaReenviadas.has(k))
}

function toBuffer(val) {
    if (val == null) return null
    try {
        if (Buffer.isBuffer(val)) return val.length ? val : null
        if (val instanceof Uint8Array) return val.length ? Buffer.from(val) : null
        if (val?.type === 'Buffer' && Array.isArray(val.data)) {
            return val.data.length ? Buffer.from(val.data) : null
        }
        if (Array.isArray(val?.data)) return val.data.length ? Buffer.from(val.data) : null
        if (typeof val === 'string' && val.length) {
            try {
                const b = Buffer.from(val, 'base64')
                return b.length ? b : null
            } catch {
                return Buffer.from(val)
            }
        }
    } catch { /* */ }
    return null
}

function limparMidia(midia) {
    if (!midia || typeof midia !== 'object') return null
    const out = { ...midia }
    out.viewOnce = false
    for (const campo of ['mediaKey', 'fileSha256', 'fileEncSha256', 'jpegThumbnail', 'waveform']) {
        const b = toBuffer(out[campo])
        if (b) out[campo] = b
        else if (campo === 'mediaKey') delete out.mediaKey
    }
    return out
}

/**
 * Detecta se o proto é (ou contém) visualização única.
 */
export function ehViewOnce(message) {
    if (!message) return false
    const tipo = getContentType(message)
    if (String(tipo || '').includes('viewOnce')) return true
    if (message?.[tipo]?.viewOnce === true) return true
    // wrappers comuns
    for (const w of ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension']) {
        const inner = message[w]?.message
        if (inner && ehViewOnce(inner)) return true
    }
    return false
}

/**
 * Desembrulha wrappers e devolve { tipo, midia, ptt }.
 * tipo = imageMessage | videoMessage | audioMessage
 */
export function extrairMidiaViewOnce(message) {
    if (!message) return null
    let msg = message
    for (let i = 0; i < 6; i++) {
        const wrap =
            msg.ephemeralMessage ||
            msg.viewOnceMessage ||
            msg.viewOnceMessageV2 ||
            msg.viewOnceMessageV2Extension ||
            msg.documentWithCaptionMessage
        if (!wrap?.message) break
        msg = wrap.message
    }
    const tipo = getContentType(msg)
    if (!KIND[tipo]) return null
    const midia = limparMidia(msg[tipo])
    if (!midia) return null
    const ptt = tipo === tiposMensagem.audio && !!(midia.ptt || midia.ptt === true)
    return { tipo, midia, ptt, messageInner: { [tipo]: midia } }
}

function temDownload(midia) {
    const key = toBuffer(midia?.mediaKey)
    return !!(key?.length && (midia.url || midia.directPath || midia.thumbnailDirectPath))
}

async function lerStream(stream) {
    const chunks = []
    for await (const c of stream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
    return Buffer.concat(chunks)
}

/**
 * Baixa bytes da mídia VO.
 * @param {object} opts.downloadFn - injetável nos testes
 */
export async function baixarMidiaViewOnce(sock, waMessage, { downloadFn } = {}) {
    const extraido = extrairMidiaViewOnce(waMessage?.message)
    if (!extraido) return null
    const { tipo, midia, ptt, messageInner } = extraido

    const baixar = downloadFn || (async () => {
        // Preferência: downloadMediaMessage (usa reupload se CDN expirou)
        if (temDownload(midia) || toBuffer(midia.mediaKey)) {
            try {
                const buf = await downloadMediaMessage(
                    { key: waMessage.key, message: messageInner },
                    'buffer',
                    {},
                    {
                        logger: sock?.logger,
                        reuploadRequest: sock?.updateMediaMessage?.bind(sock)
                    }
                )
                if (buf?.length > 50) return Buffer.from(buf)
            } catch (err) {
                console.log(`[revelar] downloadMediaMessage - ${err?.message || err}`)
            }
        }
        if (temDownload(midia)) {
            try {
                const stream = await downloadContentFromMessage(midia, KIND[tipo])
                const buf = await lerStream(stream)
                if (buf?.length > 50) return buf
            } catch (err) {
                console.log(`[revelar] downloadContent - ${err?.message || err}`)
            }
        }
        // Preview JPEG embutido (melhor que nada p/ imagem)
        const thumb = toBuffer(midia.jpegThumbnail)
        if (thumb?.length > 80 && tipo === tiposMensagem.imagem) return thumb
        return null
    })

    const buffer = await baixar()
    if (!buffer?.length) return null

    return {
        buffer,
        tipo,
        ptt,
        mimetype: midia.mimetype || (
            tipo === tiposMensagem.imagem ? 'image/jpeg'
                : tipo === tiposMensagem.video ? 'video/mp4'
                    : 'audio/ogg; codecs=opus'
        ),
        caption: midia.caption || '',
        seconds: midia.seconds
    }
}

/**
 * Envia buffer como mídia NORMAL (sem viewOnce).
 */
export async function enviarComoNormal(sock, idChat, arquivo, quoted = null) {
    if (!arquivo?.buffer?.length) return false
    const { buffer, tipo, mimetype, caption, ptt } = arquivo

    if (tipo === tiposMensagem.imagem) {
        await socket.responderArquivoBuffer(sock, tiposMensagem.imagem, idChat, buffer, caption || '', quoted, mimetype)
        return true
    }
    if (tipo === tiposMensagem.video) {
        try {
            await socket.responderArquivoBuffer(
                sock, tiposMensagem.video, idChat, buffer, caption || '', quoted, mimetype || 'video/mp4'
            )
        } catch {
            // Sem thumbnail: envia direto
            await sock.sendMessage(
                idChat,
                { video: buffer, caption: caption || '', mimetype: mimetype || 'video/mp4' },
                quoted ? { quoted } : undefined
            )
        }
        return true
    }
    if (tipo === tiposMensagem.audio) {
        await socket.responderArquivoBuffer(
            sock,
            tiposMensagem.audio,
            idChat,
            buffer,
            '',
            quoted,
            mimetype || 'audio/ogg; codecs=opus',
            { ptt: !!ptt }
        )
        return true
    }
    return false
}

/**
 * Ao receber VO: baixa e reenvia no mesmo chat como visualização normal.
 * Retorna true se reenviou.
 */
export async function aoReceberViewOnce(sock, waMessage, { downloadFn } = {}) {
    if (!waMessage?.message || waMessage.key?.fromMe) return false
    if (!ehViewOnce(waMessage.message)) return false
    if (jaFoiReenviada(waMessage.key)) return false

    const arquivo = await baixarMidiaViewOnce(sock, waMessage, { downloadFn })
    if (!arquivo?.buffer?.length) {
        console.log(`[revelar] chegada sem bytes id=${waMessage.key?.id} jid=${waMessage.key?.remoteJid}`)
        return false
    }

    marcarReenviada(waMessage.key)
    const ok = await enviarComoNormal(sock, waMessage.key.remoteJid, arquivo, waMessage)
    if (ok) {
        console.log(`[revelar] reenviada ${arquivo.tipo} ${arquivo.buffer.length}b → ${waMessage.key.remoteJid}`)
    }
    return ok
}

/**
 * !revelar a partir da citação.
 */
export async function revelarPorCitacao(sock, citacao, idChat, mensagemComando, { downloadFn } = {}) {
    const stanzaId = citacao?.stanzaId
    const key = {
        remoteJid: idChat,
        id: stanzaId,
        fromMe: false,
        participant: citacao?.remetente
    }

    // Monta WAMessage a partir do quote
    let message =
        citacao?.quoteOriginal ||
        citacao?.conteudo ||
        citacao?.mensagem?.message ||
        null

    // Se já veio desembrulhado como image/video/audio
    if (citacao?.midia && citacao?.tipo && KIND[citacao.tipo]) {
        message = {
            viewOnceMessageV2: {
                message: { [citacao.tipo]: { ...citacao.midia, viewOnce: true } }
            }
        }
    } else if (message && !ehViewOnce(message) && citacao?.mensagem_vunica && citacao?.tipo) {
        message = {
            viewOnceMessageV2: {
                message: { [citacao.tipo]: citacao.midia || message[citacao.tipo] || message }
            }
        }
    }

    if (!message) return { ok: false, motivo: 'sem_quote' }

    const waMessage = { key, message }
    if (jaFoiReenviada(key) === false && stanzaId) {
        /* allow */
    }

    const arquivo = await baixarMidiaViewOnce(sock, waMessage, { downloadFn })
    if (!arquivo?.buffer?.length) {
        // Último recurso: relay do proto sem viewOnce
        try {
            const ext = extrairMidiaViewOnce(message)
            if (ext?.midia && (ext.midia.url || ext.midia.directPath || toBuffer(ext.midia.mediaKey) || ext.midia.jpegThumbnail)) {
                const payload = { [ext.tipo]: { ...ext.midia, viewOnce: false } }
                await sock.relayMessage(idChat, payload, {})
                marcarReenviada(key)
                return { ok: true, via: 'relay' }
            }
        } catch (err) {
            console.log(`[revelar] relay - ${err?.message || err}`)
        }
        return { ok: false, motivo: 'sem_midia' }
    }

    marcarReenviada(key)
    await enviarComoNormal(sock, idChat, arquivo, mensagemComando)
    return { ok: true, via: 'download', bytes: arquivo.buffer.length, tipo: arquivo.tipo }
}

/** Helpers de teste */
export const __test = { toBuffer, limparMidia, temDownload, chaveMsg, jaFoiReenviada, marcarReenviada, jaReenviadas }

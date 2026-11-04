/**
 * Visualização única:
 * - Baixa e guarda o buffer assim que a msg chega (quote depois vem sem mediaKey).
 * - Reenvia no chat como mídia normal.
 */
import path from 'node:path'
import { BufferJSON, downloadMediaMessage, getContentType } from '@whiskeysockets/baileys'
import { tiposMensagem } from '../baileys/mensagem.js'
import * as socket from '../baileys/socket.js'
import { createCollection } from '../db/sqlite.js'

const db = createCollection('viewonce')
db.ensureIndex({ fieldName: 'chatId' })
db.ensureIndex({ fieldName: 'mensagemId' })
db.ensureIndex({ fieldName: 'criado_em' })

const TTL_MS = 72 * 60 * 60 * 1000
const TIPOS_MIDIA = new Set([
    tiposMensagem.imagem,
    tiposMensagem.video,
    tiposMensagem.audio
])
const pendingCaptura = new Map()
/** Evita reenviar a mesma VO duas vezes (upsert duplicado) */
const reenviadas = new Set()

function chaveCache(chatId, mensagemId) {
    return `${chatId}|${mensagemId}`
}

export function ehViewOnceRaw(message) {
    if (!message) return false
    const tipo = getContentType(message)
    if (String(tipo || '').includes('viewOnce')) return true
    if (message?.[tipo]?.viewOnce) return true
    return false
}

export function desembrulharViewOnce(message) {
    if (!message) return null
    let msg = message
    let tipo = getContentType(msg)
    // ephemeral / viewOnce wrappers
    for (let i = 0; i < 5; i++) {
        const wrap = msg?.ephemeralMessage || msg?.viewOnceMessage || msg?.viewOnceMessageV2
            || msg?.viewOnceMessageV2Extension || msg?.documentWithCaptionMessage
        if (!wrap?.message) break
        msg = wrap.message
        tipo = getContentType(msg)
    }
    if (msg?.[tipo]?.viewOnce) {
        msg = { ...msg, [tipo]: { ...msg[tipo], viewOnce: false } }
    }
    return { message: msg, tipo }
}

function temMediaBaixavel(midia) {
    if (!midia) return false
    const key = midia.mediaKey
    const keyOk = Buffer.isBuffer(key)
        ? key.length > 0
        : (key instanceof Uint8Array)
            ? key.length > 0
            : !!(key && (key.data?.length || (typeof key === 'string' && key.length)))
    return keyOk && !!(midia.url || midia.directPath || midia.thumbnailDirectPath)
}

async function salvarCache(doc) {
    const existente = await db.findOneAsync({ chatId: doc.chatId, mensagemId: doc.mensagemId })
    if (existente) {
        await db.updateAsync(
            { _id: existente._id },
            {
                $set: {
                    ...doc,
                    bufferB64: doc.bufferB64 || existente.bufferB64 || null
                }
            }
        )
    } else {
        await db.insertAsync(doc)
    }
    await limparViewOnceAntigos()
}

/** Remove entradas de view-once além do TTL (72h). */
export async function limparViewOnceAntigos() {
    const corte = Date.now() - TTL_MS
    const n = await db.removeAsync({ criado_em: { $lt: corte } }, { multi: true }).catch(() => 0)
    // arquivos em disco órfãos
    try {
        const { caminhoDados } = await import('./caminhos.js')
        const dir = caminhoDados('viewonce')
        const fs = (await import('fs-extra')).default
        if (await fs.pathExists(dir)) {
            const files = await fs.readdir(dir)
            const agora = Date.now()
            for (const f of files) {
                const p = path.join(dir, f)
                const st = await fs.stat(p).catch(() => null)
                if (st?.isFile() && agora - st.mtimeMs > TTL_MS) await fs.unlink(p).catch(() => {})
            }
        }
    } catch {
        /* */
    }
    return n || 0
}

async function baixarBufferVo(sock, waMessage, unwrapped) {
    const midia = unwrapped.message?.[unwrapped.tipo]
    if (!temMediaBaixavel(midia) && !midia?.jpegThumbnail) {
        throw new Error('VO sem mediaKey/url (provável stub Desktop)')
    }
    const buf = await downloadMediaMessage(
        { key: waMessage.key, message: unwrapped.message },
        'buffer',
        {},
        {
            logger: sock?.logger,
            reuploadRequest: sock?.updateMediaMessage?.bind(sock)
        }
    )
    if (!buf?.length || buf.length < 100) throw new Error('buffer VO vazio')
    return Buffer.from(buf)
}

async function capturarViewOnceInterno(sock, waMessage) {
    if (!waMessage?.key?.id || !waMessage?.message) return null
    if (!ehViewOnceRaw(waMessage.message) && !waMessage.message?.[getContentType(waMessage.message)]?.viewOnce) {
        // ainda tenta desembrulhar (já pode vir “falso” VO)
        if (!desembrulharViewOnce(waMessage.message)) return null
    }

    const chatId = waMessage.key.remoteJid
    const mensagemId = waMessage.key.id
    const unwrapped = desembrulharViewOnce(waMessage.message)
    if (!unwrapped || !TIPOS_MIDIA.has(unwrapped.tipo)) return null

    const midia = unwrapped.message?.[unwrapped.tipo]
    let buffer = null
    try {
        buffer = await baixarBufferVo(sock, waMessage, unwrapped)
    } catch (err) {
        console.log(`viewOnce cache download - ${err?.message || err}`)
    }

    await salvarCache({
        chatId,
        mensagemId,
        tipo: unwrapped.tipo,
        mimetype: midia?.mimetype || null,
        caption: midia?.caption || '',
        participant: waMessage.key.participant || waMessage.key.participantPn || null,
        messageJson: JSON.stringify(unwrapped.message, BufferJSON.replacer),
        bufferB64: buffer ? buffer.toString('base64') : null,
        criado_em: Date.now()
    })

    return buffer
        ? {
            buffer,
            tipo: unwrapped.tipo,
            mimetype: midia?.mimetype || null,
            caption: midia?.caption || '',
            chatId,
            mensagemId,
            key: waMessage.key
        }
        : null
}

/**
 * Captura VO assim que chega. Retorna {buffer,tipo,...} se baixou.
 */
export async function capturarViewOnce(sock, waMessage) {
    const chatId = waMessage?.key?.remoteJid
    const mensagemId = waMessage?.key?.id
    if (!chatId || !mensagemId) return null
    const k = chaveCache(chatId, mensagemId)
    if (pendingCaptura.has(k)) return pendingCaptura.get(k)

    const job = capturarViewOnceInterno(sock, waMessage)
        .catch((err) => {
            console.log(`viewOnce cache - ${err?.message || err}`)
            return null
        })
        .finally(() => {
            if (pendingCaptura.get(k) === job) pendingCaptura.delete(k)
        })
    pendingCaptura.set(k, job)
    return job
}

export async function capturarViewOnceConvertida(sock, mensagemBaileys) {
    try {
        if (!mensagemBaileys?.mensagem_vunica) return null
        const wa = mensagemBaileys.mensagem
        if (!wa?.key?.id || !wa?.message) return null
        const tipo = mensagemBaileys.tipo
        if (!TIPOS_MIDIA.has(tipo)) return null
        const fake = {
            key: wa.key,
            message: { viewOnceMessageV2: { message: wa.message } }
        }
        return await capturarViewOnce(sock, fake)
    } catch (err) {
        console.log(`viewOnce cache convertida - ${err?.message || err}`)
        return null
    }
}

export async function obterViewOnceCache(chatId, mensagemId) {
    if (!chatId || !mensagemId) return null
    const k = chaveCache(chatId, mensagemId)
    if (pendingCaptura.has(k)) {
        try { await pendingCaptura.get(k) } catch { /* */ }
    }
    const doc = await db.findOneAsync({ chatId, mensagemId })
    if (!doc) return null
    const out = {
        tipo: doc.tipo,
        mimetype: doc.mimetype,
        caption: doc.caption || '',
        participant: doc.participant,
        buffer: doc.bufferB64 ? Buffer.from(doc.bufferB64, 'base64') : null,
        message: null
    }
    if (doc.messageJson) {
        try {
            out.message = JSON.parse(doc.messageJson, BufferJSON.reviver)
        } catch { /* */ }
    }
    return out
}

/**
 * Reenvia buffer como mídia NORMAL (não view-once) no mesmo chat.
 */
export async function enviarMidiaNormal(sock, idChat, { buffer, tipo, mimetype, caption }, quoted = null) {
    if (!buffer?.length) return false
    if (tipo === tiposMensagem.imagem) {
        await socket.responderArquivoBuffer(sock, tiposMensagem.imagem, idChat, buffer, caption || '', quoted)
        return true
    }
    if (tipo === tiposMensagem.video) {
        await socket.responderArquivoBuffer(
            sock,
            tiposMensagem.video,
            idChat,
            buffer,
            caption || '',
            quoted,
            mimetype || 'video/mp4'
        )
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
            { ptt: true }
        )
        return true
    }
    return false
}

/**
 * Ao receber VO: baixa, cacheia e reenvia no chat como visualização normal.
 */
export async function processarViewOnceChegada(sock, waMessage) {
    if (!waMessage?.key?.id || waMessage.key.fromMe) return null
    const k = chaveCache(waMessage.key.remoteJid, waMessage.key.id)
    if (reenviadas.has(k)) return null

    const capturado = await capturarViewOnce(sock, waMessage)
    if (!capturado?.buffer?.length) return null

    reenviadas.add(k)
    if (reenviadas.size > 5000) {
        const first = reenviadas.values().next().value
        reenviadas.delete(first)
    }

    try {
        const ok = await enviarMidiaNormal(sock, capturado.chatId, {
            buffer: capturado.buffer,
            tipo: capturado.tipo,
            mimetype: capturado.mimetype,
            caption: capturado.caption || ''
        }, waMessage)
        console.log(`viewOnce reenviada normal - ${capturado.tipo} ${capturado.buffer.length}b chat=${capturado.chatId}`)
        return ok ? capturado : capturado
    } catch (err) {
        console.log(`viewOnce reenvio - ${err?.message || err}`)
        return capturado
    }
}

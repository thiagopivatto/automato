/**
 * Revela visualização única: download → relay → thumbnail.
 */
import { downloadContentFromMessage, downloadMediaMessage, getContentType } from '@whiskeysockets/baileys'
import { tiposMensagem } from '../baileys/mensagem.js'

const KIND = {
    [tiposMensagem.imagem]: 'image',
    [tiposMensagem.video]: 'video',
    [tiposMensagem.audio]: 'audio'
}

function toBuf(val) {
    if (!val) return null
    try {
        if (Buffer.isBuffer(val)) return val
        if (val instanceof Uint8Array) return Buffer.from(val)
        if (val?.type === 'Buffer' && Array.isArray(val.data)) return Buffer.from(val.data)
        if (val?.data != null) return Buffer.from(val.data)
        if (typeof val === 'string' && val.length) {
            try { return Buffer.from(val, 'base64') } catch { return Buffer.from(val) }
        }
    } catch { /* */ }
    return null
}

function normalizarMidia(midia) {
    if (!midia || typeof midia !== 'object') return null
    const out = { ...midia, viewOnce: false }
    for (const campo of ['mediaKey', 'fileEncSha256', 'fileSha256', 'jpegThumbnail']) {
        const b = toBuf(out[campo])
        if (b?.length) out[campo] = b
        else if (campo === 'mediaKey') delete out.mediaKey
    }
    return out
}

function temChave(midia) {
    const k = toBuf(midia?.mediaKey)
    return !!(k && k.length > 0)
}

async function streamBuf(stream) {
    const chunks = []
    for await (const c of stream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
    return Buffer.concat(chunks)
}

export function extrairMidiaCitacao(citacao) {
    const tipoPreferido = citacao?.tipo
    const fontes = [
        citacao?.midia,
        citacao?.conteudo?.[tipoPreferido],
        citacao?.mensagem?.message?.[tipoPreferido],
        citacao?.conteudo
    ].filter(Boolean)

    for (const fonte of fontes) {
        if (fonte?.mediaKey || fonte?.url || fonte?.directPath || fonte?.mimetype || fonte?.jpegThumbnail) {
            const tipo = tipoPreferido || Object.keys(KIND).find((t) => fonte === citacao?.conteudo?.[t]) || tipoPreferido
            return { tipo: tipoPreferido || tiposMensagem.imagem, midia: normalizarMidia(fonte) }
        }
        // wrappers
        for (const wrap of ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension']) {
            const inner = fonte?.[wrap]?.message
            if (!inner) continue
            const t = getContentType(inner)
            if (t && KIND[t]) return { tipo: t, midia: normalizarMidia(inner[t]) }
        }
        const t = getContentType(fonte)
        if (t && KIND[t] && fonte[t]) return { tipo: t, midia: normalizarMidia(fonte[t]) }
    }
    return null
}

/**
 * @returns {Promise<{ buffer: Buffer, tipo: string, mimetype?: string, legenda?: string, via?: string }|null>}
 */
export async function revelarViewOnce(citacao, sock, idChat) {
    const ext = extrairMidiaCitacao(citacao)
    if (!ext?.midia) {
        console.log('[REVELAR] quote sem midia', {
            tipo: citacao?.tipo,
            vunica: citacao?.mensagem_vunica,
            keys: citacao?.conteudo ? Object.keys(citacao.conteudo) : [],
            midiaKeys: citacao?.midia ? Object.keys(citacao.midia) : []
        })
        return null
    }

    const { tipo, midia } = ext
    const kind = KIND[tipo]
    const key = {
        remoteJid: idChat,
        id: citacao.stanzaId || undefined,
        fromMe: false,
        participant: citacao.remetente || undefined
    }

    console.log('[REVELAR] tentativa', {
        tipo,
        hasKey: temChave(midia),
        hasUrl: !!(midia.url || midia.directPath),
        hasThumb: !!midia.jpegThumbnail,
        mimetype: midia.mimetype
    })

    // 1) downloadContentFromMessage
    if (temChave(midia) && (midia.url || midia.directPath)) {
        try {
            const stream = await downloadContentFromMessage(midia, kind)
            const buf = await streamBuf(stream)
            if (buf?.length > 100) {
                return { buffer: buf, tipo, mimetype: midia.mimetype, legenda: midia.caption || citacao.legenda || '', via: 'downloadContent' }
            }
        } catch (err) {
            console.log(`revelar downloadContent - ${err?.message || err}`)
        }
    }

    // 2) downloadMediaMessage + reupload
    if (temChave(midia)) {
        try {
            const msg = { key, message: { [tipo]: midia } }
            const buf = await downloadMediaMessage(msg, 'buffer', {}, {
                logger: sock?.logger,
                reuploadRequest: sock?.updateMediaMessage?.bind(sock)
            })
            if (buf?.length > 100) {
                return { buffer: buf, tipo, mimetype: midia.mimetype, legenda: midia.caption || citacao.legenda || '', via: 'downloadMedia' }
            }
        } catch (err) {
            console.log(`revelar downloadMedia - ${err?.message || err}`)
        }
    }

    // 3) thumbnail embutido (imagem)
    const thumb = toBuf(midia.jpegThumbnail)
    if (thumb?.length > 80) {
        return {
            buffer: thumb,
            tipo: tiposMensagem.imagem,
            mimetype: 'image/jpeg',
            legenda: (midia.caption || citacao.legenda || '') + '\n_(preview da visualização única)_',
            via: 'thumbnail'
        }
    }

    return null
}

/** Compat */
export async function baixarMidiaViewOnce(citacao, sock, idChat) {
    const r = await revelarViewOnce(citacao, sock, idChat)
    return r?.buffer || null
}

/**
 * Relay do proto com viewOnce=false (método clássico que funcionava).
 */
export async function retransmitirViewOnceSemDownload(sock, idChat, citacao, mensagemCitacao) {
    const ext = extrairMidiaCitacao(citacao)
    if (!ext?.midia) return false
    const { tipo, midia } = ext
    // Precisa de url/directPath/mediaKey pra clientes abrirem
    if (!midia.url && !midia.directPath && !temChave(midia) && !midia.jpegThumbnail) return false

    const payload = { [tipo]: { ...midia, viewOnce: false } }
    if (mensagemCitacao?.key) {
        payload[tipo].contextInfo = {
            stanzaId: mensagemCitacao.key.id,
            remoteJid: mensagemCitacao.key.remoteJid,
            participant: mensagemCitacao.key.participant || mensagemCitacao.key.remoteJid,
            fromMe: !!mensagemCitacao.key.fromMe,
            quotedMessage: {}
        }
    }
    await sock.relayMessage(idChat, payload, {})
    return true
}

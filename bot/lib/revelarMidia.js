/**
 * Download / reenvio de mídia de visualização única.
 * Prioridade: cache (proto/buffer capturado na chegada) → quote → thumbnail → relay.
 */
import { downloadContentFromMessage, downloadMediaMessage } from '@whiskeysockets/baileys'
import { tiposMensagem } from '../baileys/mensagem.js'
import { obterViewOnceCache } from './viewOnceCache.js'

const TIPO_DOWNLOAD = {
    [tiposMensagem.imagem]: 'image',
    [tiposMensagem.video]: 'video',
    [tiposMensagem.audio]: 'audio'
}

function mediaKeyBytes(mediaKey) {
    if (!mediaKey) return null
    try {
        if (Buffer.isBuffer(mediaKey)) return mediaKey
        if (mediaKey instanceof Uint8Array) return Buffer.from(mediaKey)
        if (mediaKey?.type === 'Buffer' && Array.isArray(mediaKey.data)) return Buffer.from(mediaKey.data)
        if (mediaKey?.data != null) return Buffer.from(mediaKey.data)
        if (typeof mediaKey === 'string' && mediaKey.length) {
            try { return Buffer.from(mediaKey, 'base64') } catch { return Buffer.from(mediaKey) }
        }
        return Buffer.from(mediaKey)
    } catch {
        return null
    }
}

function temMediaKeyValida(media) {
    const buf = mediaKeyBytes(media?.mediaKey)
    return !!(buf && buf.length > 0)
}

function normalizarMediaKey(media) {
    if (!media) return null
    const out = { ...media }
    const key = mediaKeyBytes(out.mediaKey)
    if (key?.length) out.mediaKey = key
    else delete out.mediaKey

    for (const campo of ['fileEncSha256', 'fileSha256', 'jpegThumbnail']) {
        if (out[campo] == null || Buffer.isBuffer(out[campo])) continue
        try {
            if (out[campo]?.type === 'Buffer' && Array.isArray(out[campo].data)) {
                out[campo] = Buffer.from(out[campo].data)
            } else if (out[campo]?.data != null) out[campo] = Buffer.from(out[campo].data)
            else if (out[campo] instanceof Uint8Array) out[campo] = Buffer.from(out[campo])
            else out[campo] = Buffer.from(out[campo])
        } catch { /* */ }
    }
    out.viewOnce = false
    return out
}

async function streamParaBuffer(stream) {
    const chunks = []
    for await (const c of stream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
    return Buffer.concat(chunks)
}

function extrairMidia(msg, tipoPreferido) {
    const m = msg?.message || msg
    if (!m) return null
    if (tipoPreferido && m[tipoPreferido]) return { midia: m[tipoPreferido], tipo: tipoPreferido }
    for (const wrap of ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension']) {
        const inner = m[wrap]?.message
        if (!inner) continue
        for (const t of Object.keys(TIPO_DOWNLOAD)) {
            if (inner[t]) return { midia: inner[t], tipo: t }
        }
    }
    for (const t of Object.keys(TIPO_DOWNLOAD)) {
        if (m[t]) return { midia: m[t], tipo: t }
    }
    return null
}

function thumbBuffer(media) {
    const t = media?.jpegThumbnail
    if (!t) return null
    try {
        const buf = Buffer.isBuffer(t)
            ? t
            : (t?.type === 'Buffer' && Array.isArray(t.data))
                ? Buffer.from(t.data)
                : Buffer.from(t?.data || t)
        return buf?.length > 80 ? buf : null
    } catch {
        return null
    }
}

async function tentarDownloadMidia(midia, kind, sock, key, tipo) {
    const norm = normalizarMediaKey(midia)
    if (!norm) return null

    if (temMediaKeyValida(norm) && (norm.url || norm.directPath)) {
        try {
            const stream = await downloadContentFromMessage(norm, kind)
            const buf = await streamParaBuffer(stream)
            if (buf?.length > 100) return buf
        } catch (err) {
            console.log(`revelar downloadContent - ${err?.message || err}`)
        }
    }

    if (temMediaKeyValida(norm) && key?.id) {
        try {
            const msg = { key, message: { [tipo]: norm } }
            const buf = await downloadMediaMessage(msg, 'buffer', {}, {
                logger: sock?.logger,
                reuploadRequest: sock?.updateMediaMessage?.bind(sock)
            })
            if (buf?.length > 100) return buf
        } catch (err) {
            console.log(`revelar downloadMediaMessage - ${err?.message || err}`)
        }
    }

    // thumbnail-link (só preview)
    if (temMediaKeyValida(norm) && norm.thumbnailDirectPath && !norm.url) {
        try {
            const stream = await downloadContentFromMessage({
                directPath: norm.thumbnailDirectPath,
                mediaKey: norm.mediaKey
            }, 'thumbnail-link')
            const buf = await streamParaBuffer(stream)
            if (buf?.length > 80) return buf
        } catch (err) {
            console.log(`revelar thumbnail-link - ${err?.message || err}`)
        }
    }

    return thumbBuffer(norm)
}

/**
 * @returns {Promise<{ buffer: Buffer, tipo: string, mimetype?: string, legenda?: string }|null>}
 */
export async function revelarViewOnce(citacao, sock, idChat) {
    const stanzaId = citacao?.stanzaId
    const tipoCit = citacao?.tipo
    const keyBase = {
        remoteJid: idChat,
        id: stanzaId || undefined,
        fromMe: false,
        participant: citacao?.remetente || undefined
    }

    // 1) Cache capturado na chegada da VO
    if (stanzaId) {
        try {
            const cached = await obterViewOnceCache(idChat, stanzaId)
            if (cached?.buffer?.length > 100) {
                return {
                    buffer: cached.buffer,
                    tipo: cached.tipo || tipoCit,
                    mimetype: cached.mimetype || citacao?.mimetype,
                    legenda: cached.caption || citacao?.legenda || ''
                }
            }
            if (cached?.message) {
                const ext = extrairMidia(cached.message, cached.tipo || tipoCit)
                if (ext) {
                    const kind = TIPO_DOWNLOAD[ext.tipo]
                    const buf = await tentarDownloadMidia(
                        ext.midia,
                        kind,
                        sock,
                        {
                            ...keyBase,
                            participant: cached.participant || keyBase.participant
                        },
                        ext.tipo
                    )
                    if (buf?.length > 100) {
                        return {
                            buffer: buf,
                            tipo: ext.tipo,
                            mimetype: ext.midia?.mimetype || cached.mimetype,
                            legenda: cached.caption || ext.midia?.caption || ''
                        }
                    }
                }
            }
        } catch (err) {
            console.log(`revelar cache - ${err?.message || err}`)
        }
    }

    // 2) Mensagem do store (getMessage / MensagemControle)
    if (stanzaId && sock) {
        try {
            const { MensagemControle } = await import('../controles/MensagemControle.js')
            const stored = await new MensagemControle().recuperarMensagem(idChat, stanzaId)
            if (stored) {
                const ext = extrairMidia(stored, tipoCit)
                if (ext) {
                    const buf = await tentarDownloadMidia(
                        ext.midia,
                        TIPO_DOWNLOAD[ext.tipo],
                        sock,
                        keyBase,
                        ext.tipo
                    )
                    if (buf?.length > 100) {
                        return {
                            buffer: buf,
                            tipo: ext.tipo,
                            mimetype: ext.midia?.mimetype,
                            legenda: ext.midia?.caption || citacao?.legenda || ''
                        }
                    }
                }
            }
        } catch (err) {
            console.log(`revelar store - ${err?.message || err}`)
        }
    }

    const tipo = tipoCit
    const kind = TIPO_DOWNLOAD[tipo]
    if (!kind) return null

    const candidatos = [
        citacao?.midia,
        citacao?.conteudo?.[tipo],
        extrairMidia(citacao?.conteudo)?.midia,
        extrairMidia(citacao?.mensagem)?.midia,
        citacao?.mensagem?.message?.[tipo]
    ].filter(Boolean)

    for (const raw of candidatos) {
        const midia = raw?.midia || raw
        const buf = await tentarDownloadMidia(midia, kind, sock, keyBase, tipo)
        if (buf?.length > 100) {
            return {
                buffer: buf,
                tipo,
                mimetype: midia?.mimetype || citacao?.mimetype,
                legenda: midia?.caption || citacao?.legenda || ''
            }
        }
    }

    // 3) Thumbnail embutido no quote (melhor que nada p/ imagem)
    for (const raw of candidatos) {
        const thumb = thumbBuffer(raw?.midia || raw)
        if (thumb) {
            return {
                buffer: thumb,
                tipo: tiposMensagem.imagem,
                mimetype: 'image/jpeg',
                legenda: (citacao?.legenda || '') + (citacao?.legenda ? '\n' : '') + '(preview da visualização única)'
            }
        }
    }

    return null
}

/** @deprecated use revelarViewOnce */
export async function baixarMidiaViewOnce(citacao, sock, idChat) {
    const r = await revelarViewOnce(citacao, sock, idChat)
    return r?.buffer || null
}

/**
 * Retransmite o proto original sem viewOnce.
 */
export async function retransmitirViewOnceSemDownload(sock, idChat, citacao, mensagemCitacao) {
    const tipo = citacao?.tipo
    let midia = normalizarMediaKey(citacao.midia || citacao.conteudo?.[tipo])

    if ((!midia || (!midia.url && !midia.directPath && !temMediaKeyValida(midia))) && citacao?.stanzaId) {
        try {
            const cached = await obterViewOnceCache(idChat, citacao.stanzaId)
            const ext = cached?.message ? extrairMidia(cached.message, cached.tipo || tipo) : null
            if (ext?.midia) midia = normalizarMediaKey(ext.midia)
        } catch { /* */ }
    }

    if (!midia || (!midia.url && !midia.directPath && !temMediaKeyValida(midia))) return false
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

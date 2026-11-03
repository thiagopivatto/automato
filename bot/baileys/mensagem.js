import { getContentType, normalizeMessageContent } from '@whiskeysockets/baileys'
import { GrupoControle } from '../controles/GrupoControle.js'
import { UsuarioControle } from '../controles/UsuarioControle.js'
import { listaContemJid } from '../lib/util.js'

/** Chaves que não são conteúdo real (Baileys 7 / proto). */
const TIPOS_IGNORAR = new Set([
    'senderKeyDistributionMessage',
    'messageContextInfo',
    'messageSecret',
    'botInfo',
    'commentMetadata'
])

/**
 * Tipo de conteúdo real — ignora messageContextInfo etc.
 * Sem isso o Baileys 7 pode “ver” messageContextInfo e o bot ignora !comandos.
 */
export function obterTipoConteudo(message) {
    const normalizado = normalizeMessageContent(message) || message
    if (!normalizado || typeof normalizado !== 'object') return undefined
    const keys = Object.keys(normalizado)
    const key = keys.find(
        (k) =>
            (k === 'conversation' || k.endsWith('Message') || k.includes('Message')) &&
            !TIPOS_IGNORAR.has(k) &&
            !k.endsWith('ContextInfo')
    )
    return key || getContentType(normalizado)
}

export function extrairTextoMensagem(message, tipo) {
    const msg = normalizeMessageContent(message) || message || {}
    const t = tipo || obterTipoConteudo(msg)
    const no = t ? msg[t] : null
    if (typeof msg.conversation === 'string' && msg.conversation) return msg.conversation
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text
    if (no?.text) return no.text
    if (no?.caption) return no.caption
    if (no?.conversation) return no.conversation
    return ''
}

export async function converterMensagem(m, botInfo) {
    return new Promise(async (resolve, reject) => {
        try {
            // Aceita upsert completo ou WAMessage único
            const raw = Array.isArray(m?.messages) ? m.messages[0] : m
            if (!raw?.message) throw new Error('mensagem sem conteúdo')

            // Trabalha em cópia rasa da key; normaliza o corpo
            const mensagemNorm = normalizeMessageContent(raw.message) || raw.message
            raw.message = mensagemNorm

            let tipo = obterTipoConteudo(raw.message)
            let mensagem_vunica = String(tipo || '').includes('viewOnce')
            if (mensagem_vunica && raw.message?.[tipo]?.message) {
                raw.message = raw.message[tipo].message
                tipo = obterTipoConteudo(raw.message)
            }
            // Algumas versões mandam a mídia já “desembrulhada” com flag viewOnce
            if (!mensagem_vunica && raw.message?.[tipo]?.viewOnce) mensagem_vunica = true
            if (raw.message?.[tipo]?.viewOnce) raw.message[tipo].viewOnce = false

            const contexto = raw.message[tipo]?.contextInfo || {}
            let mensagem_citada = contexto.quotedMessage != undefined
            let { numero_bot, lid_bot } = botInfo
            let remetente = raw.key.fromMe
                ? numero_bot
                : raw.key.participantPn ||
                  raw.key.participantAlt ||
                  raw.key.participant ||
                  raw.key.remoteJid

            const texto_completo = extrairTextoMensagem(raw.message, tipo)
            let [comando, ...args] = texto_completo.trim().split(/\s+/)
            const usuariosCtrl = new UsuarioControle()
            let numero_dono = await usuariosCtrl.obterIdDono()
            // Dono: PN + LID + participant* (listaContemJid sozinho falha LID≠telefone)
            let mensagem_dono = await usuariosCtrl.ehDono(
                remetente,
                raw.key.participantPn,
                raw.key.participantAlt,
                raw.key.participant,
                raw.key.remoteJid
            )
            if (!mensagem_dono && numero_dono) {
                mensagem_dono = listaContemJid(
                    [numero_dono],
                    remetente,
                    raw.key.participantPn,
                    raw.key.participantAlt,
                    raw.key.participant
                )
            }
            let mensagem_grupo = String(raw.key.remoteJid || '').includes('@g.us')

            let respostaInformacoes = {
                id_mensagem: raw.key.id,
                remetente,
                tipo,
                t: raw.messageTimestamp,
                id_chat: raw.key.remoteJid,
                nome_usuario: raw.pushName,
                corpo: texto_completo,
                legenda: raw.message[tipo]?.caption || '',
                mencionados: raw.message[tipo]?.contextInfo?.mentionedJid ?? [],
                texto_recebido: args?.join(' ').trim() ?? '',
                comando: comando?.toLowerCase().trim() ?? '',
                args,
                mensagem_citada,
                mensagem_grupo,
                mensagem_vunica,
                mensagem_dono,
                mensagem_bot: raw.key.fromMe,
                mensagem_broadcast: raw.key.remoteJid == 'status@broadcast',
                mensagem_midia: tipo != tiposMensagem.texto && tipo != tiposMensagem.textoExt,
                mensagem: raw
            }

            // Se for mensagem de midia
            if (respostaInformacoes.mensagem_midia) {
                respostaInformacoes.midia = {
                    mimetype: raw.message[tipo]?.mimetype,
                    midia_url: raw.message[tipo]?.url,
                    segundos: raw.message[tipo]?.seconds,
                    tamanho_arquivo: raw.message[tipo]?.fileLength
                }
            }

            // Se for mensagem de grupo
            if (mensagem_grupo) {
                let id_grupo = raw.key.remoteJid
                let grupoInfo = await new GrupoControle().obterGrupoInfo(id_grupo)
                if (grupoInfo) {
                    respostaInformacoes.grupo = grupoInfo
                    respostaInformacoes.grupo.usuario_admin = listaContemJid(
                        grupoInfo.admins,
                        remetente,
                        raw.key.participant,
                        raw.key.participantPn,
                        raw.key.participantAlt
                    )
                    respostaInformacoes.grupo.bot_admin = listaContemJid(
                        grupoInfo.admins,
                        numero_bot,
                        lid_bot
                    )
                } else {
                    respostaInformacoes.grupo = {
                        id_grupo,
                        nome: '',
                        participantes: [],
                        admins: [],
                        usuario_admin: false,
                        bot_admin: false
                    }
                }
            }

            // Se tiver citado alguma mensagem
            if (mensagem_citada) {
                const ctxInfo = contexto
                let quotedOriginal = ctxInfo.quotedMessage
                let quotedRaw = normalizeMessageContent(quotedOriginal) || quotedOriginal
                let tipoMensagemCitada = obterTipoConteudo(quotedRaw)
                let citacaoVunica = String(tipoMensagemCitada || '').includes('viewOnce')
                if (citacaoVunica && quotedRaw?.[tipoMensagemCitada]?.message) {
                    quotedRaw = quotedRaw[tipoMensagemCitada].message
                    tipoMensagemCitada = obterTipoConteudo(quotedRaw)
                }
                if (!citacaoVunica && quotedRaw?.[tipoMensagemCitada]?.viewOnce) citacaoVunica = true

                const midiaCitada = quotedRaw?.[tipoMensagemCitada]
                    ? { ...quotedRaw[tipoMensagemCitada], viewOnce: false }
                    : null

                const mensagemCitacaoBaixavel = {
                    key: {
                        remoteJid: raw.key.remoteJid,
                        id: ctxInfo.stanzaId || undefined,
                        fromMe: false,
                        participant: ctxInfo.participant || undefined
                    },
                    message: midiaCitada ? { [tipoMensagemCitada]: midiaCitada } : quotedRaw
                }
                respostaInformacoes.citacao = {
                    tipo: tipoMensagemCitada,
                    remetente: ctxInfo.participant || ctxInfo.remoteJid,
                    stanzaId: ctxInfo.stanzaId || null,
                    corpo: quotedRaw?.conversation || quotedRaw?.extendedTextMessage?.text,
                    legenda: midiaCitada?.caption,
                    midia_url: midiaCitada?.url,
                    mimetype: midiaCitada?.mimetype,
                    tamanho_arquivo: midiaCitada?.fileLength,
                    segundos: midiaCitada?.seconds,
                    mensagem_vunica: citacaoVunica,
                    conteudo: quotedRaw,
                    quoteOriginal: quotedOriginal,
                    midia: midiaCitada,
                    mensagem: mensagemCitacaoBaixavel
                }
            }

            resolve(respostaInformacoes)
        } catch (err) {
            reject(err)
        }
    })
}

export const obterTipoDeMensagem = (tipo) => {
    if (tipo == tiposMensagem.texto || tipo == tiposMensagem.textoExt) return 'Texto'
    if (tipo == tiposMensagem.imagem) return 'Imagem'
    if (tipo == tiposMensagem.documento) return 'Documento/Arquivo'
    if (tipo == tiposMensagem.video) return 'Video/GIF'
    if (tipo == tiposMensagem.sticker) return 'Sticker'
    if (tipo == tiposMensagem.audio) return 'Audio'
    return null
}

export const tiposMensagem = {
    texto: 'conversation',
    textoExt: 'extendedTextMessage',
    imagem: 'imageMessage',
    documento: 'documentMessage',
    video: 'videoMessage',
    sticker: 'stickerMessage',
    audio: 'audioMessage'
}

export const tiposPermitidosMensagens = [
    'conversation',
    'extendedTextMessage',
    'imageMessage',
    'documentMessage',
    'videoMessage',
    'stickerMessage',
    'audioMessage'
]

/**
 * Reações de ack em comandos (WhatsApp: 1 reação por remetente na msg).
 * Fluxo: ⏳ enquanto processa. Ao concluir, a reação sai. Erro troca para ❌.
 * Texto vazio na reação remove a do bot.
 */
import { logWarn } from './logger.js'

export async function reagirMensagem(c, mensagem, emoji) {
    const key = mensagem?.key
    if (!c?.sendMessage || !key?.id || !key?.remoteJid) return false
    try {
        await c.sendMessage(key.remoteJid, {
            react: { text: String(emoji || ''), key }
        })
        return true
    } catch (err) {
        logWarn('reacao falhou', { err: err?.message || String(err), emoji })
        return false
    }
}

/** Ack inicial: só o relógio, enquanto o comando roda. */
export async function reagirAckInicio(c, mensagem) {
    await reagirMensagem(c, mensagem, '⏳')
}

/** Pronto: tira a espera. Não coloca tick. */
export async function reagirAckOk(c, mensagem) {
    await reagirMensagem(c, mensagem, '')
}

/** Erro no comando. */
export async function reagirAckErro(c, mensagem) {
    await reagirMensagem(c, mensagem, '❌')
}

/** True se o comando não deve receber ack por reação (!chat / auto-chat). */
export function comandoSemReacaoAck(comando, prefixo = '!') {
    const raw = String(comando || '')
        .trim()
        .toLowerCase()
    const p = String(prefixo || '!').toLowerCase()
    const sem = raw.startsWith(p) ? raw.slice(p.length) : raw
    return (
        sem === 'chat' ||
        raw === 'auto-chat' ||
        raw === 'auto-chat-reply' ||
        sem === 'auto-chat' ||
        sem === 'auto-chat-reply'
    )
}

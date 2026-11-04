/**
 * Fila global + filas por chat (fairness) com throwOnTimeout.
 */
import PQueue from 'p-queue'
import { incrMetrica, logWarn } from './logger.js'

const GLOBAL_CONCURRENCY = Number(process.env.FILA_CONCURRENCY || 12)
const CHAT_CONCURRENCY = Number(process.env.FILA_CHAT_CONCURRENCY || 1)
const TIMEOUT_MS = Number(process.env.FILA_TIMEOUT_MS || 180000)
const MAX_CHAT_QUEUES = Number(process.env.MAX_CHAT_QUEUES || 500)

const filaGlobal = new PQueue({
    concurrency: Math.max(2, GLOBAL_CONCURRENCY),
    timeout: TIMEOUT_MS,
    throwOnTimeout: true
})

/** @type {Map<string, PQueue>} */
const filasChat = new Map()

function obterFilaChat(id_chat) {
    const key = String(id_chat || 'global')
    let q = filasChat.get(key)
    if (!q) {
        if (filasChat.size >= MAX_CHAT_QUEUES) {
            // Remove filas ociosas
            for (const [k, fq] of filasChat) {
                if (fq.size === 0 && fq.pending === 0) {
                    filasChat.delete(k)
                    if (filasChat.size < MAX_CHAT_QUEUES) break
                }
            }
        }
        q = new PQueue({
            concurrency: Math.max(1, CHAT_CONCURRENCY),
            timeout: TIMEOUT_MS,
            throwOnTimeout: true
        })
        filasChat.set(key, q)
    }
    return q
}

export function profundidadeFila() {
    let chatPending = 0
    for (const q of filasChat.values()) chatPending += q.size + q.pending
    return {
        global: filaGlobal.size + filaGlobal.pending,
        chats: filasChat.size,
        chatJobs: chatPending
    }
}

/**
 * Enfileira tarefa: serializa por chat e limita concorrência global.
 */
export function enfileirarPorChat(id_chat, tarefa, { prioridade = 1, rotulo = 'job' } = {}) {
    const filaChat = obterFilaChat(id_chat)
    const job = async () => {
        try {
            await filaGlobal.add(() => tarefa(), { priority: prioridade })
        } catch (err) {
            if (err?.name === 'TimeoutError' || /timeout/i.test(String(err?.message || ''))) {
                incrMetrica('fila_timeout')
                logWarn('fila timeout', { chat: id_chat, rotulo })
            }
            throw err
        }
    }
    return filaChat.add(job, { priority: prioridade }).catch((err) => {
        // Propagado ao caller via catch do chamadaComando
        throw err
    })
}

export { filaGlobal }

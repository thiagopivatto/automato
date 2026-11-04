/**
 * Logger estruturado (pino) + métricas + ring de erros para o dono.
 */
import pino from 'pino'

const nivel = (process.env.LOG_LEVEL || 'warn').toLowerCase()

export const logger = pino({
    level: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'].includes(nivel) ? nivel : 'warn',
    base: { app: 'ultron' },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level(label) {
            return { level: label }
        }
    }
})

const metricas = {
    cmds: 0,
    cmds_ok: 0,
    cmds_erro: 0,
    ia_erro: 0,
    ia_ok: 0,
    msgs: 0,
    msgs_ignoradas: 0,
    recv_ok: 0,
    recv_drop: 0,
    reconnects: 0,
    fila_timeout: 0,
    db_err: 0,
    iniciado: Date.now(),
    last_msg_at: 0,
    ia_ms_soma: 0,
    ia_ms_n: 0,
    web_ms_soma: 0,
    web_ms_n: 0,
    cascade_ms_soma: 0,
    cascade_ms_n: 0,
    vision_ms_soma: 0,
    vision_ms_n: 0,
    pre_ms_soma: 0,
    pre_ms_n: 0
}

/** @type {Map<string, { n: number, soma: number, last: number }>} */
const cmdMs = new Map()

/** @type {{ ts: number, msg: string, extra?: object }[]} */
const errosRecentes = []
const MAX_ERROS = 20

export function incrMetrica(chave, n = 1) {
    if (chave in metricas) metricas[chave] += n
    if (chave === 'msgs' || chave === 'recv_ok') metricas.last_msg_at = Date.now()
}

export function registrarIaMs(ms) {
    metricas.ia_ms_soma += Number(ms) || 0
    metricas.ia_ms_n++
}

/** Stages do chat: web / cascade / vision / pre. */
export function registrarStageMs(stage, ms) {
    const n = Number(ms) || 0
    if (n < 0) return
    const keySoma = `${stage}_ms_soma`
    const keyN = `${stage}_ms_n`
    if (!(keySoma in metricas)) return
    metricas[keySoma] += n
    metricas[keyN]++
}

export function registrarCmdMs(comando, ms) {
    const nome = String(comando || '?')
        .replace(/^[!#.\*\-\+/\$&]+/, '')
        .toLowerCase()
        .slice(0, 40) || '?'
    const n = Number(ms) || 0
    const cur = cmdMs.get(nome) || { n: 0, soma: 0, last: 0 }
    cur.n++
    cur.soma += n
    cur.last = n
    cmdMs.set(nome, cur)
}

/** Top N comandos por média de ms (mais lentos primeiro). */
export function obterTopCmdsLentos(limite = 8) {
    return [...cmdMs.entries()]
        .map(([nome, v]) => ({
            nome,
            n: v.n,
            last: v.last,
            medio: v.n ? Math.round(v.soma / v.n) : 0
        }))
        .sort((a, b) => b.medio - a.medio)
        .slice(0, Math.max(1, limite))
}

function medioStage(somaKey, nKey) {
    return metricas[nKey] ? Math.round(metricas[somaKey] / metricas[nKey]) : 0
}

export function obterMetricas() {
    const agora = Date.now()
    const uptimeMin = Math.max(1, (agora - metricas.iniciado) / 60000)
    return {
        ...metricas,
        cmds_por_min: Number((metricas.cmds / uptimeMin).toFixed(2)),
        uptime_ms: agora - metricas.iniciado,
        ia_ms_medio: metricas.ia_ms_n
            ? Math.round(metricas.ia_ms_soma / metricas.ia_ms_n)
            : 0,
        web_ms_medio: medioStage('web_ms_soma', 'web_ms_n'),
        cascade_ms_medio: medioStage('cascade_ms_soma', 'cascade_ms_n'),
        vision_ms_medio: medioStage('vision_ms_soma', 'vision_ms_n'),
        pre_ms_medio: medioStage('pre_ms_soma', 'pre_ms_n'),
        top_cmds_lentos: obterTopCmdsLentos(8)
    }
}

export function pushErro(msg, extra = {}) {
    errosRecentes.push({ ts: Date.now(), msg: String(msg || ''), extra })
    if (errosRecentes.length > MAX_ERROS) errosRecentes.shift()
}

export function obterErrosRecentes(limite = 10) {
    return errosRecentes.slice(-Math.max(1, limite))
}

export function logInfo(msg, extra = {}) {
    logger.info(extra, msg)
}

export function logWarn(msg, extra = {}) {
    logger.warn(extra, msg)
}

export function logErro(msg, err, extra = {}) {
    pushErro(msg, { err: err?.message || String(err || ''), ...extra })
    incrMetrica('db_err', msg?.includes?.('db') || extra?.col ? 1 : 0)
    logger.error(
        {
            ...extra,
            err: err?.message || String(err || ''),
            stack: err?.stack
        },
        msg
    )
}

let ultimoAlertaDono = 0
const ALERTA_COOLDOWN_MS = 10 * 60 * 1000

/** Alerta rate-limited ao dono (precisa sock + jid). */
export async function alertarDonoSeCritico(enviarFn, texto) {
    const agora = Date.now()
    if (agora - ultimoAlertaDono < ALERTA_COOLDOWN_MS) return false
    ultimoAlertaDono = agora
    try {
        await enviarFn(texto)
        return true
    } catch {
        return false
    }
}

export function deveAlertarOps() {
    const m = obterMetricas()
    if (m.fila_timeout >= 3) return 'fila com muitos timeouts'
    if (m.ia_erro >= 8 && m.ia_ok < 2) return 'IA falhando repetidamente'
    if (m.reconnects >= 5) return 'muitos reconnects'
    if (m.db_err >= 5) return 'erros de banco'
    return null
}

/**
 * Health check só em localhost (127.0.0.1).
 * ULTRON_HEALTH_PORT=3921 (0 = desliga)
 */
import http from 'node:http'
import { obterMetricas } from './logger.js'
import { profundidadeFila } from './filaComandos.js'

export function iniciarHealthLocal() {
    const port = Number(process.env.ULTRON_HEALTH_PORT ?? 3921)
    if (!port || port <= 0) return null

    const server = http.createServer((req, res) => {
        if (req.url !== '/health' && req.url !== '/health/') {
            res.writeHead(404)
            res.end('not found')
            return
        }
        const m = obterMetricas()
        const f = profundidadeFila()
        const body = JSON.stringify({
            ok: true,
            uptime_ms: m.uptime_ms,
            last_msg_at: m.last_msg_at || null,
            fila: f,
            recv_ok: m.recv_ok,
            ia_ms_medio: m.ia_ms_medio,
            web_ms_medio: m.web_ms_medio,
            cascade_ms_medio: m.cascade_ms_medio,
            vision_ms_medio: m.vision_ms_medio,
            pre_ms_medio: m.pre_ms_medio,
            top_cmds_lentos: m.top_cmds_lentos,
            reconnects: m.reconnects
        })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(body)
    })

    server.listen(port, '127.0.0.1', () => {
        console.log(`[health] http://127.0.0.1:${port}/health`)
    })
    server.on('error', (err) => {
        console.warn(`[health] ${err?.message || err}`)
    })
    return server
}

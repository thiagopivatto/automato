import fs from 'fs-extra'
import path from 'node:path'
import os from 'node:os'
import { Mensagem } from '../modelos/Mensagem.js'
import { HistoricoGrupo } from '../modelos/HistoricoGrupo.js'
import { caminhoDados, dirTemp } from './caminhos.js'

const MIDIAS_API = path.join(os.tmpdir(), 'lbot-api-midias')
const INTERVALO_LEVE_MS = Number(process.env.LIMPEZA_LEVE_MS || 3 * 60 * 60 * 1000)
let _timerLeve = null
let _ultimaLeve = 0

async function tamanhoDir(dir) {
    if (!(await fs.pathExists(dir))) return 0
    let total = 0
    const walk = async (d) => {
        const itens = await fs.readdir(d).catch(() => [])
        for (const nome of itens) {
            const p = path.join(d, nome)
            const st = await fs.stat(p).catch(() => null)
            if (!st) continue
            if (st.isDirectory()) await walk(p)
            else total += st.size
        }
    }
    await walk(dir)
    return total
}

/** Remove arquivos mais velhos que maxAgeMs; se maxAgeMs=0 esvazia tudo. */
async function limparDirPorIdade(dir, maxAgeMs = 0) {
    if (!(await fs.pathExists(dir))) return 0
    let liberado = 0
    const agora = Date.now()
    const walk = async (d) => {
        const itens = await fs.readdir(d).catch(() => [])
        for (const nome of itens) {
            const p = path.join(d, nome)
            const st = await fs.stat(p).catch(() => null)
            if (!st) continue
            if (st.isDirectory()) {
                await walk(p)
                const rest = await fs.readdir(p).catch(() => [])
                if (!rest.length) await fs.remove(p).catch(() => {})
                continue
            }
            if (!maxAgeMs || agora - st.mtimeMs >= maxAgeMs) {
                liberado += st.size
                await fs.unlink(p).catch(() => {})
            }
        }
    }
    await walk(dir)
    return liberado
}

async function limparBakEOrfaos() {
    let liberado = 0
    const detalhes = []
    const dadosDir = caminhoDados()
    if (!(await fs.pathExists(dadosDir))) return { liberado, detalhes }
    const files = await fs.readdir(dadosDir)
    for (const f of files) {
        if (!/\.(tmp|part|log|bak)$/i.test(f) && !/\.db~$/i.test(f)) continue
        const p = path.join(dadosDir, f)
        const st = await fs.stat(p).catch(() => null)
        if (!st?.isFile()) continue
        liberado += st.size
        await fs.unlink(p).catch(() => {})
        detalhes.push(f)
    }
    return { liberado, detalhes }
}

/**
 * Limpeza conservadora: temp antigo, podas TTL, .bak — sem apagar histórico útil.
 */
export async function limpezaLeve() {
    const detalhes = []
    let liberadoBytes = 0

    const ageTemp = 2 * 60 * 60 * 1000
    for (const dir of [dirTemp, MIDIAS_API, path.resolve('tmp'), path.resolve('.cache')]) {
        try {
            const n = await limparDirPorIdade(dir, ageTemp)
            if (n > 0) {
                liberadoBytes += n
                detalhes.push(`${path.basename(dir) || dir}: ${(n / 1024 / 1024).toFixed(1)} MB (>2h)`)
            }
        } catch (e) {
            detalhes.push(`${dir}: ${e.message}`)
        }
    }

    try {
        const msg = new Mensagem()
        if (typeof msg.podarAntigas === 'function') {
            const r = await msg.podarAntigas()
            detalhes.push(`mensagens TTL: total=${r?.total ?? '?'}`)
        }
    } catch (e) {
        detalhes.push(`mensagens: ${e.message}`)
    }

    try {
        const hist = new HistoricoGrupo()
        const n = await hist.limparAntigas(null)
        if (n) detalhes.push(`historico TTL: ${n} regs`)
    } catch (e) {
        detalhes.push(`historico: ${e.message}`)
    }

    try {
        const vo = await import('./viewOnceCache.js')
        if (typeof vo.limparViewOnceAntigos === 'function') {
            const n = await vo.limparViewOnceAntigos()
            if (n) detalhes.push(`viewonce: ${n}`)
        }
    } catch {
        /* optional */
    }

    const bak = await limparBakEOrfaos()
    liberadoBytes += bak.liberado
    if (bak.detalhes.length) detalhes.push(`órfãos: ${bak.detalhes.join(', ')}`)

    _ultimaLeve = Date.now()
    return {
        liberadoMb: Number((liberadoBytes / 1024 / 1024).toFixed(2)),
        detalhes
    }
}

/**
 * Wipe agressivo (só sob pedido explícito !limpar tudo|historico).
 * Mantém: usuários, grupos, contador, bot.json, sessão.
 */
export async function limparCacheBot({ wipeHistorico = true } = {}) {
    const leve = await limpezaLeve()
    const detalhes = [...(leve.detalhes || [])]
    let liberadoBytes = Number(leve.liberadoMb || 0) * 1024 * 1024

    // Esvaziar temp por completo
    for (const dir of [dirTemp, MIDIAS_API, path.resolve('tmp'), path.resolve('temp'), path.resolve('.cache')]) {
        if (!(await fs.pathExists(dir))) continue
        const before = await tamanhoDir(dir)
        await fs.emptyDir(dir).catch(() => {})
        liberadoBytes += before
        if (before) detalhes.push(`empty ${path.basename(dir)}: ${(before / 1024 / 1024).toFixed(1)} MB`)
    }

    try {
        const msg = new Mensagem()
        await msg.limparMensagens()
        detalhes.push('mensagens limpas')
    } catch (e) {
        detalhes.push(`mensagens: ${e.message}`)
    }

    if (wipeHistorico) {
        try {
            const hist = new HistoricoGrupo()
            const n = await hist.contarTodas()
            await hist.limparTudo()
            detalhes.push(`historico_grupo wipe: ${n} regs`)
        } catch (e) {
            detalhes.push(`historico: ${e.message}`)
        }
        try {
            const { MemoriaResumoGrupo } = await import('../modelos/MemoriaResumoGrupo.js')
            const mem = new MemoriaResumoGrupo()
            const n = await mem.contarTodas()
            await mem.limparTudo()
            detalhes.push(`memoria_resumo wipe: ${n} regs`)
        } catch (e) {
            detalhes.push(`memoria_resumo: ${e.message}`)
        }
    }

    return {
        liberadoMb: Number((liberadoBytes / 1024 / 1024).toFixed(2)),
        detalhes
    }
}

/** Agenda limpeza leve no boot e a cada LIMPEZA_LEVE_MS (default 3h). */
export function iniciarLimpezaPeriodica() {
    if (_timerLeve) return
    const rodar = () => {
        limpezaLeve().catch((err) => console.log(`[limpeza] ${err?.message || err}`))
    }
    // adia 45s após boot para não competir com sync de grupos
    setTimeout(rodar, 45_000)
    _timerLeve = setInterval(rodar, Math.max(30 * 60 * 1000, INTERVALO_LEVE_MS))
    if (typeof _timerLeve.unref === 'function') _timerLeve.unref()
}

export function ultimaLimpezaLeveMs() {
    return _ultimaLeve
}

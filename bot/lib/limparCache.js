import fs from 'fs-extra'
import path from 'node:path'
import os from 'node:os'
import { Mensagem } from '../modelos/Mensagem.js'
import { HistoricoGrupo } from '../modelos/HistoricoGrupo.js'

/**
 * Limpa cache/temp/mensagens temporárias.
 * Mantém: usuarios.db, grupos.db, contador.db, bot.json, sessão WhatsApp.
 */
export async function limparCacheBot() {
    const detalhes = []
    let liberadoBytes = 0

    const tamanhoDir = async (dir) => {
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

    // 1) Mídias temporárias da API
    const midiasApi = path.join(os.tmpdir(), 'lbot-api-midias')
    if (await fs.pathExists(midiasApi)) {
        const before = await tamanhoDir(midiasApi)
        await fs.emptyDir(midiasApi)
        liberadoBytes += before
        detalhes.push(`temp API: ${(before / 1024 / 1024).toFixed(1)} MB`)
    }

    // 2) Pastas tmp do projeto
    for (const rel of ['tmp', 'temp', '.cache', 'bot/tmp']) {
        const abs = path.resolve(rel)
        if (await fs.pathExists(abs)) {
            const before = await tamanhoDir(abs)
            await fs.emptyDir(abs)
            liberadoBytes += before
            detalhes.push(`${rel}: ${(before / 1024 / 1024).toFixed(1)} MB`)
        }
    }

    // 3) Cache de mensagens Baileys (não usuários/grupos)
    try {
        const msg = new Mensagem()
        await msg.limparMensagens()
        detalhes.push('mensagens.db limpo')
    } catch (e) {
        detalhes.push(`mensagens.db: ${e.message}`)
    }

    // 4) Histórico + memória do resumodogrupo
    try {
        const hist = new HistoricoGrupo()
        const n = await hist.contarTodas()
        await hist.limparTudo()
        detalhes.push(`historico_grupo: ${n} regs`)
    } catch (e) {
        detalhes.push(`historico: ${e.message}`)
    }
    try {
        const { MemoriaResumoGrupo } = await import('../modelos/MemoriaResumoGrupo.js')
        const mem = new MemoriaResumoGrupo()
        const n = await mem.contarTodas()
        await mem.limparTudo()
        detalhes.push(`memoria_resumo: ${n} regs`)
    } catch (e) {
        detalhes.push(`memoria_resumo: ${e.message}`)
    }

    // 5) Arquivos órfãos *.tmp / *.part no root de dados (não dbs protegidos)
    const protegidos = new Set([
        'usuarios.db',
        'grupos.db',
        'contador.db',
        'bot.json',
        'sugestoes.db',
        'usuarios.db~',
        'grupos.db~',
        'contador.db~',
        'sugestoes.db~'
    ])
    try {
        const { caminhoDados } = await import('./caminhos.js')
        const dadosDir = caminhoDados()
        if (await fs.pathExists(dadosDir)) {
            const files = await fs.readdir(dadosDir)
            for (const f of files) {
                if (protegidos.has(f)) continue
                if (/\.(tmp|part|log|bak)$/i.test(f) || f.endsWith('.db~') && f.includes('mensagem')) {
                    const p = path.join(dadosDir, f)
                    const st = await fs.stat(p).catch(() => null)
                    if (st?.isFile()) {
                        liberadoBytes += st.size
                        await fs.unlink(p).catch(() => {})
                    }
                }
            }
        }
    } catch { /* ignore */ }

    return {
        liberadoMb: Number((liberadoBytes / 1024 / 1024).toFixed(2)),
        detalhes
    }
}

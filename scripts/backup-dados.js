/**
 * Backup de dados/sessao para pasta destino (ex.: NAS).
 * Uso: node scripts/backup-dados.js [destino]
 * Env: ULTRON_BACKUP_DIR, ULTRON_BACKUP_KEEP (default 7)
 */
import fs from 'fs-extra'
import path from 'path'
import { dirDados, dirSessao, raizProjeto } from '../bot/lib/caminhos.js'

const destRoot =
    process.argv[2] ||
    process.env.ULTRON_BACKUP_DIR ||
    path.join(raizProjeto, 'backup')

const keep = Math.max(1, Number(process.env.ULTRON_BACKUP_KEEP || 7))

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const dest = path.join(destRoot, stamp)

await fs.ensureDir(dest)
const pares = [
    [dirDados, path.join(dest, 'dados')],
    [dirSessao, path.join(dest, 'sessao')]
]
for (const [from, to] of pares) {
    if (!(await fs.pathExists(from))) {
        console.warn('skip (não existe):', from)
        continue
    }
    await fs.copy(from, to, {
        filter: (src) => {
            const base = path.basename(src)
            if (base === 'node_modules') return false
            // lixo de migração / WAL quente — hot path fica no disco local
            if (/\.bak$/i.test(base)) return false
            if (/\.db~$/i.test(base)) return false
            return true
        }
    })
    console.log('OK', path.relative(raizProjeto, from), '→', to)
}
console.log('backup em', dest)

// Rotação: mantém as N pastas mais recentes
try {
    const entradas = (await fs.readdir(destRoot))
        .filter((n) => /^\d{4}-\d{2}-\d{2}T/.test(n))
        .sort()
    const excesso = entradas.slice(0, Math.max(0, entradas.length - keep))
    for (const nome of excesso) {
        const p = path.join(destRoot, nome)
        const st = await fs.stat(p).catch(() => null)
        if (st?.isDirectory()) {
            await fs.remove(p)
            console.log('removido backup antigo:', nome)
        }
    }
} catch (err) {
    console.warn('rotação backup:', err?.message || err)
}

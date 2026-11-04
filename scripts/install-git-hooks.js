/**
 * Instala hooks versionados de scripts/git-hooks/ em .git/hooks/
 * Rodado no npm prepare / postinstall (não falha o install).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(raiz, 'scripts', 'git-hooks')
const gitDir = path.join(raiz, '.git')
const hooksDir = path.join(gitDir, 'hooks')

if (!fs.existsSync(gitDir) || !fs.statSync(gitDir).isDirectory()) {
    // worktree / mirror sem .git local
    console.log('[git-hooks] .git ausente — skip')
    process.exit(0)
}

fs.mkdirSync(hooksDir, { recursive: true })

const hooks = fs.existsSync(srcDir)
    ? fs.readdirSync(srcDir).filter((f) => !f.startsWith('.'))
    : []

for (const nome of hooks) {
    const de = path.join(srcDir, nome)
    const para = path.join(hooksDir, nome)
    const corpo = fs.readFileSync(de, 'utf8')
    fs.writeFileSync(para, corpo.replace(/\r\n/g, '\n'), { mode: 0o755 })
    try {
        fs.chmodSync(para, 0o755)
    } catch {
        /* Windows */
    }
    console.log(`[git-hooks] instalado: ${nome}`)
}

if (!hooks.length) console.log('[git-hooks] nenhum hook em scripts/git-hooks/')

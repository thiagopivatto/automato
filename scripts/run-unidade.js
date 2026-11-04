/**
 * Roda testes de unidade sem depender de glob no cmd.exe (quebra em UNC).
 * Usa caminhos relativos ao cwd — Node --test falha com UNC absoluto.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dirRel = path.join('scripts', 'unidade')
const dirAbs = path.join(raiz, dirRel)
const files = fs
    .readdirSync(dirAbs)
    .filter((f) => f.endsWith('.test.js'))
    .sort()
    .map((f) => path.join(dirRel, f))

if (!files.length) {
    console.error('nenhum teste em scripts/unidade')
    process.exit(1)
}

let failed = 0
for (const f of files) {
    const r = spawnSync(process.execPath, ['--test', f], {
        cwd: raiz,
        stdio: 'inherit',
        env: process.env,
        shell: false
    })
    if ((r.status ?? 1) !== 0) failed++
}
process.exit(failed ? 1 : 0)

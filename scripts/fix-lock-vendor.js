/**
 * Garante que o package-lock use file:vendor/... relativo
 * (evita /homes/homes/homes/... no Synology).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lockPath = path.join(raiz, 'package-lock.json')
const REL = 'file:vendor/lbot-api-comandos'

let lock = fs.readFileSync(lockPath, 'utf8')
const antes = lock
lock = lock.replace(
    /"resolved":\s*"file:[^"]*lbot-api-comandos"/g,
    `"resolved": "${REL}"`
)
if (lock !== antes) {
    fs.writeFileSync(lockPath, lock)
    console.log('package-lock: resolved do vendor corrigido para', REL)
} else {
    console.log('package-lock: vendor já está com path relativo')
}

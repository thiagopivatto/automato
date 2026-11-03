/**
 * Copia vendor/lbot-api-comandos → node_modules/@victorsouzaleal/lbot-api-comandos
 * Necessário no UNC/NAS (install-links=true cria cópia, não symlink).
 */
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(raiz, 'vendor', 'lbot-api-comandos')
const dest = path.join(raiz, 'node_modules', '@victorsouzaleal', 'lbot-api-comandos')

const IGNORE = new Set(['node_modules', '.git', 'package-lock.json'])

async function copiarDir(from, to) {
    await fs.ensureDir(to)
    const entries = await fs.readdir(from, { withFileTypes: true })
    for (const ent of entries) {
        if (IGNORE.has(ent.name)) continue
        const a = path.join(from, ent.name)
        const b = path.join(to, ent.name)
        if (ent.isDirectory()) await copiarDir(a, b)
        else {
            let ultimoErr
            for (let t = 0; t < 3; t++) {
                try {
                    await fs.copy(a, b, { overwrite: true })
                    ultimoErr = null
                    break
                } catch (err) {
                    ultimoErr = err
                    if (err?.code === 'EPERM' || err?.code === 'EBUSY') {
                        await new Promise((r) => setTimeout(r, 400 * (t + 1)))
                        continue
                    }
                    throw err
                }
            }
            if (ultimoErr) {
                console.warn('sync-vendor FALHOU (arquivo em uso):', path.relative(raiz, a))
                throw ultimoErr
            }
        }
    }
}

if (!(await fs.pathExists(src))) {
    console.error('vendor/lbot-api-comandos não encontrado')
    process.exit(1)
}

await fs.ensureDir(path.dirname(dest))
await copiarDir(src, dest)
// Mantém package.json do vendor
await fs.copy(path.join(src, 'package.json'), path.join(dest, 'package.json'), { overwrite: true })
console.log('sync-vendor OK:', path.relative(raiz, dest))

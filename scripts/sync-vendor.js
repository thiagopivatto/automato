/**
 * Copia vendor/lbot-api-comandos → node_modules/@victorsouzaleal/lbot-api-comandos
 * Necessário no UNC/NAS (install-links=true cria cópia, não symlink).
 * Pula cópia se hash do api/ia.js já bate; faz smoke dos exports críticos.
 */
import fs from 'fs-extra'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath, pathToFileURL } from 'url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(raiz, 'vendor', 'lbot-api-comandos')
const dest = path.join(raiz, 'node_modules', '@victorsouzaleal', 'lbot-api-comandos')

const IGNORE = new Set(['node_modules', '.git', 'package-lock.json'])

async function hashArquivo(p) {
    try {
        const buf = await fs.readFile(p)
        return crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12)
    } catch {
        return null
    }
}

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

async function smokeExports() {
    const iaPath = path.join(dest, 'api', 'ia.js')
    if (!(await fs.pathExists(iaPath))) {
        throw new Error('smoke: api/ia.js ausente após sync')
    }
    const mod = await import(pathToFileURL(iaPath).href + `?t=${Date.now()}`)
    const obrigatorios = [
        'consultarCotasIA',
        'obterRespostaIA',
        'gerarTextoIA',
        'analisarImagemIA',
        'responderOfensaIA'
    ]
    const faltando = obrigatorios.filter((n) => typeof mod[n] !== 'function')
    if (faltando.length) {
        throw new Error(`smoke IA: exports faltando: ${faltando.join(', ')}`)
    }
    const h = await hashArquivo(iaPath)
    console.log(`sync-vendor smoke OK · ia.js=${h} · exports=${obrigatorios.length}`)
    return h
}

if (!(await fs.pathExists(src))) {
    console.error('vendor/lbot-api-comandos não encontrado')
    process.exit(1)
}

const hashSrc = await hashArquivo(path.join(src, 'api', 'ia.js'))
const hashDest = await hashArquivo(path.join(dest, 'api', 'ia.js'))
const forcar = process.argv.includes('--force')

if (!forcar && hashSrc && hashSrc === hashDest) {
    console.log(`sync-vendor skip (hash ia.js=${hashSrc})`)
    try {
        await smokeExports()
    } catch (err) {
        console.warn(`[sync-vendor] smoke falhou com hash igual — forçando cópia: ${err.message}`)
        await fs.ensureDir(path.dirname(dest))
        await copiarDir(src, dest)
        await fs.copy(path.join(src, 'package.json'), path.join(dest, 'package.json'), { overwrite: true })
        await smokeExports()
    }
} else {
    await fs.ensureDir(path.dirname(dest))
    await copiarDir(src, dest)
    await fs.copy(path.join(src, 'package.json'), path.join(dest, 'package.json'), { overwrite: true })
    console.log('sync-vendor OK:', path.relative(raiz, dest), hashSrc ? `(ia.js=${hashSrc})` : '')
    await smokeExports()
}

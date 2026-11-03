/**
 * postinstall resiliente — nunca derruba o npm install.
 * Importa os scripts direto (evita spawn + UNC/cmd no Windows).
 */
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const raiz = process.env.INIT_CWD || process.cwd()

async function run(rel) {
    try {
        const href = pathToFileURL(path.join(raiz, 'scripts', rel)).href
        if (rel === 'sync-vendor.js') {
            await import(href)
            return
        }
        if (rel === 'patch-baileys-group-status.js') {
            const mod = await import(href)
            mod.aplicarPatchStatus?.()
            return
        }
        await import(href)
    } catch (err) {
        console.warn(`[postinstall] ${rel}: ${err?.message || err} (ok — npm i continua)`)
    }
}

await run('fix-lock-vendor.js')
await run('sync-vendor.js')
await run('patch-baileys-group-status.js')

/**
 * Versão do WA Web com cache curto + fetch online.
 * Sempre tenta online no pareamento (QR) para evitar versão inválida.
 */
import fs from 'fs-extra'
import path from 'node:path'
import { fetchLatestBaileysVersion } from '@whiskeysockets/baileys'

const CACHE = path.resolve('dados', 'baileys-version-cache.json')
const TTL_MS = 6 * 60 * 60 * 1000
const FALLBACK = [2, 3000, 1027934701]

export async function obterVersaoWaWeb() {
    // 1) Online (timeout curto) — necessário p/ QR válido
    try {
        const fresh = await Promise.race([
            fetchLatestBaileysVersion(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
        ])
        if (fresh?.version?.length === 3) {
            await fs.ensureDir(path.dirname(CACHE))
            await fs.writeJson(CACHE, { version: fresh.version, ts: Date.now() }, { spaces: 0 })
            return { version: fresh.version, fromCache: false }
        }
    } catch (err) {
        console.log(`[boot] fetch versão WA falhou (${err?.message || err})`)
    }

    // 2) Cache
    try {
        if (await fs.pathExists(CACHE)) {
            const cached = await fs.readJson(CACHE)
            if (cached?.version?.length === 3 && (Date.now() - (cached.ts || 0)) < TTL_MS) {
                return { version: cached.version, fromCache: true }
            }
            if (cached?.version?.length === 3) {
                return { version: cached.version, fromCache: true }
            }
        }
    } catch { /* */ }

    return { version: FALLBACK, fromCache: false }
}

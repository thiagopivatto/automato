/**
 * Versão do WA Web — cache-first (boot rápido).
 * Online só bloqueia se não houver cache; senão refresh em background.
 */
import fs from 'fs-extra'
import path from 'node:path'
import { fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import { caminhoDados } from './caminhos.js'

const CACHE = caminhoDados('baileys-version-cache.json')
const TTL_MS = 6 * 60 * 60 * 1000
const FALLBACK = [2, 3000, 1027934701]
const ONLINE_MS = 1500

async function lerCache() {
    try {
        if (!(await fs.pathExists(CACHE))) return null
        const cached = await fs.readJson(CACHE)
        if (cached?.version?.length === 3) {
            const fresh = Date.now() - (cached.ts || 0) < TTL_MS
            return { version: cached.version, fresh, ts: cached.ts || 0 }
        }
    } catch {
        /* */
    }
    return null
}

async function buscarOnline() {
    const fresh = await Promise.race([
        fetchLatestBaileysVersion(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ONLINE_MS))
    ])
    if (fresh?.version?.length === 3) {
        await fs.ensureDir(path.dirname(CACHE))
        await fs.writeJson(CACHE, { version: fresh.version, ts: Date.now() }, { spaces: 0 })
        return fresh.version
    }
    return null
}

function refreshBackground() {
    buscarOnline().catch((err) => {
        console.log(`[boot] refresh versão WA (bg) falhou (${err?.message || err})`)
    })
}

export async function obterVersaoWaWeb() {
    const cached = await lerCache()
    if (cached?.version) {
        refreshBackground()
        return { version: cached.version, fromCache: true }
    }

    try {
        const version = await buscarOnline()
        if (version) return { version, fromCache: false }
    } catch (err) {
        console.log(`[boot] fetch versão WA falhou (${err?.message || err})`)
    }

    return { version: FALLBACK, fromCache: false }
}

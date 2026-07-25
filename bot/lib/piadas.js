/**
 * Piadas PT-BR: banco JSON (dados/conteudo/piadas.json) + cache de APIs.
 */
import axios from 'axios'
import fs from 'fs-extra'
import path from 'node:path'
import { listarItens, sortearItem, tamanhoBanco } from './conteudo.js'

const CACHE_PATH = path.resolve('dados/piadas_cache.json')
let _cacheApi = null

async function carregarCacheApi() {
    if (_cacheApi) return _cacheApi
    try {
        if (await fs.pathExists(CACHE_PATH)) {
            const data = await fs.readJson(CACHE_PATH)
            _cacheApi = Array.isArray(data?.piadas) ? data.piadas : []
            return _cacheApi
        }
    } catch { /* ignore */ }
    _cacheApi = []
    return _cacheApi
}

async function salvarCacheApi(lista) {
    _cacheApi = [...new Set(lista)].slice(-2000)
    try {
        await fs.ensureDir(path.dirname(CACHE_PATH))
        await fs.writeJson(CACHE_PATH, { piadas: _cacheApi, atualizado: Date.now() }, { spaces: 0 })
    } catch { /* ignore */ }
}

async function traduzirPt(texto) {
    try {
        const { translate } = await import('@vitalets/google-translate-api')
        const tr = await translate(String(texto), { to: 'pt' })
        return tr?.text?.trim() || texto
    } catch {
        return texto
    }
}

function formatarJokeApi(j) {
    if (!j) return null
    if (j.joke) return String(j.joke).trim()
    if (j.setup && j.delivery) return `${j.setup}\n\n${j.delivery}`.trim()
    if (j.setup && j.punchline) return `${j.setup}\n\n${j.punchline}`.trim()
    return null
}

export async function atualizarPiadasDaApi() {
    const novas = []
    try {
        const { data, status } = await axios.get('https://v2.jokeapi.dev/joke/Any', {
            params: {
                lang: 'en',
                amount: 10,
                blacklistFlags: 'nsfw,religious,political,racist,sexist,explicit',
                safeMode: true
            },
            timeout: 15000,
            validateStatus: () => true
        })
        if (status < 400 && !data?.error) {
            const jokes = data.jokes || (data.setup || data.joke ? [data] : [])
            for (const j of jokes) {
                const en = formatarJokeApi(j)
                if (!en) continue
                novas.push(await traduzirPt(en))
            }
        }
    } catch { /* next */ }

    try {
        const { data } = await axios.get('https://official-joke-api.appspot.com/jokes/ten', {
            timeout: 15000
        })
        for (const j of data || []) {
            const en = formatarJokeApi(j)
            if (!en) continue
            novas.push(await traduzirPt(en))
        }
    } catch { /* next */ }

    const validas = novas.filter((p) => p && String(p).trim().length > 20)
    if (validas.length) {
        const cache = await carregarCacheApi()
        await salvarCacheApi([...cache, ...validas])
    }
    return validas.length
}

export async function obterBancoPiadas() {
    const local = listarItens('piadas')
    const cache = await carregarCacheApi()
    return [...new Set([...local, ...cache])]
}

export async function obterPiadaAleatoria(chatId = 'global') {
    const cache = await carregarCacheApi()
    if (cache.length < 50 || Math.random() < 0.08) {
        atualizarPiadasDaApi().catch(() => {})
    }

    // Prefere banco local grande; mistura cache de API ocasionalmente
    if (cache.length && Math.random() < 0.15) {
        const texto = cache[Math.floor(Math.random() * cache.length)]
        return { texto, total: tamanhoBancoPiadas() }
    }

    const texto = sortearItem('piadas', chatId)
    if (texto) return { texto, total: tamanhoBancoPiadas() }

    const banco = await obterBancoPiadas()
    if (!banco.length) return { texto: 'Por que o grupo cruzou a rua?\n\nPra ver se alguém ainda estava online.', total: 0 }
    return { texto: banco[Math.floor(Math.random() * banco.length)], total: banco.length }
}

export function tamanhoBancoPiadas() {
    return tamanhoBanco('piadas') + (_cacheApi?.length || 0)
}

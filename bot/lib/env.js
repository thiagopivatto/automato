/**
 * Loader único de variáveis de ambiente (aliases centralizados).
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

let carregado = false

export function carregarEnv(raizProjeto) {
    if (carregado) return
    const raiz =
        raizProjeto ||
        path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
    dotenv.config({ path: path.join(raiz, '.env') })
    carregado = true
}

export function env(nome, ...aliases) {
    for (const k of [nome, ...aliases]) {
        const v = process.env[k]?.trim()
        if (v) return v
    }
    return ''
}

export function chavesIa() {
    return {
        gemini: env('GEMINI_API_KEY'),
        openrouter: env('OPENROUTER_API_KEY'),
        rapid: env('RAPIDAPI_KEY', 'X_RAPIDAPI_KEY'),
        eleven: env('ELEVENLABS_API_KEY', 'XI_API_KEY')
    }
}

/** Obrigatórias vs opcionais (documentação / boot). */
export const ENV_MATRIZ = {
    obrigatorias_basicas: [],
    recomendadas_ia: ['GEMINI_API_KEY', 'OPENROUTER_API_KEY', 'RAPIDAPI_KEY'],
    opcionais: [
        'DONO',
        'DONO_JID',
        'NUMERO_DONO',
        'ELEVENLABS_API_KEY',
        'OPENROUTER_MODEL',
        'YTDLP_PATH',
        'YTDLP_COOKIES',
        'YTDLP_BROWSER_COOKIES',
        'COBALT_API_URL',
        'acr_host',
        'acr_access_key',
        'acr_access_secret',
        'dg_secret_key'
    ]
}

/**
 * Acesso resiliente à API de IA do vendor.
 * Evita node_modules desatualizado (cópia file: no Linux/NAS).
 */
let cache = null

export async function carregarIaApi() {
    if (cache) return cache
    try {
        const api = (await import('./lbotApi.js')).default
        if (api?.IA?.consultarCotasIA && api?.IA?.obterRespostaIA) {
            cache = api.IA
            return cache
        }
    } catch { /* fallthrough */ }
    const vendor = await import('../../vendor/lbot-api-comandos/api/ia.js')
    cache = vendor
    return cache
}

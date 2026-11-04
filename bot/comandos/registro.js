/**
 * Despacho comando → handler (substitui switches monolíticos aos poucos).
 * @param {Record<string, Function>} mapa
 * @param {string} comandoSemPrefixo
 * @param {object} ctx
 * @returns {Promise<boolean>} true se encontrou handler
 */
export async function despacharMapa(mapa, comandoSemPrefixo, ctx) {
    const key = String(comandoSemPrefixo || '').toLowerCase()
    const fn = mapa[key]
    if (!fn) return false
    await fn(ctx)
    return true
}

/**
 * Monta mapa a partir de lista { cmds: string[], handler }.
 */
export function montarMapa(entradas = []) {
    const mapa = {}
    for (const ent of entradas) {
        const cmds = ent.cmds || (ent.cmd ? [ent.cmd] : [])
        for (const c of cmds) {
            mapa[String(c).toLowerCase()] = ent.handler
        }
    }
    return mapa
}

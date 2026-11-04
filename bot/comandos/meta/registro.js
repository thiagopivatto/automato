/**
 * Registro de comandos — helpers sobre comandosInfo (fonte atual).
 * Menus/docs/testes devem usar estas funções para evitar drift.
 */
import { comandosInfo } from '../comandos.js'

/** Aliases de handler que não precisam de meta própria (case → canônico no registro). */
export const ALIASES_HANDLER = {
    massacote: 'mascote',
    joke: 'piada',
    resumopersona: 'personalidaderesumo',
    // admin: estado online|offline|manutencao são subargs de `estado`
    online: 'estado',
    offline: 'estado',
    manutencao: 'estado'
}

/** Cases especiais que não precisam de meta própria. */
export const CASES_MENU_INFO = new Set([])

export function obterCatalogo(botInfo) {
    return comandosInfo(botInfo)
}

export function listarNomesComandos(botInfo) {
    const info = comandosInfo(botInfo)
    const nomes = []
    for (const [cat, cmds] of Object.entries(info)) {
        if (cat === 'outros') continue
        for (const nome of Object.keys(cmds || {})) nomes.push({ nome, categoria: cat })
    }
    return nomes
}

export function nomesPorCategoria(botInfo) {
    const info = comandosInfo(botInfo)
    const out = {}
    for (const [cat, cmds] of Object.entries(info)) {
        if (cat === 'outros') continue
        out[cat] = Object.keys(cmds || {})
    }
    return out
}

export function categoriasComandos() {
    return ['info', 'figurinhas', 'utilidades', 'ia', 'downloads', 'grupo', 'diversao', 'admin']
}

/** Mapa categoria → arquivo handler. */
export const HANDLERS_POR_CATEGORIA = {
    info: 'bot/comandos/info.js',
    figurinhas: 'bot/comandos/figurinhas.js',
    utilidades: 'bot/comandos/utilidades.js',
    ia: 'bot/comandos/ia.js',
    downloads: 'bot/comandos/downloads.js',
    grupo: 'bot/comandos/grupo.js',
    diversao: 'bot/comandos/diversao.js',
    admin: 'bot/comandos/admin.js'
}

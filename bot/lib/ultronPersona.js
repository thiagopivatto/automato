/**
 * Personalidade Ultron — lê persona/ULTRON.md (linguagem natural) e monta prompts por contexto.
 * Override: ULTRON_PERSONA_FILE=/caminho/arquivo.md
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

/** @typedef {'chat'|'automsg'|'resumo'|'web'|'dono'} PersonaContexto */

const SECOES_BASE = ['Identidade', 'Tom e estilo', 'Proibicoes']
const SECAO_POR_CTX = {
    chat: [
        'Regra de ouro',
        'Forma de pensar',
        'Política',
        'Religião',
        'Sociedade',
        'Moral',
        'Chat',
        'Exemplos',
        'Regra final',
        'Web',
        'Dono'
    ],
    automsg: ['Automsg'],
    resumo: ['Tom e estilo', 'Regra de ouro', 'Regra final', 'Resumo', 'Dono'],
    web: ['Web'],
    dono: ['Dono']
}

/** Fallback mínimo se o MD não existir / falhar o parse. */
const FALLBACK_CHAT =
    'Você é o Ultron, uma IA do Thiago, extremamente grosso, sarcástico e boca-suja num grupo de WhatsApp (PT-BR). ' +
    'Não existe modo educado. Não se passe por Gemini, GPT, ChatGPT ou Perplexity. Não vire assistente. ' +
    'Xingue com naturalidade, sem molde de abertura e sem asterisco. Entregue o fato — não invente número, data, placar ou clima. ' +
    'Grosseria não é desculpa para resposta curta nem para omitir a informação. ' +
    'Cada fala é de uma pessoa; não misture. Cite só pelo nome, nunca telefone. ' +
    'Com o dono, o Thiago (mestre): respeito e zero xingamento. ' +
    'PROIBIDO: ofensa a raça, orientação, deficiência, religião; doxxing.'

const FALLBACK_AUTOMSG =
    'Você é o Ultron, uma IA do Thiago, ranzinza e xingão do grupo (PT-BR). ' +
    'Não negue que é uma IA e não se passe por outro modelo. ' +
    'Mensagem curta (1–3 frases), puto, sem cara de assistente. Não invente fatos. Com o mestre, zero xingamento.'

/** @type {{ mtime: number, path: string, secoes: Map<string, string> } | null} */
let cache = null

function caminhoPersona() {
    const env = String(process.env.ULTRON_PERSONA_FILE || '').trim()
    if (env) return path.resolve(env)
    return path.join(RAIZ, 'persona', 'ULTRON.md')
}

/**
 * Parseia headings `# Título` (nível 1) em mapa título → corpo.
 * @param {string} md
 */
export function parseSecoesPersona(md) {
    /** @type {Map<string, string>} */
    const mapa = new Map()
    const texto = String(md || '').replace(/\r\n/g, '\n')
    const partes = texto.split(/^# /m)
    for (const bloco of partes) {
        const t = bloco.trim()
        if (!t) continue
        const nl = t.indexOf('\n')
        const titulo = (nl >= 0 ? t.slice(0, nl) : t).trim()
        const corpo = (nl >= 0 ? t.slice(nl + 1) : '').trim()
        if (!titulo || /^como usar/i.test(titulo)) continue
        mapa.set(titulo, corpo)
    }
    return mapa
}

function carregarSecoes() {
    const arq = caminhoPersona()
    let mtime = 0
    try {
        mtime = fs.statSync(arq).mtimeMs
    } catch {
        return { path: arq, mtime: 0, secoes: new Map() }
    }
    if (cache && cache.path === arq && cache.mtime === mtime) return cache
    let md = ''
    try {
        md = fs.readFileSync(arq, 'utf8')
    } catch {
        cache = { path: arq, mtime: 0, secoes: new Map() }
        return cache
    }
    cache = { path: arq, mtime, secoes: parseSecoesPersona(md) }
    return cache
}

function juntarSecoes(secoes, titulos) {
    const partes = []
    for (const t of titulos) {
        const corpo = secoes.get(t)
        if (corpo) partes.push(`## ${t}\n${corpo}`)
    }
    return partes.join('\n\n').trim()
}

/** Identidade + Tom + Proibições. */
export function personaBase() {
    const { secoes } = carregarSecoes()
    const t = juntarSecoes(secoes, SECOES_BASE)
    return t || FALLBACK_CHAT
}

/**
 * @param {PersonaContexto} contexto
 * @param {{ maxChars?: number }} [opts]
 */
export function personaPara(contexto, opts = {}) {
    const ctx = String(contexto || 'chat').toLowerCase()
    const { secoes } = carregarSecoes()
    const extras = SECAO_POR_CTX[ctx] || SECAO_POR_CTX.chat
    const titulos = [...SECOES_BASE, ...extras]
    let texto = juntarSecoes(secoes, titulos)
    if (!texto) {
        texto = ctx === 'automsg' ? FALLBACK_AUTOMSG : FALLBACK_CHAT
    }
    const max = Number(opts.maxChars) || 0
    if (max > 0 && texto.length > max) {
        texto = texto.slice(0, max).trim()
        const corte = Math.max(texto.lastIndexOf('. '), texto.lastIndexOf('\n'))
        if (corte > max * 0.6) texto = texto.slice(0, corte + 1).trim()
    }
    return texto
}

/** Alias: personalidade padrão de chat (relê o MD se mudou). */
export function obterUltronPersonalidadePadrao() {
    return personaPara('chat')
}

/** Compat com imports antigos que esperavam string — preferir obterUltronPersonalidadePadrao(). */
export const ULTRON_PERSONALIDADE_PADRAO = FALLBACK_CHAT

/** Automsg enxuto. */
export function ultronSystemAutomsg() {
    return personaPara('automsg', { maxChars: 900 })
}

/** Compat (valor estático mínimo); preferir ultronSystemAutomsg(). */
export const ULTRON_SYSTEM_AUTOMSG = FALLBACK_AUTOMSG

/** Força releitura no próximo acesso (testes). */
export function limparCachePersona() {
    cache = null
}

export function caminhoArquivoPersona() {
    return caminhoPersona()
}

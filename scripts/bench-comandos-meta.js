/**
 * Classifica comandos em tiers de latência (dry-run, sem WhatsApp/APIs).
 * A ≤1s local · B chat ≤3–4s · C pesado (sem meta 1s)
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { obterCatalogo, HANDLERS_POR_CATEGORIA } from '../bot/comandos/meta/registro.js'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const TIER_A = new Set([
    'menu',
    'comandos',
    'painel',
    'status',
    'painelbot',
    'infobot',
    'admin',
    'info',
    'ajuda',
    'ping',
    'prefixo',
    'estado',
    'tipos',
    'usuarios',
    'grupos',
    'sairgrupo',
    'entrargrupo',
    'bc',
    'bv',
    'mutar',
    'alink',
    'autosticker',
    'ofensa',
    'automsg',
    'contador',
    'aflood',
    'limitediario',
    'pv',
    'autorevelar',
    'personalidade',
    'personalidaderesumo',
    'sugerir',
    'sugestoes'
])

const TIER_B = new Set(['chat', 'simi', 'pesquisa', 'traduzir', 'calc', 'cotasia'])

const TIER_C = new Set([
    'criarimg',
    'criarimagem',
    'musica',
    'resumodogrupo',
    'resumo',
    'resumotema',
    'yt',
    'play',
    'playvid',
    'ig',
    'tk',
    'fb',
    'twitter',
    'x',
    'midia',
    'sticker',
    's',
    'ssf',
    'figurinhas',
    'ouvir',
    'qualmusica',
    'voz',
    'upscale',
    'removerfundo',
    'stems'
])

function classificar(nome) {
    const n = String(nome || '').toLowerCase()
    if (TIER_A.has(n)) return 'A'
    if (TIER_B.has(n)) return 'B'
    if (TIER_C.has(n)) return 'C'
    // Heurística por categoria
    return 'C'
}

function metaTier(t) {
    if (t === 'A') return '≤1s resposta final (local, sem rede)'
    if (t === 'B') return '≤3–4s E2E (web + persona + cascade)'
    return 'sem meta 1s — ack rápido + telemetria'
}

const bot = { prefixo: '!', nome_bot: 'Ultron', nome_adm: 'Admin' }
const info = obterCatalogo(bot)

const porTier = { A: [], B: [], C: [] }
const vistos = new Set()

for (const [cat, nomes] of Object.entries(HANDLERS_POR_CATEGORIA || {})) {
    for (const nome of nomes || []) {
        const key = String(nome).toLowerCase()
        if (vistos.has(key)) continue
        vistos.add(key)
        const tier = classificar(key)
        const desc = info?.[cat]?.[key]?.descricao || info?.[cat]?.[nome]?.descricao || ''
        porTier[tier].push({ comando: key, categoria: cat, desc: String(desc).slice(0, 80) })
    }
}

// Também varre chaves do catálogo (aliases / meta sem handler listado)
for (const [cat, cmds] of Object.entries(info || {})) {
    if (!cmds || typeof cmds !== 'object') continue
    for (const nome of Object.keys(cmds)) {
        const key = String(nome).toLowerCase()
        if (vistos.has(key)) continue
        vistos.add(key)
        const tier = classificar(key)
        const desc = cmds[nome]?.descricao || ''
        porTier[tier].push({ comando: key, categoria: cat, desc: String(desc).slice(0, 80) })
    }
}

const sortCmd = (a, b) => a.comando.localeCompare(b.comando)
for (const t of ['A', 'B', 'C']) porTier[t].sort(sortCmd)

console.log(`# Bench meta comandos — ${path.basename(raiz)}`)
console.log(`# Total únicos: ${vistos.size}`)
console.log('')

for (const t of ['A', 'B', 'C']) {
    console.log(`## Tier ${t} — ${metaTier(t)} (${porTier[t].length})`)
    for (const row of porTier[t]) {
        console.log(`  !${row.comando.padEnd(22)} [${row.categoria}] ${row.desc}`)
    }
    console.log('')
}

console.log('## Defaults fila (escala)')
console.log(
    `  FILA_CONCURRENCY=${process.env.FILA_CONCURRENCY || 12} FILA_CHAT_CONCURRENCY=${process.env.FILA_CHAT_CONCURRENCY || 1} MAX_CHAT_QUEUES=${process.env.MAX_CHAT_QUEUES || 500}`
)
console.log('')
console.log('OK — classificação dry-run (sem chamar APIs externas).')

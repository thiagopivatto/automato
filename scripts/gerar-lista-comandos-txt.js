import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { obterCatalogo, HANDLERS_POR_CATEGORIA } from '../bot/comandos/meta/registro.js'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const bot = { prefixo: '!', nome_bot: 'Ultron', nome_adm: 'Admin' }
const info = obterCatalogo(bot)

const handlers = HANDLERS_POR_CATEGORIA

const titulos = {
    info: 'INFO',
    figurinhas: 'FIGURINHAS',
    utilidades: 'UTILIDADES',
    ia: 'IA / GERACAO',
    downloads: 'DOWNLOADS',
    diversao: 'DIVERSÃO',
    grupo: 'GRUPO',
    admin: 'ADMIN (DONO DO BOT)'
}

function analisarPermissoes(src, nomesConhecidos) {
    const map = {}
    const conhecidos = new Set([...nomesConhecidos].map((n) => n.toLowerCase()))
    // aceita 'cmd', "cmd" e `cmd`
    const re = /case\s+['"`]([a-z0-9_]+)['"`]\s*:/gi
    const matches = [...src.matchAll(re)].filter((m) => conhecidos.has(m[1].toLowerCase()))
    for (let i = 0; i < matches.length; i++) {
        const nome = matches[i][1].toLowerCase()
        const start = matches[i].index
        const end = i + 1 < matches.length ? matches[i + 1].index : src.length
        // Só o início do handler (evita pegar lógica opcional mais abaixo)
        const bloco = src.slice(start, Math.min(end, start + 900))
        const tags = []
        if (/mensagem_dono\b/.test(bloco) || /apenas_dono_bot/.test(bloco)) tags.push('DONO_BOT')
        if (/apenas_dono_grupo/.test(bloco) || /verificarDono/.test(bloco)) tags.push('DONO_GRUPO')
        // Exige check de permissão real, não só leitura de flag
        if (
            /!usuario_admin/.test(bloco) ||
            /apenas_admin/.test(bloco) ||
            /if\s*\(\s*!?\s*usuario_admin/.test(bloco)
        ) {
            tags.push('ADMIN_GRUPO')
        }
        if (/!bot_admin/.test(bloco) || /bot_admin/.test(bloco) && /permissao\.bot_admin/.test(bloco)) {
            tags.push('BOT_ADMIN')
        }
        if (
            /!mensagem_grupo/.test(bloco) ||
            /permissao\.grupo/.test(bloco) ||
            /if\s*\(\s*!mensagem_grupo/.test(bloco)
        ) {
            tags.push('SO_GRUPO')
        }
        map[nome] = [...new Set(tags)]
    }
    return map
}

const permsPorCat = {}
for (const [cat, file] of Object.entries(handlers)) {
    const src = fs.readFileSync(path.join(raiz, file), 'utf8')
    const nomes = Object.keys(info[cat] || {})
    const map = analisarPermissoes(src, nomes)
    // Admin: gate global no início do arquivo
    if (cat === 'admin' || /!mensagem_dono/.test(src.slice(0, 2500))) {
        for (const n of nomes) {
            const t = map[n] || []
            if (!t.includes('DONO_BOT')) t.unshift('DONO_BOT')
            map[n] = t
        }
    }
    // Grupo: gate global no início do arquivo
    if (cat === 'grupo' || (file.includes('grupo.js') && /!mensagem_grupo/.test(src.slice(0, 2500)))) {
        for (const n of nomes) {
            const t = map[n] || []
            if (!t.includes('SO_GRUPO')) t.unshift('SO_GRUPO')
            map[n] = t
        }
    }
    permsPorCat[cat] = map
}

function quemPode(tags, cat) {
    if (tags.includes('DONO_BOT') || cat === 'admin') return 'Apenas o DONO do bot'
    if (tags.includes('DONO_GRUPO')) {
        return tags.includes('BOT_ADMIN')
            ? 'Apenas o DONO do grupo + bot precisa ser admin'
            : 'Apenas o DONO do grupo'
    }
    if (tags.includes('ADMIN_GRUPO') && tags.includes('BOT_ADMIN')) {
        return 'Admin do grupo + bot precisa ser admin'
    }
    if (tags.includes('ADMIN_GRUPO')) return 'Admin do grupo'
    if (tags.includes('SO_GRUPO') || cat === 'grupo') return 'Qualquer membro (só em grupo)'
    return 'Qualquer usuário (grupo e/ou PV, se PV liberado)'
}

function limparTexto(g) {
    return String(g || '')
        .replace(/\*/g, '')
        .replace(/\r/g, '')
        .replace(/\n+/g, ' | ')
        .replace(/\s+/g, ' ')
        .replace(/\s*\|\s*/g, ' | ')
        .replace(/(\s*\|\s*)+$/g, '')
        .trim()
}

const cats = Object.keys(info).filter((k) => k !== 'outros')
let total = 0
const lines = []

lines.push('================================================================================')
lines.push('  ULTRON — LISTA COMPLETA DE COMANDOS')
lines.push('================================================================================')
lines.push('Gerado a partir do código (bot/comandos/*).')
lines.push('Prefixo padrão: !  (configurável pelo dono)')
lines.push('Ajuda no WhatsApp: !<comando> guia')
lines.push('')
lines.push('LEGENDA — QUEM PODE')
lines.push('  • Qualquer usuário ........ membro comum / PV (se pvliberado)')
lines.push('  • Só em grupo ............. não funciona no privado')
lines.push('  • Admin do grupo .......... precisa ser admin do grupo')
lines.push('  • Bot admin ............... o bot precisa ser admin do grupo')
lines.push('  • Dono do grupo ........... só o criador/dono do grupo')
lines.push('  • Dono do bot ............. exclusivo do dono cadastrado')
lines.push('')
lines.push('RESTRIÇÕES GERAIS')
lines.push('  • Limite diário / taxa de comandos podem estar ativos (dono)')
lines.push('  • Comandos podem ser bloqueados no grupo (!bcmd) ou global (!bcmdglobal)')
lines.push('  • Grupo mutado (!mutar): membros comuns não usam comandos')
lines.push('  • PV: comandos no privado só se !pvliberado estiver ligado')
lines.push('  • Usuário bloqueado pelo bot não usa comandos')
lines.push('  • APIs: .env (GEMINI, OPENROUTER, RAPIDAPI, ELEVENLABS, ACR, Deepgram, etc.)')
lines.push('  • Downloads YT/IG: yt-dlp no PATH (ou YTDLP_PATH / cookies)')
lines.push('')

for (const cat of cats) {
    const titulo = titulos[cat] || cat.toUpperCase()
    const cmds = Object.entries(info[cat] || {})
    lines.push('================================================================================')
    lines.push(`  ${titulo}  (${cmds.length} comandos)`)
    lines.push('================================================================================')
    lines.push('')

    for (const [nome, meta] of cmds) {
        total++
        let tags = permsPorCat[cat]?.[nome]
        if (!tags) {
            tags = cat === 'admin' ? ['DONO_BOT'] : cat === 'grupo' ? ['SO_GRUPO'] : []
        }
        const quem = quemPode(tags, cat)
        const guia = limparTexto(meta.guia)
        const desc = String(meta.descricao || '').trim()

        lines.push(`▶ !${nome}`)
        if (desc) lines.push(`  O que faz : ${desc}`)
        lines.push(`  Quem pode : ${quem}`)
        if (guia) lines.push(`  Como usar : ${guia}`)
        if (meta.minimo) lines.push(`  Restrição : ${limparTexto(meta.minimo)}`)
        lines.push('')
    }
}

lines.push('================================================================================')
lines.push(`  TOTAL: ${total} comandos`)
lines.push('================================================================================')
lines.push('')
lines.push('ÍNDICE RÁPIDO (só nomes)')
lines.push('--------------------------------------------------------------------------------')
for (const cat of cats) {
    const nomes = Object.keys(info[cat] || {})
        .map((n) => `!${n}`)
        .join(', ')
    lines.push(`${titulos[cat] || cat}:`)
    lines.push(`  ${nomes}`)
    lines.push('')
}

const out = path.join(raiz, 'docs', 'LISTA_COMANDOS.txt')
fs.writeFileSync(out, lines.join('\n'), 'utf8')
console.log(`docs/LISTA_COMANDOS.txt atualizado (${total} comandos)`)

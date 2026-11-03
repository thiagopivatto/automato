/**
 * Menus do Ultron — catálogo completo gerado do registro (sem comandos de dono).
 * Uma única mensagem, seções claras e legíveis no WhatsApp.
 */
import { comandosInfo } from '../comandos/comandos.js'

const TITULOS = {
    info: '📌 INFO',
    figurinhas: '🎨 FIGURINHAS',
    utilidades: '🛠️ UTILIDADES',
    ia: '🤖 IA',
    downloads: '📥 DOWNLOADS',
    grupo: '👥 GRUPO',
    diversao: '🎲 DIVERSÃO'
}

const ORDEM = ['info', 'figurinhas', 'utilidades', 'ia', 'downloads', 'grupo', 'diversao']

const rodape = (botInfo) => {
    const { nome_bot, nome_adm } = botInfo
    return `_${String(nome_bot || 'Ultron').trim()} · ${String(nome_adm || '').trim()}_`
}

function truncar(txt, max = 58) {
    const s = String(txt || '').replace(/\s+/g, ' ').trim()
    if (!s) return '—'
    if (s.length <= max) return s
    return `${s.slice(0, max - 1).trim()}…`
}

/** Extrai uma linha curta de descrição a partir de descricao/guia. */
function descricaoCurta(meta, _prefixo, _nome) {
    const desc = String(meta?.descricao || '').trim()
    if (desc) return truncar(desc)

    const guia = String(meta?.guia || '')
        .replace(/\*/g, '')
        .replace(/\r/g, '')

    const linhas = guia
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !/^obs\b/i.test(l) && !/^\{p\d/i.test(l))

    for (const linha of linhas) {
        // Preferir "Ex: !cmd args - explicação"
        let m = linha.match(/^Ex:\s*.+?\s[-–—]\s+(.+)$/i)
        if (!m) m = linha.match(/^.+?\s[-–—]\s+(.+)$/)
        if (!m) continue

        let txt = String(m[1] || '').replace(/\s+/g, ' ').trim()
        // Primeira frase útil
        txt = txt.split(/\.\s+/)[0].replace(/\.$/, '').trim()
        // Evita restos de placeholders / listas
        if (!txt || /^[\[\{]/.test(txt) || /^\d+\]/.test(txt)) continue
        return truncar(txt)
    }

    return '—'
}

function blocoSecao(titulo, itens) {
    const linhas = []
    linhas.push(`*${titulo}*`)
    linhas.push('━━━━━━━━━━━━━━━━━━━━')
    for (const item of itens) linhas.push(item)
    return linhas.join('\n')
}

/**
 * Lista completa de comandos (exceto admin/dono), uma mensagem só.
 */
export function menuCompleto(botInfo) {
    const { prefixo, nome_bot } = botInfo
    const info = comandosInfo(botInfo)
    const blocos = []

    blocos.push(
        [
            `✦ *${String(nome_bot || 'Ultron').trim()}* · *MENU DE COMANDOS*`,
            `Ajuda detalhada: *${prefixo}comando guia*`,
            `Este menu: *${prefixo}menu* · *${prefixo}comandos*`
        ].join('\n')
    )

    let total = 0
    for (const cat of ORDEM) {
        const cmds = info[cat] || {}
        const nomes = Object.keys(cmds).sort()
        if (!nomes.length) continue

        const itens = nomes.map((nome) => {
            const breve = descricaoCurta(cmds[nome], prefixo, nome)
            total++
            return `• *${prefixo}${nome}* — ${breve}`
        })

        blocos.push(blocoSecao(TITULOS[cat] || cat.toUpperCase(), itens))
    }

    blocos.push(`✅ *${total}* comandos disponíveis _(sem painel do dono)_`)
    blocos.push(rodape(botInfo))

    // Separação clara entre seções; tudo em uma única string/mensagem
    return blocos.join('\n\n')
}

/** Mantido por compatibilidade — não fatia mais; devolve 1 bloco. */
export function fatiarMenu(texto) {
    return [String(texto || '')]
}

export const menuPrincipal = (botInfo) => menuCompleto(botInfo)

export const menuFigurinhas = (botInfo) => secaoCategoria(botInfo, 'figurinhas')
export const menuInfoSuporte = (botInfo) => secaoCategoria(botInfo, 'info')
export const menuDownload = (botInfo) => secaoCategoria(botInfo, 'downloads')
export const menuUtilidades = (botInfo) => {
    const a = secaoCategoria(botInfo, 'utilidades')
    const b = secaoCategoria(botInfo, 'ia')
    return `${a}\n\n${b}`
}
export const menuGrupo = (_admin, botInfo) => secaoCategoria(botInfo, 'grupo')
export const menuDiversao = (_grupo, botInfo) => secaoCategoria(botInfo, 'diversao')

function secaoCategoria(botInfo, cat) {
    const { prefixo } = botInfo
    const info = comandosInfo(botInfo)
    const cmds = info[cat] || {}
    const itens = Object.keys(cmds)
        .sort()
        .map((nome) => `• *${prefixo}${nome}* — ${descricaoCurta(cmds[nome], prefixo, nome)}`)
    return [blocoSecao(TITULOS[cat] || cat, itens), rodape(botInfo)].join('\n\n')
}

export const menuAdmin = (botInfo) => {
    const { prefixo } = botInfo
    const info = comandosInfo(botInfo)
    const cmds = info.admin || {}
    const itens = Object.keys(cmds)
        .sort()
        .map((nome) => `• *${prefixo}${nome}* — ${descricaoCurta(cmds[nome], prefixo, nome)}`)
    return [blocoSecao('⚙️ ADMIN / DONO', itens), rodape(botInfo)].join('\n\n')
}

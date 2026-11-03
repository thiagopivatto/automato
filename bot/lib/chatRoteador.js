/**
 * Detecta se o pedido do !chat corresponde a um comando do bot e devolve
 * { tipo: 'comando', comando, argsTexto } ou { tipo: 'conversa' }.
 */
import api from '@victorsouzaleal/lbot-api-comandos'
import { comandosInfo } from '../comandos/comandos.js'

const BLOQUEADOS = new Set([
    'chat', // evita loop
    'desligar',
    'sairgrupos',
    'bcgrupos',
    'aviso',
    'bantodos',
    'entrargrupo'
])

function catalogoCompacto(botInfo) {
    const info = comandosInfo(botInfo)
    const { prefixo } = botInfo
    const linhas = []
    for (const [cat, cmds] of Object.entries(info)) {
        if (cat === 'outros' || cat === 'admin') continue // admin só via dono explícito
        for (const [nome, meta] of Object.entries(cmds || {})) {
            if (BLOQUEADOS.has(nome)) continue
            const guia = String(meta?.guia || meta?.descricao || '')
                .replace(/\n+/g, ' ')
                .replace(/\*/g, '')
                .slice(0, 140)
            linhas.push(`${prefixo}${nome} | ${cat} | ${guia}`)
        }
    }
    // Dono pode pedir admin via chat
    for (const [nome, meta] of Object.entries(info.admin || {})) {
        if (BLOQUEADOS.has(nome)) continue
        const guia = String(meta?.guia || '').replace(/\n+/g, ' ').replace(/\*/g, '').slice(0, 100)
        linhas.push(`${prefixo}${nome} | admin | ${guia}`)
    }
    return linhas.join('\n')
}

function extrairJson(texto) {
    const bruto = String(texto || '').trim()
    if (!bruto) return null
    try {
        return JSON.parse(bruto)
    } catch { /* */ }
    const fence = bruto.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fence?.[1]) {
        try {
            return JSON.parse(fence[1].trim())
        } catch { /* */ }
    }
    const i = bruto.indexOf('{')
    const f = bruto.lastIndexOf('}')
    if (i >= 0 && f > i) {
        try {
            return JSON.parse(bruto.slice(i, f + 1))
        } catch { /* */ }
    }
    return null
}

/**
 * Heurística rápida sem IA para pedidos óbvios.
 */
function heuristicaRapida(texto, prefixo) {
    const t = String(texto || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
    if (!t.trim()) return null

    // Pedido explícito de comando com prefixo no meio do texto
    const mCmd = t.match(new RegExp(`(?:^|\\s)(\\${prefixo}[a-z0-9]+)(?:\\s+(.*))?$`, 'i'))
    if (mCmd) {
        const cmd = mCmd[1].toLowerCase()
        const nome = cmd.replace(prefixo, '')
        if (!BLOQUEADOS.has(nome)) {
            return { tipo: 'comando', comando: cmd, argsTexto: (mCmd[2] || '').trim() }
        }
    }

    if (/resumo\s+do\s+grupo|resumir\s+o\s+grupo|faz(er)?\s+(o\s+)?resumo/.test(t)) {
        return { tipo: 'comando', comando: `${prefixo}resumodogrupo`, argsTexto: '' }
    }

    const top = t.match(/top\s+(\d+)\s+(.+)/i) || t.match(/(?:lista|ranking)\s+(?:dos?\s+)?(\d+)\s+(?:mais\s+)?(.+)/i)
    if (top) {
        return { tipo: 'comando', comando: `${prefixo}top`, argsTexto: `${top[1]} ${top[2].trim()}` }
    }

    if (/\b(casal|sortear|trisal|piada|fofoca|jornal|cancelado)\b/.test(t) && /faz|roda|executa|manda|gera|quero|pode/.test(t)) {
        const nome = t.match(/\b(casal|sortear|trisal|piada|fofoca|jornal|cancelado)\b/)[1]
        return { tipo: 'comando', comando: `${prefixo}${nome}`, argsTexto: '' }
    }

    return null
}

/**
 * @returns {Promise<{tipo:'conversa'}|{tipo:'comando',comando:string,argsTexto:string}>}
 */
export async function decidirAcaoChat(textoUsuario, botInfo, { mensagemDono = false } = {}) {
    const { prefixo } = botInfo
    const rapido = heuristicaRapida(textoUsuario, prefixo)
    if (rapido) {
        if (rapido.tipo === 'comando') {
            const nome = rapido.comando.replace(prefixo, '')
            const info = comandosInfo(botInfo)
            const ehAdmin = Object.keys(info.admin || {}).includes(nome)
            if (ehAdmin && !mensagemDono) return { tipo: 'conversa' }
            if (BLOQUEADOS.has(nome)) return { tipo: 'conversa' }
        }
        return rapido
    }

    const catalogo = catalogoCompacto(botInfo)
    const system =
        'Você é o roteador de intenções do bot Ultron no WhatsApp. ' +
        'Decida se o usuário quer EXECUTAR um comando do bot ou só CONVERSAR. ' +
        'Responda SOMENTE JSON válido, sem markdown: ' +
        '{"acao":"comando","comando":"nomeSemPrefixo","args":"argumentos"} OU {"acao":"conversa"}. ' +
        'Use comando só se a intenção for clara de acionar uma função do bot (resumo, top, download, figurinha, etc.). ' +
        'Se for dúvida, opinião, bate-papo ou pedido vago → conversa. ' +
        'Nunca invente comandos que não estejam no catálogo. args sem o nome do comando.'

    const prompt =
        `Prefixo do bot: ${prefixo}\n` +
        `Pedido do usuário:\n${textoUsuario}\n\n` +
        `Catálogo (comando | categoria | guia):\n${catalogo.slice(0, 14000)}\n\n` +
        'JSON:'

    try {
        const { resultado } = await api.IA.gerarTextoIA(prompt, system, { temperature: 0.1, timeout: 25000 })
        const json = extrairJson(resultado)
        if (!json || json.acao !== 'comando') return { tipo: 'conversa' }
        const nome = String(json.comando || '')
            .trim()
            .toLowerCase()
            .replace(new RegExp(`^\\${prefixo}`), '')
            .replace(/[^a-z0-9]/g, '')
        if (!nome || BLOQUEADOS.has(nome)) return { tipo: 'conversa' }

        const info = comandosInfo(botInfo)
        const cats = Object.keys(info).filter((k) => k !== 'outros')
        let existe = false
        let cat = null
        for (const c of cats) {
            if (Object.keys(info[c] || {}).includes(nome)) {
                existe = true
                cat = c
                break
            }
        }
        if (!existe) return { tipo: 'conversa' }
        if (cat === 'admin' && !mensagemDono) return { tipo: 'conversa' }

        return {
            tipo: 'comando',
            comando: `${prefixo}${nome}`,
            argsTexto: String(json.args || '').trim()
        }
    } catch (err) {
        console.log(`chatRoteador - ${err?.message || err}`)
        return { tipo: 'conversa' }
    }
}

/** Reescreve mensagemBaileys para parecer que o usuário digitou o comando. */
export function aplicarComandoNaMensagem(mensagemBaileys, comandoComPrefixo, argsTexto = '') {
    const args = argsTexto ? argsTexto.trim().split(/\s+/).filter(Boolean) : []
    mensagemBaileys.comando = String(comandoComPrefixo).toLowerCase()
    mensagemBaileys.args = args
    mensagemBaileys.texto_recebido = argsTexto.trim()
    mensagemBaileys.corpo = `${comandoComPrefixo}${argsTexto ? ' ' + argsTexto.trim() : ''}`
    return mensagemBaileys
}

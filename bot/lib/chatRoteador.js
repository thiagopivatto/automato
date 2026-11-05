/**
 * No chat, comando só roda se a pessoa escreveu o prefixo.
 * Menção e reply continuam conversa, não viram outro comando.
 */
import { comandosInfo } from '../comandos/comandos.js'

const BLOQUEADOS = new Set([
    'chat',
    'desligar',
    'sairgrupos',
    'bcgrupos',
    'aviso',
    'bantodos',
    'entrargrupo'
])

/** Comando explícito: o prefixo está no texto. Sem prefixo, não é comando. */
function comandoExplicito(texto, prefixo) {
    const t = String(texto || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
    if (!t.trim() || !prefixo) return null
    const escapado = String(prefixo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const mCmd = t.match(new RegExp(`(?:^|\\s)(${escapado}[a-z0-9]+)(?:\\s+(.*))?$`, 'i'))
    if (!mCmd) return null
    const cmd = mCmd[1].toLowerCase()
    const nome = cmd.slice(prefixo.length)
    if (!nome || BLOQUEADOS.has(nome)) return null
    return { tipo: 'comando', comando: cmd, argsTexto: (mCmd[2] || '').trim() }
}

/**
 * @returns {Promise<{tipo:'conversa'}|{tipo:'comando',comando:string,argsTexto:string}>}
 */
export async function decidirAcaoChat(textoUsuario, botInfo, { mensagemDono = false } = {}) {
    const { prefixo } = botInfo
    const achado = comandoExplicito(textoUsuario, prefixo)
    if (!achado) return { tipo: 'conversa' }
    const nome = achado.comando.slice(prefixo.length)
    const info = comandosInfo(botInfo)
    const cats = Object.keys(info).filter((k) => k !== 'outros')
    let cat = null
    for (const c of cats) {
        if (Object.keys(info[c] || {}).includes(nome)) {
            cat = c
            break
        }
    }
    if (!cat) return { tipo: 'conversa' }
    if (cat === 'admin' && !mensagemDono) return { tipo: 'conversa' }
    return achado
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

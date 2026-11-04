/**
 * Dump completo + toggles do painel do grupo (!painel / !status).
 */
import { GrupoControle } from '../controles/GrupoControle.js'
import { obterPersonalidadeChat } from './personalidadeChat.js'
import { obterPersonalidadeResumo } from './personalidadeResumo.js'

const LIMITE_WA = 3800

const FLAG_ON = '✅'
const FLAG_OFF = '❌'

function onOff(v) {
    return v ? FLAG_ON : FLAG_OFF
}

function trecho(texto, max = 100) {
    const t = String(texto || '').trim().replace(/\s+/g, ' ')
    if (!t) return ''
    return t.length > max ? `${t.slice(0, max)}…` : t
}

function idCurto(id) {
    return String(id || '').replace(/@g\.us$/, '').slice(-10)
}

/** Parte texto longo em até 2 mensagens (limite WA). */
export function fatiarPainel(texto) {
    const t = String(texto || '')
    if (t.length <= LIMITE_WA) return [t]
    const meio = Math.floor(t.length / 2)
    let corte = t.lastIndexOf('\n', meio)
    if (corte < LIMITE_WA * 0.3) corte = t.indexOf('\n', meio)
    if (corte < 0) corte = meio
    return [t.slice(0, corte).trimEnd(), t.slice(corte).trimStart()].filter(Boolean)
}

export async function montarDumpGrupo(grupoInfo, botInfo = {}) {
    const prefixo = botInfo.prefixo || '!'
    const g = grupoInfo || {}
    const id = g.id_grupo || ''
    const nome = g.nome || 'Grupo'

    const chatPers = (await obterPersonalidadeChat(id)) || ''
    const resumoPers = (await obterPersonalidadeResumo(id)) || ''

    const blockCmds = (g.block_cmds || []).map((c) => `${prefixo}${c}`)
    const listaNegra = g.lista_negra || []
    const shh = (g.shh || []).filter((s) => !s.ate || Number(s.ate) > Date.now())

    const bvOn = !!g.bemvindo?.status
    const bvMsg = bvOn && g.bemvindo?.msg ? trecho(g.bemvindo.msg, 60) : ''
    const flood = g.antiflood || {}
    const contador = g.contador || {}

    const linhas = [
        `[ 🤖 PAINEL DO GRUPO ]`,
        ``,
        `*Nome:* ${nome}`,
        `*Id:* ${id}`,
        ``,
        `*Flags*`,
        `• Ofensa: ${onOff(g.ofensa !== false)}`,
        `• Auto-Msg: ${onOff(g.automsg !== false)}`,
        `• Anti-Link: ${onOff(!!g.antilink)}`,
        `• Anti-Flood: ${
            flood.status
                ? `${FLAG_ON} (máx ${flood.max || 10} / ${flood.intervalo || 10}s)`
                : FLAG_OFF
        }`,
        `• Auto-Sticker: ${onOff(!!g.autosticker)}`,
        `• Mutar: ${onOff(!!g.mutar)}`,
        `• Bem-vindo: ${bvOn ? `${FLAG_ON}${bvMsg ? ` — ${bvMsg}` : ' (msg padrão)'}` : FLAG_OFF}`,
        `• Contador: ${
            contador.status ? `${FLAG_ON} (desde ${contador.inicio || '?'})` : FLAG_OFF
        }`,
        `• Só admins (restrito): ${onOff(!!g.restrito_msg)}`,
        ``,
        `*Bloqueio de cmds:* ${
            blockCmds.length ? blockCmds.join(', ') : 'nenhum'
        }`,
        `*Lista negra:* ${listaNegra.length}${
            listaNegra.length
                ? ` — ${listaNegra
                      .slice(0, 3)
                      .map((j) => String(j).replace(/\D/g, '').slice(-4))
                      .join(', ')}${listaNegra.length > 3 ? '…' : ''}`
                : ''
        }`,
        `*SHH ativos:* ${shh.length}`,
        ``,
        `*Personalidade chat:* ${
            chatPers ? trecho(chatPers, 120) : 'padrão Ultron'
        }`,
        `*Personalidade resumo:* ${
            resumoPers ? trecho(resumoPers, 120) : 'padrão do resumodogrupo'
        }`,
        ``,
        `_Toggles:_ *${prefixo}painel* ofensa|automsg|alink|autosticker|mutar|bv|contador`,
        `_On/off:_ *${prefixo}painel* ofensa on|off · *${prefixo}painel* aflood [máx] [intervalo]_`
    ]

    return linhas.join('\n')
}

/** Resumo curto pra lista do painelbot. */
export function resumoFlagsGrupo(g) {
    const bits = []
    if (g.ofensa !== false) bits.push('ofensa')
    if (g.automsg !== false) bits.push('automsg')
    if (g.antilink) bits.push('alink')
    if (g.mutar) bits.push('mutar')
    return bits.length ? bits.join('/') : '—'
}

export function idGrupoCurto(id) {
    return idCurto(id)
}

/**
 * Aplica toggle/alteração do painel.
 * @returns {{ ok: boolean, msg: string }}
 */
export async function aplicarTogglePainel(idGrupo, grupoInfo, argsTexto, botInfo = {}) {
    const grupos = new GrupoControle()
    const prefixo = botInfo.prefixo || '!'
    const raw = String(argsTexto || '').trim()
    if (!raw) return { ok: false, msg: '' }

    const parts = raw.split(/\s+/).filter(Boolean)
    const chave = (parts[0] || '').toLowerCase()
    const resto = parts.slice(1)
    const arg1 = (resto[0] || '').toLowerCase()

    const parseOnOff = (s) => {
        if (['on', 'ligar', 'liga', 'ativar', 'ativo', '1', 'true'].includes(s)) return true
        if (['off', 'desligar', 'desliga', 'desativar', 'inativo', '0', 'false'].includes(s))
            return false
        return null
    }

    const flipOuOnOff = (atual, arg) => {
        const parsed = parseOnOff(arg)
        if (parsed !== null) return parsed
        return !atual
    }

    switch (chave) {
        case 'ofensa': {
            const atual = grupoInfo.ofensa !== false
            if (!arg1) {
                return {
                    ok: true,
                    msg: atual
                        ? `🔥 OFENSA *ligada*.\nUse *${prefixo}painel ofensa off* pra desligar.`
                        : `🔥 OFENSA *desligada*.\nUse *${prefixo}painel ofensa on* pra ligar.`
                }
            }
            const ligar = flipOuOnOff(atual, arg1)
            await grupos.alterarOfensa(idGrupo, ligar)
            return { ok: true, msg: ligar ? '✅ Ofensa *ligada*.' : '✅ Ofensa *desligada*.' }
        }
        case 'automsg': {
            const atual = grupoInfo.automsg !== false
            const ligar = flipOuOnOff(atual, arg1)
            await grupos.alterarAutoMsg(idGrupo, ligar)
            return { ok: true, msg: ligar ? '✅ Auto-Msg *ligada*.' : '✅ Auto-Msg *desligada*.' }
        }
        case 'alink':
        case 'antilink': {
            const ligar = flipOuOnOff(!!grupoInfo.antilink, arg1)
            await grupos.alterarAntiLink(idGrupo, ligar)
            return { ok: true, msg: ligar ? '✅ Anti-Link *ligado*.' : '✅ Anti-Link *desligado*.' }
        }
        case 'autosticker': {
            const ligar = flipOuOnOff(!!grupoInfo.autosticker, arg1)
            await grupos.alterarAutoSticker(idGrupo, ligar)
            return {
                ok: true,
                msg: ligar ? '✅ Auto-Sticker *ligado*.' : '✅ Auto-Sticker *desligado*.'
            }
        }
        case 'mutar': {
            const ligar = flipOuOnOff(!!grupoInfo.mutar, arg1)
            await grupos.alterarMutar(idGrupo, ligar)
            return { ok: true, msg: ligar ? '✅ Mutar *ligado*.' : '✅ Mutar *desligado*.' }
        }
        case 'bv':
        case 'bemvindo': {
            const atual = !!grupoInfo.bemvindo?.status
            const ligar = flipOuOnOff(atual, arg1)
            if (ligar) {
                const msgCustom = parseOnOff(arg1) !== null ? '' : resto.join(' ').trim()
                await grupos.alterarBemVindo(idGrupo, true, msgCustom || undefined)
            } else {
                await grupos.alterarBemVindo(idGrupo, false)
            }
            return { ok: true, msg: ligar ? '✅ Bem-vindo *ligado*.' : '✅ Bem-vindo *desligado*.' }
        }
        case 'contador': {
            const atual = !!grupoInfo.contador?.status
            const ligar = flipOuOnOff(atual, arg1)
            if (ligar) {
                await grupos.alterarContador(idGrupo, true)
                const membros = grupoInfo.participantes || []
                if (membros.length) await grupos.registrarContagemGrupo(idGrupo, membros)
            } else {
                await grupos.alterarContador(idGrupo, false)
                await grupos.removerContagemGrupo(idGrupo)
            }
            return { ok: true, msg: ligar ? '✅ Contador *ligado*.' : '✅ Contador *desligado*.' }
        }
        case 'aflood':
        case 'antiflood': {
            const atual = !!grupoInfo.antiflood?.status
            if (!resto.length && !arg1) {
                const ligar = !atual
                if (ligar) {
                    await grupos.alterarAntiFlood(idGrupo, true, 10, 10)
                    return { ok: true, msg: '✅ Anti-Flood *ligado* (10 msgs / 10s).' }
                }
                await grupos.alterarAntiFlood(idGrupo, false)
                return { ok: true, msg: '✅ Anti-Flood *desligado*.' }
            }
            const onOffArg = parseOnOff(arg1)
            if (onOffArg === false) {
                await grupos.alterarAntiFlood(idGrupo, false)
                return { ok: true, msg: '✅ Anti-Flood *desligado*.' }
            }
            const max = parseInt(resto[0], 10) || grupoInfo.antiflood?.max || 10
            const intervalo = parseInt(resto[1], 10) || grupoInfo.antiflood?.intervalo || 10
            await grupos.alterarAntiFlood(idGrupo, true, max, intervalo)
            return {
                ok: true,
                msg: `✅ Anti-Flood *ligado* (máx ${max} msgs / ${intervalo}s).`
            }
        }
        default:
            return {
                ok: false,
                msg:
                    `Opção inválida.\n` +
                    `Use: *${prefixo}painel* ofensa|automsg|alink|autosticker|mutar|bv|contador\n` +
                    `Ou: *${prefixo}painel* aflood [máx] [intervalo]`
            }
    }
}

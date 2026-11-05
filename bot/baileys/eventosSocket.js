import {DisconnectReason, getContentType, normalizeMessageContent} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import {criarTexto, consoleErro, corTexto, verificarEnv, criarArquivosNecessarios, verificarNumeroDono, listaContemJid} from'../lib/util.js'
import {comandosInfo} from '../comandos/comandos.js'
import fs from "fs-extra"
import * as socket from './socket.js'
import {converterMensagem, tiposPermitidosMensagens, obterTipoConteudo, extrairTextoMensagem}  from './mensagem.js'
import {checagemMensagem} from '../lib/checagemMensagem.js'
import {chamadaComando} from '../lib/chamadaComando.js'
import {BotControle} from '../controles/BotControle.js'
import {GrupoControle} from '../controles/GrupoControle.js'
import {MensagemControle} from '../controles/MensagemControle.js'
import { carregarEnv } from '../lib/env.js'

/** Histórico append antigo (segundos). Comandos recentes no Linux chegam como append. */
const MSG_MAX_IDADE_APPEND_S = Number(process.env.MSG_MAX_IDADE_APPEND_S || 300)
const MSG_MAX_IDADE_CMD_APPEND_S = Number(process.env.MSG_MAX_IDADE_CMD_APPEND_S || 900)
/** Limite de msgs sendo processadas em paralelo no ingress (antes da fila de comandos). */
const INGRESS_MAX = Math.max(2, Number(process.env.ULTRON_INGRESS_MAX || 8))
let ingressAtivos = 0
const ingressEspera = []

function adquirirIngress() {
    if (ingressAtivos < INGRESS_MAX) {
        ingressAtivos++
        return Promise.resolve()
    }
    return new Promise((resolve) => {
        ingressEspera.push(() => {
            ingressAtivos++
            resolve()
        })
    })
}
function liberarIngress() {
    ingressAtivos = Math.max(0, ingressAtivos - 1)
    const next = ingressEspera.shift()
    if (next) next()
}

export const conexaoEncerrada = async(conexao, botInfo)=>{
    const comandos_info = comandosInfo(botInfo)
    const { lastDisconnect } = conexao
    let reconectar = false
    const erroCodigo = (new Boom(lastDisconnect.error))?.output?.statusCode
    if(lastDisconnect.error.message == "Comando"){
        consoleErro(comandos_info.outros.desconectado.comando, "DESCONECTADO")
    } else if( lastDisconnect.error.message == "erro_geral"){
        consoleErro(comandos_info.outros.desconectado.falha_grave, "DESCONECTADO")
    } else {
        if(erroCodigo == DisconnectReason?.loggedOut){
            fs.rmSync("./sessao", {recursive: true, force: true})
            consoleErro(comandos_info.outros.desconectado.deslogado, "DESCONECTADO")
        } else if(erroCodigo == DisconnectReason?.restartRequired){
            consoleErro(comandos_info.outros.desconectado.reiniciar, "DESCONECTADO")
        } else {
            consoleErro(criarTexto(comandos_info.outros.desconectado.conexao, erroCodigo, lastDisconnect.error.message), "DESCONECTADO")
        }
        reconectar = true
    }
    return reconectar
}

export const conexaoAberta = async(c, botInfo)=>{
    try{
        const {
            bootBanner,
            bootMarcarFase,
            bootPronto,
            registrarBootAutoMsg
        } = await import('../lib/boot.js')
        // Timer vem do app.js (start); não resetar aqui
        bootBanner()
        await criarArquivosNecessarios()
        carregarEnv()
        await new BotControle().inicializarBot(c, botInfo)
        await verificarEnv()
        await verificarNumeroDono()
        bootMarcarFase('bot')
        try {
            const { iniciarAutoMsg } = await import('../lib/autoMsg.js')
            iniciarAutoMsg(c, botInfo)
            registrarBootAutoMsg(true)
        } catch (e) {
            registrarBootAutoMsg(false)
            console.log(corTexto(`  AutoMsg: ${e?.message || e}`, '#d63e3e'))
        }
        try {
            const { iniciarLimpezaPeriodica } = await import('../lib/limparCache.js')
            iniciarLimpezaPeriodica()
        } catch (e) {
            console.log(corTexto(`  Limpeza periódica: ${e?.message || e}`, '#eab308'))
        }
        // Pronto antes do sync de grupos — mensagens já podem fluir
        bootPronto()
    } catch(err){
        consoleErro(err, "Inicialização")
        c.end(new Error("erro_geral"))
    }
}

function timestampMsgSeg(rawWa) {
    const t = Number(rawWa?.messageTimestamp || 0)
    if (!t) return Math.floor(Date.now() / 1000)
    return t > 1e12 ? Math.floor(t / 1000) : t
}

/** Resolve LID → PN quando o Baileys tiver o mapeamento (dono/comandos no Linux). */
async function resolverJidPn(c, jid) {
    if (!jid || !String(jid).endsWith('@lid')) return jid
    try {
        const map = c?.signalRepository?.lidMapping
        if (map?.getPNForLID) {
            const pn = await map.getPNForLID(jid)
            if (pn) return pn
        }
    } catch { /* */ }
    return jid
}

/** Processa uma única WAMessage (notify ou append recente). */
async function processarUmaMensagem(c, rawWa, botInfo, tipoUpsert) {
    if (!rawWa) return

    // Stub sem corpo: tenta ACK (às vezes o conteúdo chega depois)
    if (!rawWa.message) {
        const stub = rawWa.messageStubParameters?.[0]
        const rawNode = rawWa.messageStubParameters?.[1]
        if (String(stub || '').includes('absent') && rawNode) {
            try {
                const { BufferJSON } = await import('@whiskeysockets/baileys')
                const node = typeof rawNode === 'string'
                    ? JSON.parse(rawNode, BufferJSON.reviver)
                    : rawNode
                if (typeof c.sendMessageAck === 'function') await c.sendMessageAck(node)
            } catch { /* */ }
        }
        return
    }

    // Append antigo = histórico. Notify nunca filtra por idade.
    // No Linux, comandos ao vivo frequentemente chegam como append.
    if (tipoUpsert === 'append') {
        const idade = Math.abs(Math.floor(Date.now() / 1000) - timestampMsgSeg(rawWa))
        if (idade > MSG_MAX_IDADE_APPEND_S) {
            const prefixo = botInfo?.prefixo || '!'
            const preview = (() => {
                try {
                    const n = normalizeMessageContent(rawWa.message) || rawWa.message
                    return String(extrairTextoMensagem(n) || '').trim()
                } catch { return '' }
            })()
            // Só reprocessa histórico velho se for comando (ex.: !menu atrasado)
            if (!preview.startsWith(prefixo)) return
            if (idade > MSG_MAX_IDADE_CMD_APPEND_S) return
        }
    }

    // Normaliza wrappers (ephemeral / documentWithCaption / etc.)
    rawWa.message = normalizeMessageContent(rawWa.message) || rawWa.message

    const tipoMensagem = obterTipoConteudo(rawWa.message) || getContentType(rawWa.message)
    if (!tipoMensagem) return

    const { ehViewOnce, aoReceberViewOnce } = await import('../lib/revelar.js')
    const isViewOnce = ehViewOnce(rawWa.message)

    if (rawWa.key.fromMe || isViewOnce) {
        await new MensagemControle().armazenarMensagem(rawWa).catch(() => {})
    }

    // VO → reenvia como mídia NORMAL (antes do converter mutar o proto)
    if (isViewOnce && !rawWa.key.fromMe) {
        try {
            const cloneVo = typeof structuredClone === 'function'
                ? structuredClone(rawWa)
                : { ...rawWa, key: { ...rawWa.key }, message: rawWa.message }
            await aoReceberViewOnce(c, cloneVo)
        } catch (err) {
            console.log(`[revelar] chegada - ${err?.message || err}`)
        }
    }

    const grupos = new GrupoControle()
    const mensagemBaileys = await converterMensagem(rawWa, botInfo)

    // Completa PN via mapa LID do Baileys quando a key só trouxe @lid
    try {
        const { aliasesRemetenteKey, escolherRemetente } = await import('./mensagem.js')
        const aliases = [
            ...(mensagemBaileys.aliases_remetente || []),
            ...aliasesRemetenteKey(rawWa.key)
        ]
        let remetente = escolherRemetente(rawWa.key, botInfo?.numero_bot)
        if (String(remetente).endsWith('@lid')) {
            remetente = await resolverJidPn(c, remetente)
        }
        mensagemBaileys.remetente = remetente
        mensagemBaileys.aliases_remetente = [...new Set(aliases.filter(Boolean))]
        if (!mensagemBaileys.mensagem_grupo) {
            const chat = await resolverJidPn(c, mensagemBaileys.id_chat)
            if (chat) mensagemBaileys.id_chat = chat
        }
        const { UsuarioControle } = await import('../controles/UsuarioControle.js')
        const uc = new UsuarioControle()
        mensagemBaileys.mensagem_dono = await uc.ehDono(
            mensagemBaileys.remetente,
            ...mensagemBaileys.aliases_remetente
        )
        if (mensagemBaileys.mensagem_dono) {
            const donoId = await uc.obterIdDono()
            if (donoId && String(mensagemBaileys.remetente).endsWith('@lid')) {
                mensagemBaileys.remetente = donoId
            }
        }
    } catch { /* */ }

    // SHH primeiro: apaga antes de histórico/filtros (qualquer tipo de mídia)
    if(!await grupos.filtroShh(c, mensagemBaileys, botInfo)) return
    // Histórico — guarda msgs de grupo (comandos + midia); áudios podem ser transcritos
    try {
        const { registrarHistoricoGrupo } = await import('../controles/HistoricoGrupoControle.js')
        await registrarHistoricoGrupo(mensagemBaileys)
    } catch {}
    if(!tiposPermitidosMensagens.includes(mensagemBaileys.tipo)) return
    if(!await grupos.filtroAntiLink(c, mensagemBaileys, botInfo)) return
    if(!await grupos.filtroAntiFlood(c, mensagemBaileys, botInfo)) return
    if(!await checagemMensagem(c, mensagemBaileys, botInfo)) return
    try {
        const { incrMetrica } = await import('../lib/logger.js')
        incrMetrica('recv_ok')
        incrMetrica('msgs')
    } catch { /* */ }
    await chamadaComando(c, mensagemBaileys, botInfo)
}

export const receberMensagem = async (c, mensagem, botInfo)=>{
    try{
        // Baileys 7: notify = tempo real; append = offline/histórico (no Linux também traz comandos).
        const tipoUpsert = mensagem?.type
        if (tipoUpsert && tipoUpsert !== 'notify' && tipoUpsert !== 'append') return

        const lista = Array.isArray(mensagem?.messages) ? mensagem.messages : []
        if (!lista.length) return

        // NÃO descartar o lote inteiro: no Linux o 1º upsert (e às vezes os seguintes)
        // vem como append com dezenas/centenas de msgs — o comando do usuário pode estar dentro.
        for (const rawWa of lista) {
            await adquirirIngress()
            const msgId = rawWa?.key?.id
            try {
                await processarUmaMensagem(c, rawWa, botInfo, tipoUpsert)
                try {
                    const { marcarMsgDone } = await import('../lib/dedupMsgs.js')
                    marcarMsgDone(msgId)
                } catch { /* */ }
            } catch (err) {
                consoleErro(err, "MESSAGES.UPSERT.ITEM")
                // Libera id para retentar no próximo upsert (não perde a msg)
                try {
                    const { liberarMsgId } = await import('../lib/dedupMsgs.js')
                    liberarMsgId(msgId)
                } catch { /* */ }
            } finally {
                liberarIngress()
            }
        }
    } catch(err){
        consoleErro(err, "MESSAGES.UPSERT")
        try {
            const jid = mensagem?.messages?.[0]?.key?.remoteJid
            if (jid) await socket.enviarTexto(c, jid, '⚠️ Ocorreu um erro ao processar a mensagem, mas o bot continua ativo.').catch(()=>{})
        } catch {}
    }
}

export const adicionadoEmGrupo = async (c, dadosGrupo, botInfo)=>{
    try{
        const comandos_info = comandosInfo(botInfo)
        await new GrupoControle().registrarGrupoAoSerAdicionado(dadosGrupo[0])
        await socket.enviarTexto(c, dadosGrupo[0].id, criarTexto(comandos_info.outros.entrada_grupo, dadosGrupo[0].subject)).catch(()=>{})
    } catch(err){
        consoleErro(err, "GROUPS.UPSERT")
    }
}

export const atualizacaoParticipantesGrupo = async (c, evento, botInfo)=>{
    try{
        // Baileys 7 entrega contatos; os controles existentes trabalham com JIDs.
        evento = { ...evento, participants: evento.participants.map((p) => typeof p === 'string' ? p : p.id) }
        const grupos = new GrupoControle()
        const isBotUpdate = listaContemJid([botInfo.numero_bot, botInfo.lid_bot].filter(Boolean), evento.participants[0])
        const g_info = await grupos.obterGrupoInfo(evento.id)
        if (evento.action == 'add') {
            //SE O PARTICIPANTE ESTIVER NA LISTA NEGRA, EXPULSE
            if(!await grupos.verificarListaNegraUsuario(c, evento, botInfo)) return
            //ANTIFAKE
            //if(!await grupos.filtroAntiFake(c, evento, g_info, botInfo)) return
            //BEM-VINDO
            await grupos.mensagemBemVindo(c, evento, g_info, botInfo)
            //CONTADOR
            if(g_info?.contador.status) await grupos.verificarRegistrarContagemParticipante(evento.id, evento.participants[0])
            await grupos.adicionarParticipante(evento.id, evento.participants[0])
        } else if(evento.action == "remove"){
            if(isBotUpdate){
                if(g_info?.contador.status) await grupos.removerContagemGrupo(evento.id)
                await grupos.removerGrupo(evento.id)
            } else{
                await grupos.removerParticipante(evento.id, evento.participants[0])
            }
        } else if(evento.action == "promote"){
            await grupos.adicionarAdmin(evento.id, evento.participants[0])
        } else if(evento.action == "demote"){
            await grupos.removerAdmin(evento.id, evento.participants[0])
        }
    } catch(err){
        consoleErro(err, "GROUP-PARTICIPANTS.UPDATE")
        // Mantém o bot online mesmo com falha em eventos de grupo
    }
}

export const atualizacaoDadosGrupos = async (c, botInfo)=>{
    const { bootGruposProntos } = await import('../lib/boot.js')
    try{
        const dadosGrupos = await socket.obterTodosGrupos(c)
        if(dadosGrupos.length){
            const grupos = new GrupoControle()
            await grupos.registrarGruposAoIniciar(dadosGrupos)
            await grupos.atualizarDadosGruposInicio(dadosGrupos)
            await grupos.verificarListaNegraGeral(c, dadosGrupos, botInfo)
            await grupos.atualizarContagemGrupos(dadosGrupos)
        }
        bootGruposProntos(dadosGrupos?.length || 0)
        return true
    } catch(err){
        const msg = String(err?.message || err || '')
        const rate = /rate-overlimit|429/i.test(msg) || err?.data === 429
        if (rate) {
            console.log(corTexto('  Grupos: rate-limit do WhatsApp — usando cache local', '#eab308'))
        } else {
            consoleErro(err, "GROUPS.UPDATE")
        }
        let n = 0
        try {
            const salvos = await new GrupoControle().obterTodosGruposInfo()
            n = Array.isArray(salvos) ? salvos.length : 0
        } catch {
            n = 0
        }
        try {
            bootGruposProntos(n)
        } catch {
            console.log(corTexto('Online', false))
        }
        return true
    }
}

/** Processa fila diretamente (não re-emite no ev — no Baileys 7 o emit interno se perde). */
export const realizarEventosEspera = async(c, eventosEsperando, botInfo)=>{
    for (const ev of eventosEsperando) {
        try {
            if (ev.evento === 'messages.upsert') {
                await receberMensagem(c, ev.dados, botInfo)
            } else if (ev.evento === 'group-participants.update') {
                await atualizacaoParticipantesGrupo(c, ev.dados, botInfo)
            } else if (ev.evento === 'groups.upsert') {
                await adicionadoEmGrupo(c, ev.dados, botInfo)
            } else if (ev.evento === 'groups.update') {
                const grupos = ev.dados
                if (Array.isArray(grupos) && grupos[0]) await atualizacaoDadosGrupo(grupos[0])
            }
        } catch (err) {
            consoleErro(err, 'EVENTOS.ESPERA')
        }
    }
}

export const atualizacaoDadosGrupo = async (dadosGrupo)=>{
    try{
        await new GrupoControle().atualizarDadosGrupoParcial(dadosGrupo)
    } catch(err){
        consoleErro(err, "GROUPS.UPDATE")
    }
}

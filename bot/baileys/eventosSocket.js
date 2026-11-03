import {DisconnectReason, getContentType} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import {criarTexto, consoleErro, corTexto, verificarEnv, criarArquivosNecessarios, verificarNumeroDono, listaContemJid} from'../lib/util.js'
import {comandosInfo} from '../comandos/comandos.js'
import fs from "fs-extra"
import * as socket from './socket.js'
import {converterMensagem, tiposPermitidosMensagens}  from './mensagem.js'
import {checagemMensagem} from '../lib/checagemMensagem.js'
import {chamadaComando} from '../lib/chamadaComando.js'
import {BotControle} from '../controles/BotControle.js'
import {GrupoControle} from '../controles/GrupoControle.js'
import {MensagemControle} from '../controles/MensagemControle.js'
import { carregarEnv } from '../lib/env.js'


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
        const { bootBanner, registrarBootAutoMsg, registrarBootConteudo } = await import('../lib/boot.js')
        bootBanner()
        await criarArquivosNecessarios()
        carregarEnv()
        await new BotControle().inicializarBot(c, botInfo)
        await verificarEnv()
        await verificarNumeroDono()
        try {
            const { iniciarAutoMsg } = await import('../lib/autoMsg.js')
            iniciarAutoMsg(c, botInfo)
            registrarBootAutoMsg(true)
        } catch (e) {
            registrarBootAutoMsg(false)
            console.log(corTexto(`  AutoMsg: ${e?.message || e}`, '#d63e3e'))
        }
        try {
            const { resumoConteudo } = await import('../lib/conteudo.js')
            registrarBootConteudo(resumoConteudo())
        } catch {
            registrarBootConteudo({})
        }
    } catch(err){
        consoleErro(err, "Inicialização")
        c.end(new Error("erro_geral"))
    }
}

export const receberMensagem = async (c, mensagem, botInfo)=>{
    try{
        const rawWa = mensagem.messages[0]
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

        const tipoMensagem = getContentType(rawWa.message)
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

        // Baileys 7: msgs offline chegam como "append"; "notify" = online.
        // Ignorar append fazia o bot “não responder nenhum comando” (comum em VPS/Linux).
        const tipoUpsert = mensagem.type
        if (tipoUpsert !== 'notify' && tipoUpsert !== 'append') return

        const grupos = new GrupoControle()
        const mensagemBaileys = await converterMensagem(mensagem, botInfo)
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
        await chamadaComando(c, mensagemBaileys, botInfo)
    } catch(err){
        consoleErro(err, "MESSAGES.UPSERT")
        // Não derruba a conexão por erro de comando/mensagem
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
    try{
        //Obtendo dados dos grupos
        const dadosGrupos = await socket.obterTodosGrupos(c)
        //Se não houver grupos retorne
        if(dadosGrupos.length){
            const grupos = new GrupoControle()
            await grupos.registrarGruposAoIniciar(dadosGrupos)
            await grupos.atualizarDadosGruposInicio(dadosGrupos)
            await grupos.verificarListaNegraGeral(c, dadosGrupos, botInfo)
            await grupos.atualizarContagemGrupos(dadosGrupos)
        }

        try {
            const { registrarBootGrupos, bootPronto } = await import('../lib/boot.js')
            registrarBootGrupos(dadosGrupos?.length || 0)
            bootPronto()
        } catch {
            console.log(corTexto('Online', false))
        }
        return true
    } catch(err){
        consoleErro(err, "GROUPS.UPDATE")
        // Mesmo com falha nos grupos, liberar o processamento de mensagens/comandos
        try {
            const { bootPronto } = await import('../lib/boot.js')
            bootPronto()
        } catch {
            console.log(corTexto('Online', false))
        }
        return true
    }
}

export const realizarEventosEspera = async(c, eventosEsperando)=>{
    for(let ev of eventosEsperando) c.ev.emit(ev.evento, ev.dados)
}

export const atualizacaoDadosGrupo = async (dadosGrupo)=>{
    try{
        await new GrupoControle().atualizarDadosGrupoParcial(dadosGrupo)
    } catch(err){
        consoleErro(err, "GROUPS.UPDATE")
    }
}



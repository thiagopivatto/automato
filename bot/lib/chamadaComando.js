//REQUERINDO MODULOS
import {criarTexto, consoleComando, consoleErro} from './util.js'
import * as socket from '../baileys/socket.js'
import {tiposMensagem} from '../baileys/mensagem.js'
import moment from "moment-timezone"
import {grupo as grupoComandos} from '../comandos/grupo.js'
import {utilidades as utilidadesComandos} from '../comandos/utilidades.js'
import {ia as iaComandos} from '../comandos/ia.js'
import {diversao as diversaoComandos} from '../comandos/diversao.js'
import {admin as adminComandos} from '../comandos/admin.js'
import {info as infoComandos} from '../comandos/info.js'
import {figurinhas as figurinhasComandos, autoSticker} from '../comandos/figurinhas.js'
import {downloads as downloadsComandos} from '../comandos/downloads.js'
import {comandosInfo, verificarComandoExiste, obterGuiaComando} from '../comandos/comandos.js'
import api from '@victorsouzaleal/lbot-api-comandos'
import { botFoiMencionado, limparTextoMencaoBot, processarChatIA } from './processarChat.js'
import { ofensaAtivaNoGrupo, processarOfensaAutomatica, textoPareceOfensa } from './ofensa.js'
import PQueue from 'p-queue';
const queueMensagem = new PQueue({concurrency: 10, timeout: 180000})

const enfileirar = (c, id_chat, mensagem, comando, botInfo, tarefa, prioridade = 1) => {
    queueMensagem.add(async () => {
        try {
            await tarefa()
        } catch (err) {
            consoleErro(err, `COMANDO ${comando}`)
            try {
                const comandos_info = comandosInfo(botInfo)
                await socket.responderTexto(
                    c,
                    id_chat,
                    criarTexto(comandos_info.outros.erro_comando_codigo, comando),
                    mensagem
                ).catch(()=>{})
            } catch {}
        }
    }, {priority: prioridade}).catch((err) => {
        consoleErro(err, 'FILA')
    })
}

/** Executa o handler do comando imediatamente (sem nova fila) — usado pelo !chat. */
export const executarComandoDireto = async (c, mensagemBaileys, botInfo) => {
    const { comando, args, mensagem_grupo, id_chat, mensagem, nome_usuario, grupo } = mensagemBaileys
    const { nome: nome_grupo } = { ...grupo }
    const t = moment.now()
    const msgGuia = args?.length && args[0] === 'guia'

    const rodar = async (cat, handler, cor) => {
        if (msgGuia) return await socket.responderTexto(c, id_chat, obterGuiaComando(cat, comando, botInfo), mensagem)
        await handler(c, mensagemBaileys, botInfo)
        consoleComando(mensagem_grupo, cat.toUpperCase(), comando, cor, t, nome_usuario, nome_grupo)
    }

    if (verificarComandoExiste(botInfo, comando, 'utilidades')) await rodar('utilidades', utilidadesComandos, '#de9a07')
    else if (verificarComandoExiste(botInfo, comando, 'ia')) await rodar('ia', iaComandos, '#7c4dff')
    else if (verificarComandoExiste(botInfo, comando, 'figurinhas')) await rodar('figurinhas', figurinhasComandos, '#ae45d1')
    else if (verificarComandoExiste(botInfo, comando, 'downloads')) await rodar('downloads', downloadsComandos, '#2195cf')
    else if (verificarComandoExiste(botInfo, comando, 'grupo')) await rodar('grupo', grupoComandos, '#e0e031')
    else if (verificarComandoExiste(botInfo, comando, 'diversao')) await rodar('diversao', diversaoComandos, '#22e3dd')
    else if (verificarComandoExiste(botInfo, comando, 'admin')) await rodar('admin', adminComandos, '#d1d1d1')
    else if (verificarComandoExiste(botInfo, comando, 'info')) await rodar('info', infoComandos, '#8ac46e')
    else throw { erro: `Não encontrei o comando ${comando} para executar.` }
}

export const chamadaComando = async (c, mensagemBaileys, botInfo) => {
    try {
        //Atribuição de valores
        const comandos_info = comandosInfo(botInfo)
        const {
            comando,
            args,
            mensagem_grupo,
            tipo,
            mensagem,
            id_chat,
            nome_usuario,
            grupo,
            remetente,
            corpo,
            mensagem_bot
        } = mensagemBaileys
        const {nome : nome_grupo} = {...grupo}
        const {prefixo} = botInfo
        const t = moment.now()
        const msgGuia = (!args.length) ? false : args[0] === "guia"
        const queueMensagemEspera = queueMensagem.size > 15

        //Verificação do Auto-Sticker
        const autoStickerPv = (!mensagem_grupo && (tipo == tiposMensagem.imagem || tipo == tiposMensagem.video) && botInfo.autosticker)
        const autoStickerGrupo = (mensagem_grupo && (tipo == tiposMensagem.imagem || tipo == tiposMensagem.video) && grupo?.autosticker)

        // Auto-Simi: responde mensagens de texto sem comando quando ativado no grupo
        const textoSimi = (corpo || mensagemBaileys.texto_recebido || '').trim()
        const ehComando = verificarComandoExiste(botInfo, comando)
        const botMarcado =
            mensagem_grupo &&
            !mensagem_bot &&
            !ehComando &&
            (tipo == tiposMensagem.texto ||
                tipo == tiposMensagem.textoExt ||
                tipo == tiposMensagem.imagem) &&
            botFoiMencionado(mensagemBaileys.mencionados, botInfo) &&
            !String(comando || '').startsWith(prefixo) &&
            !textoSimi.startsWith(prefixo)
        const textoChatMencao = botMarcado ? limparTextoMencaoBot(textoSimi, botInfo) : ''
        const autoSimiGrupo =
            mensagem_grupo &&
            !mensagem_bot &&
            grupo?.autosimi &&
            !ehComando &&
            !botMarcado &&
            (tipo == tiposMensagem.texto || tipo == tiposMensagem.textoExt) &&
            textoSimi.length > 0 &&
            !String(comando || '').startsWith(prefixo) &&
            !textoSimi.startsWith(prefixo)

        const autoOfensaGrupo =
            mensagem_grupo &&
            !mensagem_bot &&
            ofensaAtivaNoGrupo(grupo) &&
            !ehComando &&
            !botMarcado &&
            (tipo == tiposMensagem.texto || tipo == tiposMensagem.textoExt) &&
            textoPareceOfensa(textoSimi) &&
            !String(comando || '').startsWith(prefixo) &&
            !textoSimi.startsWith(prefixo)

        //Verificação se há mensagens em espera na fila
        if(queueMensagemEspera) await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.fila_comando, queueMensagem.size), mensagem)
        
        //Chamadas de comandos
        if(verificarComandoExiste(botInfo, comando, 'utilidades')){
            enfileirar(c, id_chat, mensagem, comando, botInfo, async()=>{
                if(msgGuia) return await socket.responderTexto(c,id_chat, obterGuiaComando("utilidades", comando, botInfo), mensagem)
                await utilidadesComandos(c, mensagemBaileys, botInfo)
                consoleComando(mensagem_grupo, "UTILIDADES", comando, "#de9a07", t, nome_usuario, nome_grupo)
            }, 1)
        } else if(verificarComandoExiste(botInfo, comando, 'ia')){
            enfileirar(c, id_chat, mensagem, comando, botInfo, async()=>{
                if(msgGuia) return await socket.responderTexto(c, id_chat, obterGuiaComando("ia", comando, botInfo), mensagem)
                await iaComandos(c, mensagemBaileys, botInfo)
                consoleComando(mensagem_grupo, "IA", comando, "#7c4dff", t, nome_usuario, nome_grupo)
            }, 1)
        }  else if(verificarComandoExiste(botInfo, comando, 'figurinhas')){
            enfileirar(c, id_chat, mensagem, comando, botInfo, async()=>{
                if(msgGuia) return await socket.responderTexto(c,id_chat, obterGuiaComando("figurinhas", comando, botInfo), mensagem)
                await figurinhasComandos(c, mensagemBaileys, botInfo)
                consoleComando(mensagem_grupo, "FIGURINHAS", comando, "#ae45d1", t, nome_usuario, nome_grupo)
            }, 2)
        } else if(verificarComandoExiste(botInfo, comando, 'downloads')){
            enfileirar(c, id_chat, mensagem, comando, botInfo, async()=>{
                if(msgGuia) return await socket.responderTexto(c, id_chat, obterGuiaComando("downloads", comando, botInfo), mensagem)
                await downloadsComandos(c, mensagemBaileys, botInfo)
                consoleComando(mensagem_grupo, "DOWNLOADS", comando, "#2195cf", t, nome_usuario, nome_grupo)
            }, 1)
        } else if (verificarComandoExiste(botInfo, comando, 'grupo')){
            enfileirar(c, id_chat, mensagem, comando, botInfo, async()=>{
                if(msgGuia) return await socket.responderTexto(c, id_chat, obterGuiaComando("grupo", comando, botInfo), mensagem)
                await grupoComandos(c, mensagemBaileys, botInfo)
                if(mensagem_grupo) consoleComando(mensagem_grupo, "ADMINISTRAÇÃO", comando, "#e0e031", t, nome_usuario, nome_grupo)
            }, 3)
        } else if(verificarComandoExiste(botInfo, comando, 'diversao')){
            enfileirar(c, id_chat, mensagem, comando, botInfo, async()=>{
                if(msgGuia) return await socket.responderTexto(c, id_chat, obterGuiaComando("diversao", comando, botInfo), mensagem)
                await diversaoComandos(c, mensagemBaileys, botInfo)
                consoleComando(mensagem_grupo, "DIVERSÃO", comando, "#22e3dd", t, nome_usuario, nome_grupo)
            }, 2)
        } else if(verificarComandoExiste(botInfo, comando, 'admin')){
            enfileirar(c, id_chat, mensagem, comando, botInfo, async()=>{
                if(msgGuia) return await socket.responderTexto(c, id_chat, obterGuiaComando("admin", comando, botInfo), mensagem)
                await adminComandos(c, mensagemBaileys, botInfo)
                consoleComando(mensagem_grupo, "DONO", comando, "#d1d1d1", t, nome_usuario, nome_grupo)
            }, 4)
        } else if(verificarComandoExiste(botInfo, comando, 'info')){
            enfileirar(c, id_chat, mensagem, comando, botInfo, async()=>{
                if(msgGuia) return await socket.responderTexto(c, id_chat, obterGuiaComando("info", comando, botInfo), mensagem)
                await infoComandos(c, mensagemBaileys, botInfo)
                consoleComando(mensagem_grupo, "INFO", comando, "#8ac46e", t, nome_usuario, nome_grupo)
            }, 3)
        } else if(autoStickerPv || autoStickerGrupo){
            enfileirar(c, id_chat, mensagem, "AUTO-STICKER", botInfo, async()=>{
                await autoSticker(c, mensagemBaileys, botInfo)
                consoleComando(mensagem_grupo, "FIGURINHAS", "AUTO-STICKER", "#ae45d1", t, nome_usuario, nome_grupo)
            }, 2)
        } else if (botMarcado) {
            // @bot → mesmo fluxo do !chat (sempre ativo; não precisa de flag no grupo)
            enfileirar(c, id_chat, mensagem, "AUTO-CHAT", botInfo, async()=>{
                try {
                    await processarChatIA(c, mensagemBaileys, botInfo, textoChatMencao)
                    consoleComando(mensagem_grupo, "UTILIDADES", "AUTO-CHAT", "#de9a07", t, nome_usuario, nome_grupo)
                } catch (err) {
                    const msg = err?.erro || err?.message || 'erro no chat'
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, '@chat', msg), mensagem).catch(()=>{})
                }
            }, 4)
        } else if (autoOfensaGrupo) {
            enfileirar(c, id_chat, mensagem, "AUTO-OFENSA", botInfo, async()=>{
                const respondeu = await processarOfensaAutomatica(c, mensagemBaileys, botInfo)
                if (respondeu) {
                    consoleComando(mensagem_grupo, "DIVERSÃO", "AUTO-OFENSA", "#c62828", t, nome_usuario, nome_grupo)
                    return
                }
                // Se não era ofensa e autosimi está on, cai no simi
                if (autoSimiGrupo) {
                    const { resultado } = await api.IA.obterRespostaSimi(textoSimi, remetente)
                    await socket.responderTexto(c, id_chat, resultado, mensagem)
                    consoleComando(mensagem_grupo, "DIVERSÃO", "AUTO-SIMI", "#22e3dd", t, nome_usuario, nome_grupo)
                }
            }, 2)
        } else if (autoSimiGrupo) {
            enfileirar(c, id_chat, mensagem, "AUTO-SIMI", botInfo, async()=>{
                const { resultado } = await api.IA.obterRespostaSimi(textoSimi, remetente)
                await socket.responderTexto(c, id_chat, resultado, mensagem)
                consoleComando(mensagem_grupo, "DIVERSÃO", "AUTO-SIMI", "#22e3dd", t, nome_usuario, nome_grupo)
            }, 2)
        }

    } catch (err) {
        err.message = `chamadaComando - ${err.message}`
        consoleErro(err, "CHAMADA")
        try {
            const { id_chat, mensagem, comando } = mensagemBaileys
            const comandos_info = comandosInfo(botInfo)
            await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_comando_codigo, comando || '!'), mensagem).catch(()=>{})
        } catch {}
    }
}

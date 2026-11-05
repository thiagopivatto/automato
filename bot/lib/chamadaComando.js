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
import {
    botFoiMencionado,
    limparTextoMencaoBot,
    processarChatIA,
    citacaoEhDoBot
} from './processarChat.js'
import { ofensaAtivaNoGrupo, processarOfensaAutomatica, textoPareceOfensa } from './ofensa.js'
import { enfileirarPorChat, profundidadeFila } from './filaComandos.js'
import { incrMetrica, logErro } from './logger.js'
import { BotControle } from '../controles/BotControle.js'
import { UsuarioControle } from '../controles/UsuarioControle.js'
import {
    reagirAckInicio,
    reagirAckOk,
    reagirAckErro,
    comandoSemReacaoAck
} from './reacoes.js'

const enfileirar = (c, id_chat, mensagem, comando, botInfo, tarefa, prioridade = 1, opts = {}) => {
    const { contar = false, remetente = null, contagemDiaria = false } = opts
    const comReacao = !comandoSemReacaoAck(comando, botInfo?.prefixo)
    enfileirarPorChat(
        id_chat,
        async () => {
            if (comReacao) await reagirAckInicio(c, mensagem).catch(() => {})
            try {
                incrMetrica('cmds')
                await tarefa()
                incrMetrica('cmds_ok')
                if (comReacao) await reagirAckOk(c, mensagem).catch(() => {})
                if (contar && remetente) {
                    const usuarios = new UsuarioControle()
                    if (contagemDiaria) await usuarios.adicionarContagemDiariaComandos(remetente)
                    else await usuarios.adicionarContagemTotalComandos(remetente)
                    await new BotControle().atualizarComandosFeitos()
                }
            } catch (err) {
                incrMetrica('cmds_erro')
                if (comReacao) await reagirAckErro(c, mensagem).catch(() => {})
                consoleErro(err, `COMANDO ${comando}`)
                logErro('comando falhou', err, { comando, chat: id_chat })
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
        },
        { prioridade, rotulo: comando }
    ).catch((err) => {
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

        // fromMe / eco do próprio bot: nunca executa comando nem auto-handlers
        if (mensagem_bot || mensagemBaileys.fromMe) {
            return
        }

        const profundidade = profundidadeFila()
        const queueMensagemEspera = profundidade.global > 15 || profundidade.chatJobs > 20

        //Verificação do Auto-Sticker
        const autoStickerPv = (!mensagem_grupo && (tipo == tiposMensagem.imagem || tipo == tiposMensagem.video) && botInfo.autosticker)
        const autoStickerGrupo = (mensagem_grupo && (tipo == tiposMensagem.imagem || tipo == tiposMensagem.video) && grupo?.autosticker)

        const textoSimi = (corpo || mensagemBaileys.texto_recebido || '').trim()
        const ehComando = verificarComandoExiste(botInfo, comando)
        const tipoTextoOuImg =
            tipo == tiposMensagem.texto ||
            tipo == tiposMensagem.textoExt ||
            tipo == tiposMensagem.imagem
        const textoSolto =
            !mensagem_bot &&
            !ehComando &&
            tipoTextoOuImg &&
            textoSimi.length >= 2 &&
            !String(comando || '').startsWith(prefixo) &&
            !textoSimi.startsWith(prefixo)
        let pedidoSolto = false
        if (textoSolto) {
            if (!mensagem_grupo) pedidoSolto = true
            else {
                const { textoMereceResposta } = await import('../../vendor/lbot-api-comandos/api/ia.js')
                pedidoSolto = textoMereceResposta(textoSimi)
            }
        }
        const botMarcado =
            mensagem_grupo &&
            !mensagem_bot &&
            !ehComando &&
            tipoTextoOuImg &&
            botFoiMencionado(mensagemBaileys.mencionados, botInfo) &&
            !String(comando || '').startsWith(prefixo) &&
            !textoSimi.startsWith(prefixo)

        let citouBot = false
        if (
            !mensagem_bot &&
            !ehComando &&
            tipoTextoOuImg &&
            !botMarcado &&
            mensagemBaileys.mensagem_citada &&
            !String(comando || '').startsWith(prefixo) &&
            !textoSimi.startsWith(prefixo)
        ) {
            try {
                citouBot = await citacaoEhDoBot(mensagemBaileys, botInfo)
            } catch {
                citouBot = false
            }
        }

        const textoChatMencao = botMarcado
            ? limparTextoMencaoBot(textoSimi, botInfo)
            : citouBot || pedidoSolto
              ? textoSimi
              : ''
        const autoChat =
            (botMarcado || citouBot || pedidoSolto) &&
            !mensagem_bot &&
            !ehComando

        const autoOfensaGrupo =
            mensagem_grupo &&
            !mensagem_bot &&
            ofensaAtivaNoGrupo(grupo) &&
            !ehComando &&
            !autoChat &&
            (tipo == tiposMensagem.texto || tipo == tiposMensagem.textoExt) &&
            textoPareceOfensa(textoSimi) &&
            !String(comando || '').startsWith(prefixo) &&
            !textoSimi.startsWith(prefixo)

        if (queueMensagemEspera) {
            await socket.responderTexto(
                c,
                id_chat,
                criarTexto(comandos_info.outros.fila_comando, profundidade.global),
                mensagem
            )
        }

        const contarOpts = mensagemBaileys._contarPosSucesso
            ? {
                  contar: true,
                  remetente,
                  contagemDiaria: !!mensagemBaileys._contagemDiaria
              }
            : {}

        // Prioridade: 1 comando 2 @bot/reply-bot 3 ofensa 4 autosticker
        if(verificarComandoExiste(botInfo, comando, 'utilidades')){
            enfileirar(c, id_chat, mensagem, comando, botInfo, async()=>{
                if(msgGuia) return await socket.responderTexto(c,id_chat, obterGuiaComando("utilidades", comando, botInfo), mensagem)
                await utilidadesComandos(c, mensagemBaileys, botInfo)
                const tm = mensagemBaileys._chatTiming
                const detalheChat = tm
                    ? `[pre=${(tm.pre / 1000).toFixed(1)} web=${(tm.web / 1000).toFixed(1)} cascade=${(tm.cascade / 1000).toFixed(1)}${tm.vision ? ` vision=${(tm.vision / 1000).toFixed(1)}` : ''}]`
                    : ''
                consoleComando(mensagem_grupo, "UTILIDADES", comando, "#de9a07", t, nome_usuario, nome_grupo, detalheChat)
            }, 1, contarOpts)
        } else if(verificarComandoExiste(botInfo, comando, 'ia')){
            enfileirar(c, id_chat, mensagem, comando, botInfo, async()=>{
                if(msgGuia) return await socket.responderTexto(c, id_chat, obterGuiaComando("ia", comando, botInfo), mensagem)
                await iaComandos(c, mensagemBaileys, botInfo)
                consoleComando(mensagem_grupo, "IA", comando, "#7c4dff", t, nome_usuario, nome_grupo)
            }, 1, contarOpts)
        }  else if(verificarComandoExiste(botInfo, comando, 'figurinhas')){
            enfileirar(c, id_chat, mensagem, comando, botInfo, async()=>{
                if(msgGuia) return await socket.responderTexto(c,id_chat, obterGuiaComando("figurinhas", comando, botInfo), mensagem)
                await figurinhasComandos(c, mensagemBaileys, botInfo)
                consoleComando(mensagem_grupo, "FIGURINHAS", comando, "#ae45d1", t, nome_usuario, nome_grupo)
            }, 2, contarOpts)
        } else if(verificarComandoExiste(botInfo, comando, 'downloads')){
            enfileirar(c, id_chat, mensagem, comando, botInfo, async()=>{
                if(msgGuia) return await socket.responderTexto(c, id_chat, obterGuiaComando("downloads", comando, botInfo), mensagem)
                await downloadsComandos(c, mensagemBaileys, botInfo)
                consoleComando(mensagem_grupo, "DOWNLOADS", comando, "#2195cf", t, nome_usuario, nome_grupo)
            }, 1, contarOpts)
        } else if (verificarComandoExiste(botInfo, comando, 'grupo')){
            enfileirar(c, id_chat, mensagem, comando, botInfo, async()=>{
                if(msgGuia) return await socket.responderTexto(c, id_chat, obterGuiaComando("grupo", comando, botInfo), mensagem)
                await grupoComandos(c, mensagemBaileys, botInfo)
                if(mensagem_grupo) consoleComando(mensagem_grupo, "ADMINISTRAÇÃO", comando, "#e0e031", t, nome_usuario, nome_grupo)
            }, 3, contarOpts)
        } else if(verificarComandoExiste(botInfo, comando, 'diversao')){
            enfileirar(c, id_chat, mensagem, comando, botInfo, async()=>{
                if(msgGuia) return await socket.responderTexto(c, id_chat, obterGuiaComando("diversao", comando, botInfo), mensagem)
                await diversaoComandos(c, mensagemBaileys, botInfo)
                consoleComando(mensagem_grupo, "DIVERSÃO", comando, "#22e3dd", t, nome_usuario, nome_grupo)
            }, 2, contarOpts)
        } else if(verificarComandoExiste(botInfo, comando, 'admin')){
            enfileirar(c, id_chat, mensagem, comando, botInfo, async()=>{
                if(msgGuia) return await socket.responderTexto(c, id_chat, obterGuiaComando("admin", comando, botInfo), mensagem)
                await adminComandos(c, mensagemBaileys, botInfo)
                consoleComando(mensagem_grupo, "DONO", comando, "#d1d1d1", t, nome_usuario, nome_grupo)
            }, 4, contarOpts)
        } else if(verificarComandoExiste(botInfo, comando, 'info')){
            enfileirar(c, id_chat, mensagem, comando, botInfo, async()=>{
                if(msgGuia) return await socket.responderTexto(c, id_chat, obterGuiaComando("info", comando, botInfo), mensagem)
                await infoComandos(c, mensagemBaileys, botInfo)
                consoleComando(mensagem_grupo, "INFO", comando, "#8ac46e", t, nome_usuario, nome_grupo)
            }, 3, contarOpts)
        } else if (autoChat) {
            enfileirar(c, id_chat, mensagem, citouBot ? 'AUTO-CHAT-REPLY' : 'AUTO-CHAT', botInfo, async()=>{
                try {
                    await processarChatIA(c, mensagemBaileys, botInfo, textoChatMencao)
                    const tm = mensagemBaileys._chatTiming
                    const detalhe = tm
                        ? `[pre=${(tm.pre / 1000).toFixed(1)} web=${(tm.web / 1000).toFixed(1)} cascade=${(tm.cascade / 1000).toFixed(1)}${tm.vision ? ` vision=${(tm.vision / 1000).toFixed(1)}` : ''}]`
                        : ''
                    consoleComando(
                        mensagem_grupo,
                        'UTILIDADES',
                        citouBot ? 'AUTO-CHAT-REPLY' : 'AUTO-CHAT',
                        '#de9a07',
                        t,
                        nome_usuario,
                        nome_grupo,
                        detalhe
                    )
                } catch (err) {
                    incrMetrica('ia_erro')
                    const { responderLocalUltron } = await import('../../vendor/lbot-api-comandos/api/resposta-local-chat.js')
                    const { precisaPesquisaWeb } = await import('../../vendor/lbot-api-comandos/api/ia.js')
                    await socket.responderTexto(
                        c,
                        id_chat,
                        responderLocalUltron(textoChatMencao, {
                            ehDono: !!mensagemBaileys.mensagem_dono,
                            factual: precisaPesquisaWeb(textoChatMencao)
                        }),
                        mensagem
                    ).catch(()=>{})
                    consoleErro(err, 'CHAT')
                }
            }, 4)
        } else if (autoOfensaGrupo) {
            enfileirar(c, id_chat, mensagem, "AUTO-OFENSA", botInfo, async()=>{
                const respondeu = await processarOfensaAutomatica(c, mensagemBaileys, botInfo)
                if (respondeu) {
                    consoleComando(mensagem_grupo, "DIVERSÃO", "AUTO-OFENSA", "#c62828", t, nome_usuario, nome_grupo)
                }
            }, 2)
        } else if(autoStickerPv || autoStickerGrupo){
            enfileirar(c, id_chat, mensagem, "AUTO-STICKER", botInfo, async()=>{
                await autoSticker(c, mensagemBaileys, botInfo)
                consoleComando(mensagem_grupo, "FIGURINHAS", "AUTO-STICKER", "#ae45d1", t, nome_usuario, nome_grupo)
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

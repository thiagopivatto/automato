//REQUERINDO MÓDULOS
import * as menu from '../lib/menu.js'
import {criarTexto, erroComandoMsg, timestampParaData, consoleErro, versaoAtual, mencaoNumero} from '../lib/util.js'
import * as socket from '../baileys/socket.js'
import {GrupoControle} from '../controles/GrupoControle.js'
import {UsuarioControle} from '../controles/UsuarioControle.js'
import {tiposMensagem} from '../baileys/mensagem.js'
import {comandosInfo} from '../comandos/comandos.js'
import { despacharMapa } from './registro.js'

async function cmdInfo(ctx) {
    const { c, mensagemBaileys, botInfo, comandos_info, numero_dono } = ctx
    const { numero_bot, nome_bot, nome_adm } = botInfo
    const { mensagem, id_chat } = mensagemBaileys
    let version = versaoAtual()
    let infoBot = botInfo
    let botInicializacaoData = timestampParaData(infoBot.iniciado)
    let resposta = criarTexto(
        comandos_info.info.info.msgs.resposta,
        nome_adm?.trim(),
        nome_bot?.trim(),
        botInicializacaoData,
        infoBot.cmds_executados,
        mencaoNumero(numero_dono),
        version
    )
    await socket
        .obterFotoPerfil(c, numero_bot)
        .then(async (botFotoURL) => {
            await socket.responderArquivoUrl(c, tiposMensagem.imagem, id_chat, botFotoURL, resposta, mensagem)
        })
        .catch(async () => {
            await socket.responderTexto(c, id_chat, resposta, mensagem)
        })
}

async function cmdReportar(ctx) {
    const { c, mensagemBaileys, botInfo, comandos_info, numero_dono } = ctx
    const { comando, args, texto_recebido, nome_usuario, remetente, mensagem, id_chat } = mensagemBaileys
    if (!args.length) return socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
    if (!numero_dono) return socket.responderTexto(c, id_chat, comandos_info.info.reportar.msgs.erro, mensagem)
    let usuarioMensagem = texto_recebido
    let resposta = criarTexto(
        comandos_info.info.reportar.msgs.resposta,
        nome_usuario,
        mencaoNumero(remetente),
        usuarioMensagem
    )
    await socket.enviarTexto(c, numero_dono, resposta)
    await socket.responderTexto(c, id_chat, comandos_info.info.reportar.msgs.sucesso, mensagem)
}

async function cmdSugerir(ctx) {
    const { c, mensagemBaileys, botInfo, numero_dono } = ctx
    const { args, texto_recebido, nome_usuario, remetente, mensagem, id_chat } = mensagemBaileys
    const { prefixo } = botInfo
    if (!args.length) {
        return await socket.responderTexto(
            c,
            id_chat,
            `Ex: *${prefixo}sugerir* adicionar comando X\nOu: *${prefixo}sugerir* corrigir o Y`,
            mensagem
        )
    }
    const { Sugestao } = await import('../modelos/Sugestao.js')
    const sugestoes = new Sugestao()
    await sugestoes.adicionar({
        id_usuario: remetente,
        nome_usuario,
        texto: texto_recebido,
        id_chat
    })
    await socket.responderTexto(c, id_chat, '✅ Sugestão enviada! O dono do bot poderá ver na lista.', mensagem)
    if (numero_dono) {
        try {
            await socket.enviarTexto(
                c,
                numero_dono,
                `💡 *Nova sugestão*\nDe: ${nome_usuario}\nContato: ${String(remetente).replace(/@.*/, '')}\n\n${texto_recebido.slice(0, 800)}`
            )
        } catch { /* ignore */ }
    }
}

async function cmdMeusDados(ctx) {
    const { c, mensagemBaileys, botInfo, comandos_info, usuarios, grupos } = ctx
    const { remetente, nome_usuario, mensagem, id_chat, mensagem_grupo, mensagem_dono } = mensagemBaileys
    let dadosUsuario = await usuarios.obterDadosUsuario(remetente)
    if (!dadosUsuario) {
        dadosUsuario = {
            tipo: mensagem_dono ? 'dono' : 'comum',
            nome: nome_usuario,
            comandos_total: 0,
            comandos_dia: 0
        }
    }
    if (mensagem_dono) dadosUsuario.tipo = 'dono'
    let maxComandosDia = botInfo.limite_diario.limite_tipos[dadosUsuario.tipo].comandos || 'Sem limite'
    let tipoUsuario = botInfo.limite_diario.limite_tipos[dadosUsuario.tipo].titulo
    let nomeUsuario = nome_usuario || dadosUsuario.nome || 'usuário'
    let resposta = criarTexto(
        comandos_info.info.meusdados.msgs.resposta_geral,
        tipoUsuario,
        nomeUsuario,
        dadosUsuario.comandos_total
    )
    if (botInfo.limite_diario.status) {
        resposta += criarTexto(
            comandos_info.info.meusdados.msgs.resposta_limite_diario,
            dadosUsuario.comandos_dia,
            maxComandosDia,
            maxComandosDia
        )
    }
    if (mensagem_grupo) {
        let dadosGrupo = await grupos.obterGrupoInfo(id_chat)
        if (dadosGrupo.contador.status) {
            let usuarioAtividade = await grupos.obterAtividadeParticipante(id_chat, remetente)
            resposta += criarTexto(comandos_info.info.meusdados.msgs.resposta_grupo, usuarioAtividade.msg)
        }
    }
    await socket.responderTexto(c, id_chat, resposta, mensagem)
}

async function cmdMenu(ctx) {
    const { c, mensagemBaileys, botInfo, comandos_info, usuarios } = ctx
    const { remetente, nome_usuario, mensagem_dono, id_chat } = mensagemBaileys
    let dadosUsuario = await usuarios.obterDadosUsuario(remetente)
    if (!dadosUsuario) {
        dadosUsuario = {
            tipo: mensagem_dono ? 'dono' : 'comum',
            nome: nome_usuario,
            comandos_total: 0,
            comandos_dia: 0
        }
    }
    if (mensagem_dono) dadosUsuario.tipo = 'dono'
    let maxComandosDia = botInfo.limite_diario.limite_tipos[dadosUsuario.tipo].comandos || 'Sem limite'
    let totalComandos = dadosUsuario.comandos_total || 0
    let tipoUsuario = botInfo.limite_diario.limite_tipos[dadosUsuario.tipo].titulo
    let nomeUsuario = nome_usuario || dadosUsuario.nome || 'usuário'
    let dadosResposta = ''

    if (botInfo.limite_diario.status) {
        dadosResposta = criarTexto(
            comandos_info.info.menu.msgs.resposta_limite_diario,
            nomeUsuario,
            dadosUsuario.comandos_dia,
            maxComandosDia,
            tipoUsuario,
            totalComandos
        )
    } else {
        dadosResposta = criarTexto(
            comandos_info.info.menu.msgs.resposta_comum,
            nomeUsuario,
            tipoUsuario,
            totalComandos
        )
    }

    const catalogo = menu.menuCompleto(botInfo)
    await socket.enviarTexto(c, id_chat, `${dadosResposta.trim()}\n\n${catalogo}`)
}

const HANDLERS_INFO = {
    info: cmdInfo,
    reportar: cmdReportar,
    sugerir: cmdSugerir,
    meusdados: cmdMeusDados,
    menu: cmdMenu,
    comandos: cmdMenu
}

export const info = async (c, mensagemBaileys, botInfo) => {
    const usuarios = new UsuarioControle()
    const grupos = new GrupoControle()
    const comandos_info = comandosInfo(botInfo)
    const numero_dono = await usuarios.obterIdDono()
    const { prefixo } = botInfo
    const { comando, mensagem, id_chat } = mensagemBaileys
    const comandoSemPrefixo = comando.replace(prefixo, '')

    try {
        await despacharMapa(HANDLERS_INFO, comandoSemPrefixo, {
            c,
            mensagemBaileys,
            botInfo,
            comandos_info,
            usuarios,
            grupos,
            numero_dono
        })
    } catch (err) {
        await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_comando_codigo, comando), mensagem)
        err.message = `${comando} - ${err.message}`
        consoleErro(err, 'INFO')
    }
}

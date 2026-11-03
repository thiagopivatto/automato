/**
 * Sorteios / rankings que marcam membros (bot excluído).
 */
import { criarTexto, mencaoNumero, sortearMembros, participantesSemBot } from '../../lib/util.js'
import * as socket from '../../baileys/socket.js'

export async function casal(ctx) {
    const { c, id_chat, grupo, numero_bot, comandos_info, mensagem, mensagem_grupo } = ctx
    if (!mensagem_grupo) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.grupo, mensagem)
    const bots = Array.isArray(numero_bot) ? numero_bot : [numero_bot]
    const idParticipantesAtuais = participantesSemBot(grupo.participantes, ...bots)
    if (idParticipantesAtuais.length < 2) {
        return await socket.responderTexto(c, id_chat, comandos_info.diversao.casal.msgs.minimo, mensagem)
    }
    const [pessoaEscolhida1, pessoaEscolhida2] = sortearMembros(idParticipantesAtuais, 2)
    const respostaTexto = criarTexto(
        comandos_info.diversao.casal.msgs.resposta,
        mencaoNumero(pessoaEscolhida1),
        mencaoNumero(pessoaEscolhida2)
    )
    await socket.enviarTextoComMencoes(c, id_chat, respostaTexto, [pessoaEscolhida1, pessoaEscolhida2])
}

export async function trisal(ctx) {
    const { c, id_chat, grupo, numero_bot, comandos_info, mensagem, mensagem_grupo } = ctx
    if (!mensagem_grupo) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.grupo, mensagem)
    const bots = Array.isArray(numero_bot) ? numero_bot : [numero_bot]
    const idParticipantesAtuais = participantesSemBot(grupo.participantes, ...bots)
    const msgMinimo =
        comandos_info.diversao.trisal?.msgs?.minimo ||
        comandos_info.diversao.trisal?.minimo ||
        'Precisa de pelo menos 3 membros.'
    if (idParticipantesAtuais.length < 3) return await socket.responderTexto(c, id_chat, msgMinimo, mensagem)
    const [a, b, d] = sortearMembros(idParticipantesAtuais, 3)
    const respostaTexto = criarTexto(
        comandos_info.diversao.trisal.msgs.resposta,
        mencaoNumero(a),
        mencaoNumero(b),
        mencaoNumero(d)
    )
    await socket.enviarTextoComMencoes(c, id_chat, respostaTexto, [a, b, d])
}

export async function top(ctx) {
    const {
        c,
        id_chat,
        grupo,
        numero_bot,
        comandos_info,
        mensagem,
        mensagem_grupo,
        args,
        texto_recebido,
        comando,
        botInfo,
        erroComandoMsg
    } = ctx
    if (!mensagem_grupo) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.grupo, mensagem)
    if (args.length === 1) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)

    const qtdUsuarios = parseInt(args[0])
    const temaRanking = texto_recebido.slice(1 + args[0].length).trim()
    const bots = Array.isArray(numero_bot) ? numero_bot : [numero_bot]
    const idParticipantesAtuais = participantesSemBot(grupo.participantes, ...bots)

    if (isNaN(qtdUsuarios)) {
        return await socket.responderTexto(c, id_chat, comandos_info.diversao.top.msgs.erro_qtd, mensagem)
    }
    if (qtdUsuarios > 200) {
        return await socket.responderTexto(c, id_chat, comandos_info.diversao.top.msgs.limite_qtd, mensagem)
    }
    if (qtdUsuarios > idParticipantesAtuais.length || idParticipantesAtuais.length === 0) {
        return await socket.responderTexto(c, id_chat, comandos_info.diversao.top.msgs.erro_qtd, mensagem)
    }

    let respostaTexto = criarTexto(comandos_info.diversao.top.msgs.resposta_titulo, qtdUsuarios, temaRanking)
    const mencionarMembros = sortearMembros(idParticipantesAtuais, qtdUsuarios)

    for (let i = 0; i < mencionarMembros.length; i++) {
        let medalha = ''
        switch (i + 1) {
            case 1:
                medalha = '🥇'
                break
            case 2:
                medalha = '🥈'
                break
            case 3:
                medalha = '🥉'
                break
            default:
                medalha = ''
        }
        respostaTexto += criarTexto(
            comandos_info.diversao.top.msgs.resposta_itens,
            medalha,
            i + 1,
            mencaoNumero(mencionarMembros[i])
        )
    }
    await socket.enviarTextoComMencoes(c, id_chat, respostaTexto, mencionarMembros)
}

export async function sortear(ctx) {
    const { c, id_chat, grupo, numero_bot, mensagem, mensagem_grupo, comandos_info } = ctx
    if (!mensagem_grupo) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.grupo, mensagem)
    const bots = Array.isArray(numero_bot) ? numero_bot : [numero_bot]
    const idParticipantesAtuais = participantesSemBot(grupo.participantes, ...bots)
    if (idParticipantesAtuais.length == 0) {
        return await socket.responderTexto(c, id_chat, 'Não há membros para sortear.', mensagem)
    }
    const [sorteado] = sortearMembros(idParticipantesAtuais, 1)
    await socket.enviarTextoComMencoes(
        c,
        id_chat,
        `🎲 *Sorteio*\nO membro sorteado foi: @${mencaoNumero(sorteado)}`,
        [sorteado]
    )
}

export const handlersSorteios = {
    casal,
    trisal,
    top,
    sortear
}

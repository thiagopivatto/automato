/**
 * Comandos de marcação em massa no grupo (mt / mm / mta / rt).
 * O bot nunca entra na lista de menções.
 */
import { criarTexto, participantesSemBot } from '../../lib/util.js'
import * as socket from '../../baileys/socket.js'

export async function marcarTodos(ctx) {
    const { c, id_chat, participantes, numero_bot, texto_recebido, comandos_info } = ctx
    const bots = Array.isArray(numero_bot) ? numero_bot : [numero_bot]
    const alvoMt = participantesSemBot(participantes, ...bots)
    const usuarioTexto = texto_recebido
    const respostaMarcar =
        usuarioTexto.length > 0
            ? criarTexto(comandos_info.grupo.mt.msgs.resposta_motivo, alvoMt.length, usuarioTexto)
            : criarTexto(comandos_info.grupo.mt.msgs.resposta, alvoMt.length)
    await socket.enviarTextoComMencoes(c, id_chat, respostaMarcar, alvoMt)
}

export async function marcarMembros(ctx) {
    const { c, id_chat, participantes, numero_bot, admins, texto_recebido, comandos_info, mensagem } = ctx
    const membrosMarcados = []
    const bots = Array.isArray(numero_bot) ? numero_bot : [numero_bot]
    for (const membro of participantesSemBot(participantes, ...bots)) {
        if (!admins.includes(membro)) membrosMarcados.push(membro)
    }
    if (membrosMarcados.length == 0) {
        return await socket.responderTexto(c, id_chat, comandos_info.grupo.mm.msgs.sem_membros, mensagem)
    }
    const usuarioTexto = texto_recebido
    const respostaMarcar =
        usuarioTexto.length > 0
            ? criarTexto(comandos_info.grupo.mm.msgs.resposta_motivo, membrosMarcados.length, usuarioTexto)
            : criarTexto(comandos_info.grupo.mm.msgs.resposta, membrosMarcados.length)
    await socket.enviarTextoComMencoes(c, id_chat, respostaMarcar, membrosMarcados)
}

/** mta / rt — menção anônima a todos (exceto o bot). */
export async function marcarTodosAnonimo(ctx) {
    const {
        c,
        id_chat,
        participantes,
        numero_bot,
        texto_recebido,
        comandoSemPrefixo,
        mensagem_citada,
        citacao
    } = ctx
    let respostaMarcar = '*ATENÇÃO!*'
    if (comandoSemPrefixo === 'rt' && mensagem_citada) {
        respostaMarcar = citacao?.corpo || citacao?.legenda || texto_recebido.trim() || '*ATENÇÃO!*'
    } else if (texto_recebido.trim().length > 0) {
        respostaMarcar = texto_recebido.trim()
    }
    const porNumero = new Map()
    const bots = Array.isArray(numero_bot) ? numero_bot : [numero_bot]
    for (const jid of participantesSemBot(participantes, ...bots)) {
        const num = String(jid).split('@')[0]
        const atual = porNumero.get(num)
        if (!atual || String(jid).endsWith('@s.whatsapp.net')) porNumero.set(num, jid)
    }
    await socket.enviarTextoComMencoes(c, id_chat, respostaMarcar, [...porNumero.values()])
}

export const handlersMencoes = {
    mt: marcarTodos,
    mm: marcarMembros,
    mta: marcarTodosAnonimo,
    rt: marcarTodosAnonimo
}

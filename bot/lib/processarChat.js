/**
 * Fluxo compartilhado do chat ( !chat e @menção do bot ).
 */
import api from '@victorsouzaleal/lbot-api-comandos'
import * as socket from '../baileys/socket.js'
import { criarTexto, listaContemJid, mencaoNumero } from './util.js'
import { comandosInfo } from '../comandos/comandos.js'

/** Remove @numero/@lid do bot do texto. */
export function limparTextoMencaoBot(texto, botInfo = {}) {
    let t = String(texto || '')
    const ids = [botInfo.numero_bot, botInfo.lid_bot]
        .filter(Boolean)
        .map((j) => mencaoNumero(j))
        .filter(Boolean)
    for (const id of ids) {
        t = t.replace(new RegExp(`@${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), ' ')
    }
    return t.replace(/\s+/g, ' ').trim()
}

/** True se a mensagem marca o bot (PN ou LID). */
export function botFoiMencionado(mencionados = [], botInfo = {}) {
    return listaContemJid(mencionados || [], botInfo.numero_bot, botInfo.lid_bot)
}

async function carregarHistoricoGrupo(mensagemBaileys) {
    const { mensagem_grupo, grupo, id_chat } = mensagemBaileys
    if (!mensagem_grupo) return { historicoGrupoTexto: '', nomeGrupo: '' }
    try {
        const { historicoGrupo } = await import('../controles/HistoricoGrupoControle.js')
        const msgs = await historicoGrupo.obterUltimas(grupo?.id_grupo || id_chat, 12)
        const historicoGrupoTexto = (msgs || [])
            .map((m) => {
                const quando = m.timestamp
                    ? new Date(Number(m.timestamp)).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                    : ''
                return `${quando} ${m.nome_usuario || 'Alguém'}: ${String(m.texto || '').replace(/\s+/g, ' ').slice(0, 100)}`
            })
            .join('\n')
            .slice(0, 2200)
        return { historicoGrupoTexto, nomeGrupo: grupo?.nome || '' }
    } catch {
        return { historicoGrupoTexto: '', nomeGrupo: '' }
    }
}

/**
 * Roda o chat (roteador de comando + IA).
 * @returns {Promise<'comando'|'conversa'>}
 */
export async function processarChatIA(c, mensagemBaileys, botInfo, textoUsuario) {
    const comandos_info = comandosInfo(botInfo)
    const { remetente, mensagem, id_chat, nome_usuario } = mensagemBaileys

    let pergunta = String(textoUsuario || '').trim()

    // Visão: se veio imagem (legenda/citação), analisa e injeta no contexto
    const { contextoImagemParaChat, baixarImagemMensagem } = await import('./visao.js')
    let bufferImg = null
    try {
        bufferImg = await baixarImagemMensagem(mensagemBaileys)
    } catch {
        bufferImg = null
    }
    if (!pergunta && !bufferImg) {
        await socket.responderTexto(
            c,
            id_chat,
            'Me marca e fala o que você quer — ou usa *!chat* + texto (também dá pra mandar/marcar imagem).',
            mensagem
        )
        return 'conversa'
    }

    // "digitando..." sem esperar o ciclo completo de presença
    try {
        c.presenceSubscribe(id_chat).catch(() => {})
        c.sendPresenceUpdate('composing', id_chat).catch(() => {})
    } catch { /* */ }

    if (bufferImg) {
        const ctxImg = await contextoImagemParaChat(mensagemBaileys, pergunta)
        if (ctxImg) {
            pergunta = pergunta
                ? `${pergunta}\n\n${ctxImg}`
                : `O que tem nessa imagem?\n\n${ctxImg}`
        } else if (!pergunta) {
            pergunta = 'Descreva a imagem que eu enviei.'
        }
    }

    const { decidirAcaoChat, aplicarComandoNaMensagem } = await import('./chatRoteador.js')
    const decisao = await decidirAcaoChat(pergunta, botInfo, {
        mensagemDono: !!mensagemBaileys.mensagem_dono
    })

    if (decisao.tipo === 'comando') {
        await socket.responderTexto(
            c,
            id_chat,
            `Beleza — vou rodar *${decisao.comando}${decisao.argsTexto ? ' ' + decisao.argsTexto : ''}*.`,
            mensagem
        )
        aplicarComandoNaMensagem(mensagemBaileys, decisao.comando, decisao.argsTexto)
        const { executarComandoDireto } = await import('./chamadaComando.js')
        await executarComandoDireto(c, mensagemBaileys, botInfo)
        return 'comando'
    }

    const { historicoGrupoTexto, nomeGrupo } = await carregarHistoricoGrupo(mensagemBaileys)
    let personalidade = ''
    try {
        if (mensagemBaileys.mensagem_grupo) {
            const { GrupoControle } = await import('../controles/GrupoControle.js')
            personalidade =
                (await new GrupoControle().obterPersonalidade(
                    mensagemBaileys.grupo?.id_grupo || id_chat
                )) || ''
        }
    } catch { /* ignore */ }
    const { resultado: resultadoTexto } = await api.IA.obterRespostaIA(pergunta, remetente, id_chat, {
        historicoGrupo: historicoGrupoTexto,
        nomeGrupo,
        nomeUsuario: nome_usuario || '',
        personalidade,
        // pesquisa só quando a pergunta parece precisar de fatos atuais
        usarPesquisa: 'auto'
    })
    await socket.responderTexto(
        c,
        id_chat,
        criarTexto(comandos_info.utilidades.chat.msgs.resposta, resultadoTexto),
        mensagem
    )
    return 'conversa'
}

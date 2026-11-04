/**
 * Fluxo compartilhado do chat (!chat, @menção, resposta citando o bot).
 */
import api from '@victorsouzaleal/lbot-api-comandos'
import * as socket from '../baileys/socket.js'
import { criarTexto, listaContemJid, mencaoNumero } from './util.js'
import { comandosInfo } from '../comandos/comandos.js'
import { obterPersonalidadeChat } from './personalidadeChat.js'
import { obterMemoriaUsuarioTexto, registrarMemoriaUsuario } from './memoriaUsuario.js'

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

/** True se a mensagem cita/responde uma mensagem do bot. */
export async function citacaoEhDoBot(mensagemBaileys, botInfo = {}) {
    const cit = mensagemBaileys?.citacao
    if (!cit || !mensagemBaileys?.mensagem_citada) return false
    if (cit.do_bot) return true
    if (listaContemJid([cit.remetente], botInfo.numero_bot, botInfo.lid_bot)) return true
    // Fallback: só o bot grava envios em mensagens.db
    const stanzaId = cit.stanzaId
    if (!stanzaId) return false
    try {
        const { MensagemControle } = await import('../controles/MensagemControle.js')
        const msg = await new MensagemControle().recuperarMensagem(
            mensagemBaileys.id_chat,
            stanzaId
        )
        return !!msg
    } catch {
        return false
    }
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
    const { remetente, mensagem, id_chat, nome_usuario, citacao } = mensagemBaileys

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
        // Resposta só citando o bot sem texto → provoca continuidade
        if (await citacaoEhDoBot(mensagemBaileys, botInfo)) {
            pergunta = '…'
        } else {
            await socket.responderTexto(
                c,
                id_chat,
                'Me marca, responde uma mensagem minha ou usa *!chat* + texto.',
                mensagem
            )
            return 'conversa'
        }
    }

    try {
        c.presenceSubscribe(id_chat).catch(() => {})
        c.sendPresenceUpdate('composing', id_chat).catch(() => {})
    } catch { /* */ }

    if (bufferImg) {
        const ctxImg = await contextoImagemParaChat(mensagemBaileys, pergunta)
        if (ctxImg) {
            pergunta = pergunta && pergunta !== '…'
                ? `${pergunta}\n\n${ctxImg}`
                : `O que tem nessa imagem?\n\n${ctxImg}`
        } else if (!pergunta || pergunta === '…') {
            pergunta = 'Descreva a imagem que eu enviei.'
        }
    }

    const { decidirAcaoChat, aplicarComandoNaMensagem } = await import('./chatRoteador.js')
    const decisao = await decidirAcaoChat(pergunta === '…' ? '' : pergunta, botInfo, {
        mensagemDono: !!mensagemBaileys.mensagem_dono
    })

    if (decisao.tipo === 'comando' && pergunta && pergunta !== '…') {
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
        personalidade = (await obterPersonalidadeChat(id_chat)) || ''
        // Compat: grupos antigos na DB
        if (!personalidade && mensagemBaileys.mensagem_grupo) {
            const { GrupoControle } = await import('../controles/GrupoControle.js')
            personalidade =
                (await new GrupoControle().obterPersonalidade(
                    mensagemBaileys.grupo?.id_grupo || id_chat
                )) || ''
        }
    } catch { /* ignore */ }

    let memoriaUsuario = ''
    try {
        memoriaUsuario = (await obterMemoriaUsuarioTexto(remetente)) || ''
    } catch { /* ignore */ }

    let mensagemCitadaBot = ''
    try {
        if (await citacaoEhDoBot(mensagemBaileys, botInfo)) {
            mensagemCitadaBot = String(citacao?.corpo || citacao?.legenda || '').trim()
            if (!mensagemCitadaBot) mensagemCitadaBot = '(mensagem sua citada)'
            if (!pergunta || pergunta === '…') {
                pergunta = 'Respondendo ao que você falou.'
            }
        }
    } catch { /* ignore */ }

    const opcoesIa = {
        historicoGrupo: historicoGrupoTexto,
        nomeGrupo,
        nomeUsuario: nome_usuario || '',
        personalidade,
        memoriaUsuario,
        mensagemCitadaBot,
        usarPesquisa: 'auto'
    }

    let resultadoTexto = ''
    try {
        const resp = await api.IA.obterRespostaIA(pergunta, remetente, id_chat, opcoesIa)
        resultadoTexto = resp?.resultado || ''
    } catch {
        try {
            const { carregarIaApi } = await import('./iaApi.js')
            const IA = await carregarIaApi()
            const resp = await IA.obterRespostaIA(pergunta, remetente, id_chat, opcoesIa)
            resultadoTexto = resp?.resultado || ''
        } catch {
            resultadoTexto =
                'Tô online, mas as IAs deram uma engasgada agora. Manda de novo em um minutinho?'
        }
    }
    if (!resultadoTexto) {
        resultadoTexto =
            'Tô online, mas as IAs deram uma engasgada agora. Manda de novo em um minutinho?'
    }

    await socket.responderTexto(
        c,
        id_chat,
        criarTexto(comandos_info.utilidades.chat.msgs.resposta, resultadoTexto),
        mensagem
    )

    // Memória do usuário (não bloqueia)
    setImmediate(() => {
        registrarMemoriaUsuario({
            idUsuario: remetente,
            nome: nome_usuario || '',
            idChat: id_chat,
            pergunta,
            resposta: resultadoTexto
        }).catch(() => {})
    })

    return 'conversa'
}

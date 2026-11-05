/**
 * Fluxo compartilhado do chat (!chat, @menção, resposta citando o bot).
 * Meta tier B: E2E ≤ ~3–4s com web (Tavily/Brave/DDG/Wiki) + personalidade.
 */
import api from './lbotApi.js'
import { precisaPesquisaWeb } from '../../vendor/lbot-api-comandos/api/ia.js'
import * as socket from '../baileys/socket.js'
import { criarTexto, listaContemJid, mencaoNumero } from './util.js'
import { comandosInfo } from '../comandos/comandos.js'
import { obterPersonalidadeChat } from './personalidadeChat.js'
import { obterMemoriaUsuarioTexto, registrarMemoriaUsuario } from './memoriaUsuario.js'

const raceMs = (promessa, ms, fallback = null) =>
    Promise.race([
        promessa,
        new Promise((resolve) => setTimeout(() => resolve(fallback), ms))
    ])

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
                    ? new Date(Number(m.timestamp)).toLocaleString('pt-BR', {
                          timeZone: 'America/Sao_Paulo'
                      })
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

async function carregarPersonalidade(mensagemBaileys, id_chat) {
    try {
        let personalidade = (await obterPersonalidadeChat(id_chat)) || ''
        if (!personalidade && mensagemBaileys.mensagem_grupo) {
            const { GrupoControle } = await import('../controles/GrupoControle.js')
            personalidade =
                (await new GrupoControle().obterPersonalidade(
                    mensagemBaileys.grupo?.id_grupo || id_chat
                )) || ''
        }
        // Sem !personalidade do chat: usa persona/ULTRON.md (contexto chat)
        if (!String(personalidade || '').trim()) {
            const { personaPara } = await import('./ultronPersona.js')
            personalidade = personaPara('chat', { maxChars: 3500 })
        }
        return personalidade
    } catch {
        try {
            const { personaPara } = await import('./ultronPersona.js')
            return personaPara('chat', { maxChars: 3500 })
        } catch {
            return ''
        }
    }
}

/**
 * Roda o chat (roteador de comando + IA).
 * @returns {Promise<'comando'|'conversa'|{ tipo: string, timing?: object }>}
 */
export async function processarChatIA(c, mensagemBaileys, botInfo, textoUsuario) {
    const comandos_info = comandosInfo(botInfo)
    const { remetente, mensagem, id_chat, nome_usuario, citacao } = mensagemBaileys
    const timing = { pre: 0, vision: 0, web: 0, cascade: 0 }
    const t0 = Date.now()

    let pergunta = String(textoUsuario || '').trim()

    const { contextoImagemParaChat, baixarImagemMensagem } = await import('./visao.js')
    let bufferImg = null
    try {
        bufferImg = await baixarImagemMensagem(mensagemBaileys)
    } catch {
        bufferImg = null
    }
    if (!pergunta && !bufferImg) {
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
    } catch {
        /* */
    }

    if (bufferImg) {
        const tVis = Date.now()
        const ctxImg = await raceMs(contextoImagemParaChat(mensagemBaileys, pergunta), 2500, null)
        timing.vision = Date.now() - tVis
        try {
            const { registrarStageMs } = await import('./logger.js')
            registrarStageMs('vision', timing.vision)
        } catch {
            /* */
        }
        if (ctxImg) {
            pergunta =
                pergunta && pergunta !== '…'
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
        const { reagirAckInicio, reagirAckOk, reagirAckErro, comandoSemReacaoAck } =
            await import('./reacoes.js')
        const comReacao = !comandoSemReacaoAck(decisao.comando, botInfo?.prefixo)
        if (comReacao) await reagirAckInicio(c, mensagem).catch(() => {})
        aplicarComandoNaMensagem(mensagemBaileys, decisao.comando, decisao.argsTexto)
        try {
            const { executarComandoDireto } = await import('./chamadaComando.js')
            await executarComandoDireto(c, mensagemBaileys, botInfo)
            if (comReacao) await reagirAckOk(c, mensagem).catch(() => {})
        } catch (err) {
            if (comReacao) await reagirAckErro(c, mensagem).catch(() => {})
            throw err
        }
        return 'comando'
    }

    const tPre = Date.now()
    const [{ historicoGrupoTexto, nomeGrupo }, personalidade, memoriaUsuario, citBot] =
        await Promise.all([
            carregarHistoricoGrupo(mensagemBaileys),
            carregarPersonalidade(mensagemBaileys, id_chat),
            obterMemoriaUsuarioTexto(remetente)
                .then((t) => t || '')
                .catch(() => ''),
            (async () => {
                try {
                    if (!(await citacaoEhDoBot(mensagemBaileys, botInfo))) return ''
                    let mensagemCitadaBot = String(citacao?.corpo || citacao?.legenda || '').trim()
                    if (!mensagemCitadaBot) mensagemCitadaBot = '(mensagem sua citada)'
                    return mensagemCitadaBot
                } catch {
                    return ''
                }
            })()
        ])
    timing.pre = Date.now() - tPre
    try {
        const { registrarStageMs } = await import('./logger.js')
        registrarStageMs('pre', timing.pre)
    } catch {
        /* */
    }

    let mensagemCitadaBot = citBot
    if (mensagemCitadaBot && (!pergunta || pergunta === '…')) {
        pergunta = 'Respondendo ao que você falou.'
    }

    // Fatos/atualidade → força web; papo casual não gasta pesquisa
    let usarPesquisa = 'auto'
    if (precisaPesquisaWeb(pergunta)) usarPesquisa = true
    else if (
        !/\?/.test(pergunta) &&
        pergunta.length < 40 &&
        !/\b(noticia|hoje|agora|placar|preço|preco|cotacao|resultado|jogo|ao\s*vivo)\b/i.test(
            pergunta
        )
    ) {
        usarPesquisa = false
    }

    const opcoesIa = {
        historicoGrupo: historicoGrupoTexto,
        nomeGrupo,
        nomeUsuario: nome_usuario || '',
        personalidade,
        memoriaUsuario: memoriaUsuario || '',
        mensagemCitadaBot,
        ehDono: !!mensagemBaileys.mensagem_dono,
        mensagemDono: !!mensagemBaileys.mensagem_dono,
        usarPesquisa,
        timeout: 6000,
        budgetMs: 8000,
        maxOutputTokens: usarPesquisa === true ? 380 : 280,
        // Factual: race maior + Perplexity (se houver chave); casual sem web
        webRaceMs: usarPesquisa === true ? 2800 : 1600,
        chatRapido: true,
        incluirPerplexity: usarPesquisa === true,
        maxFontesWeb: 3
    }

    let resultadoTexto = ''
    const tIa = Date.now()
    try {
        const resp = await api.IA.obterRespostaIA(pergunta, remetente, id_chat, opcoesIa)
        resultadoTexto = resp?.resultado || ''
        if (resp?.timing) {
            timing.web = Number(resp.timing.web) || 0
            timing.cascade = Number(resp.timing.cascade) || 0
        }
        try {
            const { incrMetrica, registrarIaMs, registrarStageMs } = await import('./logger.js')
            registrarIaMs(Date.now() - tIa)
            if (timing.web) registrarStageMs('web', timing.web)
            if (timing.cascade) registrarStageMs('cascade', timing.cascade)
            incrMetrica(resultadoTexto ? 'ia_ok' : 'ia_erro')
        } catch {
            /* */
        }
    } catch {
        try {
            const { carregarIaApi } = await import('./iaApi.js')
            const IA = await carregarIaApi()
            const resp = await IA.obterRespostaIA(pergunta, remetente, id_chat, opcoesIa)
            resultadoTexto = resp?.resultado || ''
            if (resp?.timing) {
                timing.web = Number(resp.timing.web) || 0
                timing.cascade = Number(resp.timing.cascade) || 0
            }
            try {
                const { incrMetrica, registrarIaMs, registrarStageMs } = await import('./logger.js')
                registrarIaMs(Date.now() - tIa)
                if (timing.web) registrarStageMs('web', timing.web)
                if (timing.cascade) registrarStageMs('cascade', timing.cascade)
                incrMetrica(resultadoTexto ? 'ia_ok' : 'ia_erro')
            } catch {
                /* */
            }
        } catch {
            try {
                const { incrMetrica, registrarIaMs } = await import('./logger.js')
                registrarIaMs(Date.now() - tIa)
                incrMetrica('ia_erro')
            } catch {
                /* */
            }
            resultadoTexto =
                'Tô aqui. Manda de novo direto que eu te respondo sem enrolação.'
        }
    }
    if (!resultadoTexto || /engasgad|pane geral nas ias|ias deram uma engasgada/i.test(resultadoTexto)) {
        resultadoTexto =
            'Tô aqui. Manda de novo direto que eu te respondo sem enrolação.'
    }

    await socket.responderTexto(
        c,
        id_chat,
        criarTexto(comandos_info.utilidades.chat.msgs.resposta, resultadoTexto),
        mensagem
    )

    setImmediate(() => {
        registrarMemoriaUsuario({
            idUsuario: remetente,
            nome: nome_usuario || '',
            idChat: id_chat,
            pergunta,
            resposta: resultadoTexto
        }).catch(() => {})
    })

    mensagemBaileys._chatTiming = {
        ...timing,
        total: Date.now() - t0
    }
    return 'conversa'
}

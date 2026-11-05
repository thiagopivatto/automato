/**
 * Fluxo compartilhado do chat (!chat, @menção, resposta citando o bot).
 * Meta tier B: E2E ≤ ~3–4s com web (Tavily/Brave/DDG/Wiki) + personalidade.
 */
import api from './lbotApi.js'
import { ehFallbackPaneIa, precisaPesquisaWeb } from '../../vendor/lbot-api-comandos/api/ia.js'
import { responderLocalUltron } from '../../vendor/lbot-api-comandos/api/resposta-local-chat.js'
import * as socket from '../baileys/socket.js'
import { aliasesParticipanteMeta, criarTexto, listaContemJid, mencaoNumero } from './util.js'
import { comandosInfo } from '../comandos/comandos.js'
import { obterPersonalidadeChat } from './personalidadeChat.js'
import { obterCidadeMemoria, obterMemoriaUsuarioTexto, registrarMemoriaUsuario } from './memoriaUsuario.js'
import { formatarLinhaHistorico } from './falantes.js'
import { aplicarMencoes, nomesParaPrompt, preferirJidMencao, textoMencoesParaNomes } from './mencoes.js'

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
        const msgs = await historicoGrupo.obterUltimas(grupo?.id_grupo || id_chat, 16)
        const historicoGrupoTexto = (msgs || [])
            .map((m) => {
                const quando = m.timestamp
                    ? new Date(Number(m.timestamp)).toLocaleString('pt-BR', {
                          timeZone: 'America/Sao_Paulo'
                      })
                    : ''
                return formatarLinhaHistorico({
                    nome_usuario: m.nome_usuario,
                    texto: String(m.texto || '').slice(0, 160),
                    quando,
                    citou_nome: m.citou_nome,
                    citou_texto: m.citou_texto
                })
            })
            .join('\n')
            .slice(0, 3200)
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
            personalidade = personaPara('chat', { maxChars: 4200 })
        }
        return personalidade
    } catch {
        try {
            const { personaPara } = await import('./ultronPersona.js')
            return personaPara('chat', { maxChars: 4200 })
        } catch {
            return ''
        }
    }
}

function respostaSeguraChat(pergunta, mensagemBaileys) {
    return responderLocalUltron(pergunta, {
        ehDono: !!mensagemBaileys?.mensagem_dono,
        nome: mensagemBaileys?.nome_usuario || '',
        factual: precisaPesquisaWeb(pergunta)
    })
}

function textoChatUtil(texto) {
    const t = String(texto || '').trim()
    if (!t || ehFallbackPaneIa(t)) return ''
    return t.slice(0, 3500)
}

async function montarMembrosChat(mensagemBaileys) {
    const grupo = mensagemBaileys.grupo || {}
    const participantes = grupo.participantes || []
    const meta = grupo.metaParticipantes || []
    const mapa = {}
    const idGrupo = grupo.id_grupo || mensagemBaileys.id_chat
    if (mensagemBaileys.mensagem_grupo && idGrupo) {
        try {
            const { historicoGrupo } = await import('../controles/HistoricoGrupoControle.js')
            const msgs = await historicoGrupo.obterUltimas(idGrupo, 80)
            for (const m of msgs || []) {
                const n = String(m?.nome_usuario || '').trim()
                if (m?.id_usuario && n && !/^\d{8,}$/.test(n)) mapa[m.id_usuario] = n
            }
        } catch {
            /* sem histórico */
        }
    }
    if (mensagemBaileys.remetente && mensagemBaileys.nome_usuario) {
        const nome = String(mensagemBaileys.nome_usuario).trim()
        if (nome) {
            mapa[mensagemBaileys.remetente] = nome
            for (const a of mensagemBaileys.aliases_remetente || []) mapa[a] = nome
        }
    }
    const ids = participantes.length
        ? participantes
        : [mensagemBaileys.remetente].filter(Boolean)
    const vistos = new Set()
    const membros = []
    for (const jid of ids) {
        if (!jid) continue
        const aliases = meta.length ? aliasesParticipanteMeta(meta, jid) : [jid]
        const jidPref =
            aliases.find((a) => String(a).endsWith('@s.whatsapp.net')) ||
            preferirJidMencao(jid, participantes.length ? participantes : aliases)
        const chave = mencaoNumero(jidPref) || String(jid)
        if (vistos.has(chave)) continue
        vistos.add(chave)
        let nome = ''
        for (const a of [jidPref, jid, ...aliases]) {
            if (mapa[a]) {
                nome = mapa[a]
                break
            }
        }
        membros.push({ jid: jidPref, nome, aliases })
    }
    return membros
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

    if (mensagemBaileys.mensagem_grupo) {
        try {
            const sock = await import('../baileys/socket.js')
            await sock.atualizarFlagsAdminGrupo(c, mensagemBaileys, botInfo)
        } catch {
            /* metadados ao vivo são extras */
        }
    }

    const aliasesRemetente = mensagemBaileys.aliases_remetente || []
    const membrosChat = await montarMembrosChat(mensagemBaileys)
    pergunta = textoMencoesParaNomes(pergunta, membrosChat, mensagemBaileys.mencionados || [])

    const tPre = Date.now()
    const [{ historicoGrupoTexto, nomeGrupo }, personalidade, memoriaFalante, cidadeUsuario, citBot] =
        await Promise.all([
            carregarHistoricoGrupo(mensagemBaileys),
            carregarPersonalidade(mensagemBaileys, id_chat),
            obterMemoriaUsuarioTexto(remetente, aliasesRemetente)
                .then((t) => t || '')
                .catch(() => ''),
            obterCidadeMemoria(remetente, aliasesRemetente).catch(() => ''),
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

    const mencionadosHumanos = (mensagemBaileys.mencionados || []).filter(
        (j) => j && !listaContemJid([j], botInfo?.numero_bot, botInfo?.lid_bot)
    )
    let memoriaMencionados = ''
    for (const jid of mencionadosHumanos.slice(0, 3)) {
        if (listaContemJid([jid, ...aliasesRemetente], remetente)) continue
        const membro = membrosChat.find((m) =>
            listaContemJid([m.jid, ...(m.aliases || [])], jid)
        )
        const nomeMarcado = membro?.nome || 'alguém'
        try {
            const trecho = await obterMemoriaUsuarioTexto(jid)
            if (trecho) memoriaMencionados += `\n[Memória de ${nomeMarcado}]\n${trecho.slice(0, 500)}\n`
        } catch {
            /* sem memória dessa pessoa */
        }
    }
    const memoriaUsuario = [memoriaFalante, memoriaMencionados].filter(Boolean).join('\n\n')

    const usarPesquisa = precisaPesquisaWeb(pergunta)

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
        cidadeUsuario: cidadeUsuario || '',
        nomesGrupo: nomesParaPrompt(membrosChat),
        timeout: usarPesquisa ? 9000 : 8000,
        budgetMs: usarPesquisa ? 12000 : 10000,
        maxOutputTokens: usarPesquisa ? 420 : 280,
        // Factual: race maior + Perplexity (se houver chave); casual sem web
        webRaceMs: usarPesquisa ? 4500 : 1600,
        chatRapido: true,
        incluirPerplexity: usarPesquisa,
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
            resultadoTexto = respostaSeguraChat(pergunta, mensagemBaileys)
        }
    }
    resultadoTexto = textoChatUtil(resultadoTexto) || respostaSeguraChat(pergunta, mensagemBaileys)

    const participantes = mensagemBaileys.grupo?.participantes || []
    let textoFinal = resultadoTexto
    let mentionsFinais = []
    try {
        const aplicado = aplicarMencoes(resultadoTexto, membrosChat, participantes)
        textoFinal = aplicado.texto || resultadoTexto
        mentionsFinais = [...aplicado.mentions]
    } catch {
        textoFinal = resultadoTexto
    }

    const corpoResposta = criarTexto(comandos_info.utilidades.chat.msgs.resposta, textoFinal)
    try {
        if (mentionsFinais.length) {
            await socket.responderComMencoes(c, id_chat, corpoResposta, [...new Set(mentionsFinais)], mensagem)
        } else {
            await socket.responderTexto(c, id_chat, corpoResposta, mensagem)
        }
    } catch {
        await socket.responderTexto(c, id_chat, textoFinal.slice(0, 1500), mensagem).catch(() => {})
    }

    setImmediate(() => {
        registrarMemoriaUsuario({
            idUsuario: remetente,
            aliases: aliasesRemetente,
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

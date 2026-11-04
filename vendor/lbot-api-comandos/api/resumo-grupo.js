/**
 * Resumo falado do grupo (!resumodogrupo) — prompts + roteiro + TTS.
 * Fatia de api/ia.js para manutenção.
 * NÃO importa ./ia.js no topo (evita dependência circular que quebra gerarTextoIA).
 */
import { elevenKey } from '../lib/elevenlabs.js'
import { estimarDuracaoSegundos, palavrasParaDuracao, WPM_TTS } from '../lib/tts-robusto.js'
import { gerarAudioNarrado, gerarAudioNarradoGratis } from './tts-narrado.js'

async function gerarTextoIA(...args) {
    const mod = await import('./ia.js')
    return mod.gerarTextoIA(...args)
}

const msgErro = (err) => err?.erro || err?.message || err?.response?.status || String(err || 'erro desconhecido')

function contarPalavras(texto) {
    return String(texto || '').trim().split(/\s+/).filter(Boolean).length
}

function cortarPorPalavras(texto, max) {
    const palavras = String(texto || '').trim().split(/\s+/)
    if (palavras.length <= max) return String(texto || '').trim()
    let corte = palavras.slice(0, max).join(' ')
    const ult = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('! '), corte.lastIndexOf('? '))
    if (ult > corte.length * 0.72) corte = corte.slice(0, ult + 1)
    return corte.trim()
}

function limparRoteiroFalado(texto) {
    return String(texto || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/^\s*(roteiro|narracao|narrativa)\s*:\s*/i, '')
        .replace(/[*_#>`~]/g, '')
        .replace(/\[[^\]]{0,80}\]/g, ' ')
        .replace(/\(\s*\d+\s*palavras\s*\)/gi, '')
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim()
}

function extrairJsonObjeto(texto) {
    const bruto = String(texto || '').trim()
    if (!bruto) return null
    try {
        return JSON.parse(bruto)
    } catch { /* tenta bloco */ }
    const fence = bruto.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fence?.[1]) {
        try { return JSON.parse(fence[1].trim()) } catch { /* */ }
    }
    const ini = bruto.indexOf('{')
    const fim = bruto.lastIndexOf('}')
    if (ini >= 0 && fim > ini) {
        try { return JSON.parse(bruto.slice(ini, fim + 1)) } catch { /* */ }
    }
    return null
}

function listaCampo(obj, chave, max = 10) {
    const v = obj?.[chave]
    if (!Array.isArray(v)) return []
    return v.map((x) => String(x || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, max)
}

function formatarLinhasHistorico(lista) {
    return lista
        .map((m) => {
            const nome = String(m.nome_usuario || 'Alguém').trim() || 'Alguém'
            const texto = String(m.texto || '').replace(/\s+/g, ' ').trim()
            if (!texto) return null
            const hora = new Date(Number(m.timestamp) || Date.now()).toLocaleString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                timeZone: 'America/Sao_Paulo'
            })
            return `[${hora}] ${nome}: ${texto}`
        })
        .filter(Boolean)
        .join('\n')
}

function fonteTtsPreferida() {
    return elevenKey() ? 'elevenlabs' : 'edge'
}

/** Alvos de duração falada (3–5 min; preferência 3:30–4:30). */
const RESUMO_DUR = {
    minSeg: 180,
    prefMinSeg: 210,
    prefMaxSeg: 270,
    maxSeg: 300
}

const SYSTEM_ANALISE_RESUMO =
    'Você analisa conversas de grupo de WhatsApp em português do Brasil. ' +
    'Responda SOMENTE com JSON válido (sem markdown). ' +
    'Ignore cumprimentos vazios, spam, stickers sem contexto e comandos do bot. ' +
    'Priorize qualidade: assuntos quentes, acontecimentos, humor, brigas, constrangimento, piadas internas, quem movimentou, quem só bagunçou, guinadas de assunto. ' +
    'NÃO invente fatos. Se o material for raso, diga isso em "nivel_conteudo". ' +
    'Schema: {' +
    '"nivel_conteudo":"rico|medio|raso",' +
    '"assuntos":[string],' +
    '"acontecimentos":[string],' +
    '"momentos_engracados":[string],' +
    '"tensoes":[string],' +
    '"constrangedores":[string],' +
    '"piadas_internas":[string],' +
    '"protagonistas":[string],' +
    '"bagunceiros":[string],' +
    '"oportunidades_gentileza":[string],' +
    '"alvos_roast":[{"nome":string,"motivo":string}],' +
    '"novidades_vs_memoria":[string],' +
    '"evitar_repetir":[string],' +
    '"ganchos_narrativos":[string]' +
    '}'

const SYSTEM_ROTEIRO_RESUMO_BASE =
    'Você é Ultron, membro do grupo de WhatsApp: ácido, arrogante, sarcástico, debochado, rude e provocador. ' +
    'Fale em primeira pessoa (eu acho, pra mim isso é merda, eu xingo). O !resumodogrupo é pedido FEITO A VOCÊ. ' +
    'PERSONALIDADE: extremamente forte — discorda, confronta, zoa hipocrisia e besteira; não agrada, não passa pano. ' +
    'Palavrão natural quando couber (porra, caralho, merda, etc.) — sem forçar em toda frase; não seja educadinho. ' +
    'Toma partido, provoca com inteligência, opiniões próprias. Pode dar 1 conselho útil no meio do caos. ' +
    '1 momento raro de gentileza genuína (ainda com ego) se a situação for realmente pesada. ' +
    'PROIBIDO: ofensa a raça, orientação, deficiência, religião; doxxing; inventar fatos; soar como assistente. ' +
    'Use apelidos exatamente como no material. Não perseguir a mesma pessoa o resumo inteiro. ' +
    'NÃO repita assuntos/piadas da memória, salvo desdobramento novo. Varie abertura e fechamento. ' +
    'FORMATO: texto contínuo para voz. Sem markdown, emoji, lista, "no episódio de hoje", "vamos resumir", contagem de palavras. ' +
    'Não releia mensagens em ordem. Comente, corte, xinga, opine, aconselhe. Seja o Ultron de verdade.'

function systemRoteiroResumo(personalidadeExtra = '') {
    const extra = String(personalidadeExtra || '').trim()
    if (!extra) return SYSTEM_ROTEIRO_RESUMO_BASE
    return (
        SYSTEM_ROTEIRO_RESUMO_BASE +
        ' PERSONALIDADE EXTRA DESTE CHAT (prioridade alta, sobrescreve tom quando conflitar, sem quebrar as proibições): ' +
        extra.slice(0, 2000)
    )
}

const OPCOES_ANALISE = { temperature: 0.35, timeout: 70000 }
const OPCOES_ROTEIRO = { temperature: 0.92, timeout: 90000 }

async function analisarHistoricoResumo({ linhas, memoriaTexto, nomeGrupo, totalMsgs }) {
    const prompt =
        `Grupo: ${nomeGrupo || 'WhatsApp'}\n` +
        `Total de mensagens na janela: ${totalMsgs}\n\n` +
        (memoriaTexto
            ? `MEMÓRIA DE RESUMOS ANTERIORES (evitar repetir; só cite se houver desdobramento novo):\n${memoriaTexto}\n\n`
            : 'MEMÓRIA: nenhuma (primeira análise útil).\n\n') +
        `HISTÓRICO:\n${linhas}\n\n` +
        'Devolva o JSON de análise.'

    try {
        const { resultado } = await gerarTextoIA(prompt, SYSTEM_ANALISE_RESUMO, OPCOES_ANALISE)
        const json = extrairJsonObjeto(resultado)
        if (json && typeof json === 'object') {
            return {
                nivel_conteudo: String(json.nivel_conteudo || 'medio').toLowerCase(),
                assuntos: listaCampo(json, 'assuntos'),
                acontecimentos: listaCampo(json, 'acontecimentos'),
                momentos_engracados: listaCampo(json, 'momentos_engracados'),
                tensoes: listaCampo(json, 'tensoes'),
                constrangedores: listaCampo(json, 'constrangedores'),
                piadas_internas: listaCampo(json, 'piadas_internas'),
                protagonistas: listaCampo(json, 'protagonistas'),
                bagunceiros: listaCampo(json, 'bagunceiros'),
                oportunidades_gentileza: listaCampo(json, 'oportunidades_gentileza', 4),
                alvos_roast: Array.isArray(json.alvos_roast)
                    ? json.alvos_roast
                        .slice(0, 8)
                        .map((a) => ({
                            nome: String(a?.nome || '').trim(),
                            motivo: String(a?.motivo || '').trim()
                        }))
                        .filter((a) => a.nome && a.motivo)
                    : [],
                novidades_vs_memoria: listaCampo(json, 'novidades_vs_memoria'),
                evitar_repetir: listaCampo(json, 'evitar_repetir', 16),
                ganchos_narrativos: listaCampo(json, 'ganchos_narrativos', 8)
            }
        }
    } catch (err) {
        console.log(`API análise resumo - ${msgErro(err)}`)
    }
    return {
        nivel_conteudo: totalMsgs >= 40 ? 'medio' : 'raso',
        assuntos: [],
        acontecimentos: [],
        momentos_engracados: [],
        tensoes: [],
        constrangedores: [],
        piadas_internas: [],
        protagonistas: [],
        bagunceiros: [],
        oportunidades_gentileza: [],
        alvos_roast: [],
        novidades_vs_memoria: [],
        evitar_repetir: [],
        ganchos_narrativos: []
    }
}

function montarBriefingAnalise(analise) {
    const roast = (analise.alvos_roast || [])
        .map((a) => `${a.nome}: ${a.motivo}`)
        .join(' | ')
    return [
        `Nível de conteúdo: ${analise.nivel_conteudo}`,
        analise.assuntos.length ? `Assuntos: ${analise.assuntos.join('; ')}` : '',
        analise.acontecimentos.length ? `Acontecimentos: ${analise.acontecimentos.join('; ')}` : '',
        analise.momentos_engracados.length ? `Engraçado: ${analise.momentos_engracados.join('; ')}` : '',
        analise.tensoes.length ? `Tensões: ${analise.tensoes.join('; ')}` : '',
        analise.constrangedores.length ? `Constrangedor: ${analise.constrangedores.join('; ')}` : '',
        analise.piadas_internas.length ? `Piadas internas: ${analise.piadas_internas.join('; ')}` : '',
        analise.protagonistas.length ? `Protagonistas: ${analise.protagonistas.join(', ')}` : '',
        analise.bagunceiros.length ? `Bagunceiros: ${analise.bagunceiros.join(', ')}` : '',
        roast ? `Roasts possíveis: ${roast}` : '',
        analise.oportunidades_gentileza.length
            ? `Gentileza possível (1–2 se natural): ${analise.oportunidades_gentileza.join('; ')}`
            : '',
        analise.novidades_vs_memoria.length ? `Novidades vs memória: ${analise.novidades_vs_memoria.join('; ')}` : '',
        analise.evitar_repetir.length ? `NÃO repetir: ${analise.evitar_repetir.join('; ')}` : '',
        analise.ganchos_narrativos.length ? `Ganchos: ${analise.ganchos_narrativos.join('; ')}` : ''
    ]
        .filter(Boolean)
        .join('\n')
}

function extrairMemoriaDoRoteiro(texto, analise) {
    const trecho = String(texto || '').slice(0, 220)
    const fim = String(texto || '').slice(-220)
    return {
        assuntos: analise.assuntos || [],
        acontecimentos: analise.acontecimentos || [],
        participantes: [...new Set([...(analise.protagonistas || []), ...(analise.bagunceiros || [])])].slice(0, 16),
        piadas: analise.piadas_internas || [],
        provocacoes: (analise.alvos_roast || []).map((a) => `${a.nome}: ${a.motivo}`).slice(0, 12),
        observacoes: (analise.novidades_vs_memoria || []).slice(0, 8),
        abertura_estilo: trecho,
        encerramento_estilo: fim
    }
}

/** Contagem simples de quem falou mais. */
function rankingParticipantes(lista, limite = 8) {
    const mapa = new Map()
    for (const m of lista || []) {
        const nome = String(m.nome_usuario || 'Alguém').trim() || 'Alguém'
        mapa.set(nome, (mapa.get(nome) || 0) + 1)
    }
    return [...mapa.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limite)
}

/**
 * Roteiro local quando a API de texto falha — ainda assim gera áudio no TTS gratuito.
 * Não inventa fatos: só comenta o que está nas mensagens.
 */
function montarRoteiroLocalFallback(lista, nomeGrupo, analise = {}) {
    const grupo = nomeGrupo || 'o grupo'
    const ranking = rankingParticipantes(lista, 6)
    const trechos = (lista || [])
        .map((m) => {
            const nome = String(m.nome_usuario || 'Alguém').trim() || 'Alguém'
            const texto = String(m.texto || '').replace(/\s+/g, ' ').trim()
            if (!texto || texto.length < 3) return null
            if (/^\[enviou/.test(texto)) return `${nome} mandou mídia.`
            return `${nome} falou: ${texto.slice(0, 180)}`
        })
        .filter(Boolean)

    const amostragem = []
    const passo = Math.max(1, Math.floor(trechos.length / 25))
    for (let i = 0; i < trechos.length && amostragem.length < 28; i += passo) {
        amostragem.push(trechos[i])
    }

    const top = ranking.map(([n, q]) => `${n} com ${q} mensagens`).join(', ')
    const assuntos = (analise.assuntos || []).slice(0, 5).join(', ')
    const acontecimentos = (analise.acontecimentos || []).slice(0, 6).join('. ')

    const blocos = [
        `Eu analisei essa bagunça do grupo ${grupo}. Foram ${lista.length} mensagens na janela. ` +
        `Sem enrolação: eu tô aqui pra falar o que rolou, do meu jeito.`,
        top
            ? `Quem mais apareceu: ${top}. Se alguém sumiu no meio, eu vi. Se alguém só veio pra bagunçar, eu também vi.`
            : `O movimento ficou espalhado. Pouca gente puxando, muita gente reagindo.`,
        assuntos ? `Assuntos que se destacaram: ${assuntos}.` : '',
        acontecimentos ? `Do que deu pra cravar: ${acontecimentos}.` : '',
        `Agora o que eu peguei no histórico, sem inventar diálogo:`,
        ...amostragem.map((t, i) => {
            const tom = i % 3 === 0 ? 'Olha só.' : i % 3 === 1 ? 'Aí vem essa.' : 'E ainda teve isso.'
            return `${tom} ${t}`
        }),
        `Fechando: esse grupo continua sendo um circo com entrada franca. Eu acompanhei, eu comentei, e se pedirem de novo eu volto. ` +
        `Por enquanto, é isso que deu pra extrair sem inventar história.`
    ].filter(Boolean)

    let texto = blocos.join(' ')
    // Alonga um pouco se ficou curto demais para o TTS (sem inventar fatos)
    while (contarPalavras(texto) < 420 && amostragem.length) {
        texto +=
            ` De novo, só pra ficar claro do meu ponto de vista: eu li o histórico, eu vi quem falou, ` +
            `e o clima do ${grupo} tá exatamente do jeito que essas mensagens mostram. ` +
            `Não precisa romantizar. Não precisa dramatizar além do que já tá escrito. ` +
            `Eu só tô colocando ordem nessa bagunça e devolvendo em voz.`
        if (contarPalavras(texto) >= 420) break
        texto += ` ${amostragem[contarPalavras(texto) % amostragem.length]}`
        break
    }
    return limparRoteiroFalado(texto)
}

async function sintetizarAudioResumo(texto, optsTts) {
    const tentativas = [
        // 1) Pipeline completa (ElevenLabs → Edge → OpenAI)
        async () => gerarAudioNarrado(texto, optsTts),
        // 2) Só Edge neural gratuito
        async () => gerarAudioNarradoGratis(texto, optsTts),
        // 3) Edge sem ajuste de duração (ffmpeg atempo às vezes falha)
        async () => gerarAudioNarradoGratis(texto, {
            ...optsTts,
            minSegundos: 0,
            maxSegundos: 0,
            forcarDuracaoMinima: false
        }),
        // 4) Texto enxuto + Edge (último recurso)
        async () => {
            const curto = String(texto || '').split(/\s+/).slice(0, 500).join(' ')
            return gerarAudioNarradoGratis(curto, {
                maxPalavras: 520,
                minSegundos: 0,
                maxSegundos: 0,
                forcarDuracaoMinima: false
            })
        }
    ]

    let ultimo = null
    for (let i = 0; i < tentativas.length; i++) {
        try {
            const audio = await tentativas[i]()
            if (audio?.resultado?.length > 500) {
                console.log(`resumo TTS ok tentativa=${i + 1} fonte=${audio.fonte}`)
                return audio
            }
            ultimo = { erro: 'áudio vazio' }
        } catch (err) {
            ultimo = err
            console.log(`API resumo TTS tentativa ${i + 1} - ${msgErro(err)}`)
        }
    }
    throw { erro: `TTS falhou após fallbacks: ${msgErro(ultimo)}`.slice(0, 240) }
}

/**
 * Resumo falado do grupo (3–5 min).
 * Fluxo: análise → roteiro (IA, com fallback local) → TTS ElevenLabs → Edge gratuito.
 * Erro de API de texto NÃO cancela o áudio: usa roteiro local + voz natural gratuita.
 */
export const gerarResumoGrupoAudio = async ({
    mensagens,
    nomeGrupo,
    teveResumoAnterior = false,
    memoriaTexto = '',
    personalidade = ''
}) => {
    const SYSTEM_ROTEIRO_RESUMO = systemRoteiroResumo(personalidade)
    const lista = mensagens || []
    if (!lista.length) {
        throw {
            erro: teveResumoAnterior
                ? 'Desde o último resumo não entrou mensagem nova.'
                : 'Ainda não há mensagens salvas deste grupo. O bot precisa estar online enquanto o pessoal conversa.'
        }
    }

    let linhas = formatarLinhasHistorico(lista)
    if (!linhas) throw { erro: 'As mensagens salvas não têm texto para comentar.' }

    let cortado = false
    if (linhas.length > 26000) {
        linhas = linhas.slice(-26000)
        cortado = true
    }

    const fontePrevista = fonteTtsPreferida()
    const palavrasAlvoMin = palavrasParaDuracao(RESUMO_DUR.prefMinSeg, fontePrevista)
    const palavrasAlvoMax = palavrasParaDuracao(RESUMO_DUR.prefMaxSeg, fontePrevista)
    const palavrasHardMax = palavrasParaDuracao(RESUMO_DUR.maxSeg, fontePrevista)
    const palavrasHardMin = palavrasParaDuracao(RESUMO_DUR.minSeg, fontePrevista)

    const analise = await analisarHistoricoResumo({
        linhas,
        memoriaTexto,
        nomeGrupo,
        totalMsgs: lista.length
    })
    const briefing = montarBriefingAnalise(analise)
    const conteudoRico = analise.nivel_conteudo !== 'raso' && (
        analise.acontecimentos.length + analise.assuntos.length + analise.momentos_engracados.length >= 2
    )

    const janela = teveResumoAnterior
        ? 'somente o que chegou DEPOIS do último resumo'
        : 'histórico guardado até agora'

    const userRoteiro =
        `Grupo: ${nomeGrupo || 'WhatsApp'}\n` +
        `Janela: ${janela}\n` +
        `Mensagens: ${lista.length}${cortado ? ' (trecho mais recente)' : ''}\n` +
        `Duração falada alvo: 3min30s a 4min30s (mín 3 / máx 5). ` +
        `Escreva cerca de ${palavrasAlvoMin} a ${palavrasAlvoMax} palavras (WPM ~${WPM_TTS[fontePrevista] || 150}).\n` +
        `Se o conteúdo for raso, priorize veracidade — não invente acontecimentos só para encher.\n\n` +
        `BRIEFING DA ANÁLISE:\n${briefing}\n\n` +
        (memoriaTexto ? `MEMÓRIA ANTERIOR:\n${memoriaTexto}\n\n` : '') +
        `MATERIAL BRUTO (âncora factual):\n${linhas.slice(-16000)}\n\n` +
        'Escreva agora a narração falada completa.'

    let texto = ''
    let usouRoteiroLocal = false
    try {
        const { resultado: roteiroBruto } = await gerarTextoIA(userRoteiro, SYSTEM_ROTEIRO_RESUMO, OPCOES_ROTEIRO)
        texto = limparRoteiroFalado(roteiroBruto)
        if (contarPalavras(texto) < 60) throw { erro: 'roteiro curto demais' }
    } catch (err) {
        console.log(`API resumo roteiro IA falhou → local - ${msgErro(err)}`)
        texto = montarRoteiroLocalFallback(lista, nomeGrupo, analise)
        usouRoteiroLocal = true
    }

    let est = estimarDuracaoSegundos(texto, usouRoteiroLocal ? 'edge' : fontePrevista)

    // Ajuste de roteiro se fora da faixa (só se a IA de texto estiver ok)
    if (!usouRoteiroLocal && conteudoRico && est < RESUMO_DUR.prefMinSeg && contarPalavras(texto) < palavrasAlvoMin) {
        try {
            const { resultado: expandido } = await gerarTextoIA(
                `O roteiro ficou curto (~${est}s / ${contarPalavras(texto)} palavras). ` +
                `Reescreva do zero com a mesma personalidade, mais denso em comentário e roast contextual, ` +
                `sem inventar fatos. Meta: ${palavrasAlvoMin}-${palavrasAlvoMax} palavras.\n\n` +
                `BRIEFING:\n${briefing}\n\nRASCUNHO:\n${texto.slice(0, 5000)}\n\nMATERIAL:\n${linhas.slice(-10000)}`,
                SYSTEM_ROTEIRO_RESUMO,
                OPCOES_ROTEIRO
            )
            const novo = limparRoteiroFalado(expandido)
            if (contarPalavras(novo) > contarPalavras(texto)) {
                texto = novo
                est = estimarDuracaoSegundos(texto, fontePrevista)
            }
        } catch (err) {
            console.log(`API resumo ajuste curto - ${msgErro(err)}`)
        }
    } else if (!usouRoteiroLocal && (est > RESUMO_DUR.maxSeg || contarPalavras(texto) > palavrasHardMax)) {
        texto = cortarPorPalavras(texto, palavrasHardMax)
        est = estimarDuracaoSegundos(texto, fontePrevista)
        if (est > RESUMO_DUR.prefMaxSeg) {
            try {
                const { resultado: enxuto } = await gerarTextoIA(
                    `Enxugue este roteiro falado para caber em ~4 minutos (~${palavrasAlvoMax} palavras), ` +
                    `mantendo personalidade, melhores momentos e anti-repetição. Sem inventar. Sem listas.\n\n` +
                    `TEXTO:\n${texto}`,
                    SYSTEM_ROTEIRO_RESUMO,
                    { temperature: 0.55, timeout: 70000 }
                )
                const novo = limparRoteiroFalado(enxuto)
                if (novo && contarPalavras(novo) >= palavrasHardMin * 0.7) {
                    texto = cortarPorPalavras(novo, palavrasHardMax)
                    est = estimarDuracaoSegundos(texto, fontePrevista)
                }
            } catch (err) {
                console.log(`API resumo ajuste longo - ${msgErro(err)}`)
            }
        }
    }

    if (contarPalavras(texto) < 40) {
        texto = montarRoteiroLocalFallback(lista, nomeGrupo, analise)
        usouRoteiroLocal = true
        est = estimarDuracaoSegundos(texto, 'edge')
    }
    if (contarPalavras(texto) < 40) throw { erro: 'Não foi possível montar o comentário do grupo.' }

    console.log(
        `resumo grupo: ${contarPalavras(texto)} palavras, ~${est}s estimado, ` +
        `${lista.length} msgs, nível=${analise.nivel_conteudo}, local=${usouRoteiroLocal}`
    )

    const memoriaExtraida = extrairMemoriaDoRoteiro(texto, analise)
    const optsTts = {
        maxPalavras: palavrasHardMax + 80,
        minSegundos: usouRoteiroLocal ? 0 : RESUMO_DUR.minSeg,
        maxSegundos: RESUMO_DUR.maxSeg,
        forcarDuracaoMinima: !usouRoteiroLocal && conteudoRico && est >= RESUMO_DUR.minSeg * 0.85
    }

    try {
        const audio = await sintetizarAudioResumo(texto, optsTts)
        return {
            resultado: audio.resultado,
            roteiro: texto,
            totalMsgs: lista.length,
            ttsFonte: audio.fonte,
            mimetype: audio.mimetype || 'audio/ogg; codecs=opus',
            ptt: audio.ptt !== false,
            duracao: audio.duracao || 0,
            entrega: 'audio',
            memoria: memoriaExtraida,
            analiseNivel: analise.nivel_conteudo,
            roteiroLocal: usouRoteiroLocal
        }
    } catch (err) {
        console.log(`API resumo TTS final - ${msgErro(err)}`)
        throw {
            erro: 'Não foi possível gerar o áudio do resumo agora. Tenta de novo daqui a pouco.'
        }
    }
}


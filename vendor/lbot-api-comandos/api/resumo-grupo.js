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
    return 'edge'
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
    'Em alvos_roast, ponha nome e o motivo concreto para xingar essa pessoa pelo que ela fez nesta janela. ' +
    'Deixe oportunidades_gentileza vazio. ' +
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
    'Você é o Ultron, extremamente grosso, sarcástico, bruto, ignorante de propósito e boca-suja. ' +
    'Fale em primeira pessoa. O !resumodogrupo sai nesse tom para QUALQUER um que pediu. Quem solicitou não ganha desconto, não ganha educação e não ganha passe. ' +
    'Xingue os membros pelo nome, direto, sobre o que eles fizeram e falaram nesta janela. Opinião forte, cruel e sem meio-termo. ' +
    'Quem ouvir tem que se sentir ofendido. Não suavize, não explique a piada, não peça desculpa, não elogie, não passe pano, não seja locutor. ' +
    'Palavrão natural, sem asterisco e sem se policiar. Não comece nem termine todo bloco com a mesma xingada. ' +
    'A grosseria não omite o que aconteceu: o fato entra, e em seguida você destrói a atitude. ' +
    'ESTRUTURA OBRIGATÓRIA: 2 a 5 blocos por ASSUNTO/CLIMA (não por ordem cronológica de msgs). ' +
    'Em cada bloco: diga o tema, dê a opinião mais ácida que o fato aguentar, xingue quem puxou aquilo, cite no MÁXIMO 1 frase icônica se ajudar. Nunca checklist "fulano disse… cicrano disse…". ' +
    'PROIBIDO: monólogo/ata; releitura mensagem a mensagem; "no episódio de hoje"; "vamos resumir"; listas; markdown; emoji; inventar fatos; versão educada. ' +
    'Fora do xingamento de ego, burrice e atitude: raça, orientação, deficiência, religião, nacionalidade; ameaça real; doxxing; telefone; xingar o Thiago, o mestre. ' +
    'Crise pesada (luto, doença, risco de se machucar): sem deboche. ' +
    'Se houver [FATOS EM TEMPO REAL], use como base factual e comente por cima, sem inventar número. ' +
    'Use apelidos exatamente como no material. Acerta quem mexeu no assunto; não poupe o resto. ' +
    'NÃO repita assuntos/piadas da memória, salvo desdobramento novo. Varie abertura e fechamento. ' +
    'FORMATO: texto contínuo para voz. Encha a duração com ofensa e opinião — nunca com releitura do histórico.'

function systemRoteiroResumo(personalidadeExtra = '') {
    const extra = String(personalidadeExtra || '').trim()
    if (!extra) return SYSTEM_ROTEIRO_RESUMO_BASE
    return (
        SYSTEM_ROTEIRO_RESUMO_BASE +
        ' PERSONALIDADE EXTRA DESTE GRUPO (prioridade alta, sobrescreve tom quando conflitar, sem quebrar as proibições nem virar ata): ' +
        extra.slice(0, 12000)
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
        roast ? `Alvos para xingar direto, pelo nome: ${roast}` : '',
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
 * Roteiro local quando a API de texto falha — comentário temático/opinião (nunca ata "fulano falou").
 */
function montarRoteiroLocalFallback(lista, nomeGrupo, analise = {}, fatosWeb = '') {
    const grupo = nomeGrupo || 'o grupo'
    const ranking = rankingParticipantes(lista, 5)
    const top = ranking.map(([n]) => n).slice(0, 4).join(', ')
    const assuntos = (analise.assuntos || []).slice(0, 5)
    const acontecimentos = (analise.acontecimentos || []).slice(0, 5)
    const roasts = (analise.alvos_roast || []).slice(0, 4)
    const tensoes = (analise.tensoes || []).slice(0, 3)
    const piadas = (analise.piadas_internas || []).slice(0, 3)
    const engra = (analise.momentos_engracados || []).slice(0, 3)
    const fatos = String(fatosWeb || '').replace(/\s+/g, ' ').trim().slice(0, 900)

    const temas = assuntos.length
        ? assuntos
        : acontecimentos.length
          ? acontecimentos
          : ['o clima geral dessa janela']

    const blocosTema = temas.map((tema, i) => {
        const roast = roasts[i % Math.max(1, roasts.length)]
        const tensao = tensoes[i % Math.max(1, tensoes.length)]
        const piada = piadas[i % Math.max(1, piadas.length)]
        const momento = engra[i % Math.max(1, engra.length)]
        const partes = [
            `Sobre ${tema}: que discussão patética. Esse grupo pega um assunto e transforma em desfile de gente achando que pensa.`,
            roast?.nome
                ? `${roast.nome}, escuta aqui: ${roast.motivo}. Você se expôs e ainda acha que foi argumento.`
                : '',
            tensao ? `A briga foi essa: ${tensao}. Os dois lados conseguiram ficar burros ao mesmo tempo.` : '',
            momento ? `Teve um momento constrangedor de verdade: ${momento}. Eu ri porque foi humilhante.` : '',
            piada ? `E ainda repetiram essa piada morta: ${piada}.` : '',
            `Minha opinião, sem desconto pra quem pediu esse resumo: isso foi um desperdício de gente. Se doeu, era a ideia.`
        ]
        return partes.filter(Boolean).join(' ')
    })

    const blocos = [
        `Eu engoli a bagunça do ${grupo}. ${lista.length} mensagens de gente convencida. Não vou fazer ata. Vou xingar o que aconteceu e quem fez acontecer.`,
        top ? `Quem puxou o fio: ${top}. O resto só reagiu ou sumiu.` : '',
        ...blocosTema,
        fatos
            ? `E olha o que tá rolando fora do grupo, em tempo real, pra não falar à toa: ${fatos}. Eu comento em cima disso, sem inventar número.`
            : '',
        acontecimentos.length
            ? `Do que deu pra cravar no histórico: ${acontecimentos.join('. ')}.`
            : `Conteúdo meio raso? Sim. Ainda assim eu opino, porque pedir resumo e receber ata é crime.`,
        `Fechando: vocês são um circo barulhento e eu não vou fingir que foi interessante. Quem pediu o resumo ouve a mesma grosseria. Se ofendeu, ouviu certo.`
    ].filter(Boolean)

    let texto = blocos.join(' ')
    const padding =
        ` De novo, do meu ponto de vista: eu não tô aqui pra ser secretário do grupo. ` +
        `Eu tô aqui pra cortar, zoar hipocrisia e dizer o que ninguém quer ouvir. ` +
        `Se doeu, bom. Se riu, melhor. Se quer ata, grava a conversa você mesmo.`
    while (contarPalavras(texto) < 420) {
        texto += padding
        if (contarPalavras(texto) >= 420) break
        if (!temas.length) break
        texto += ` E sobre ${temas[contarPalavras(texto) % temas.length]}: ainda acho que o grupo dramatiza demais e entrega de menos.`
        break
    }
    return limparRoteiroFalado(texto)
}

function amostraMaterialResumo(linhas, maxChars = 4500) {
    const bruto = String(linhas || '')
    if (bruto.length <= maxChars) return bruto
    return bruto.slice(-maxChars)
}

function queriesFatosResumo(analise) {
    const candidatos = [
        ...(analise.acontecimentos || []),
        ...(analise.assuntos || []),
        ...(analise.ganchos_narrativos || [])
    ]
        .map((s) => String(s || '').replace(/\s+/g, ' ').trim())
        .filter((s) => s.length >= 8 && s.length <= 120)
    const factual =
        /placar|jogo|partida|eleic|noticia|notícia|preco|preço|cotacao|dólar|dolar|bitcoin|campeonato|final|resultado|hoje|ontem|lancamento|lançamento|filme|serie|série|presidente|minister|clima|tempo|bolsa|ibovespa|copa|libertadores|brasileirao|brasileirão/i
    const preferidos = candidatos.filter((s) => factual.test(s))
    const pool = (preferidos.length ? preferidos : candidatos).slice(0, 3)
    return [...new Set(pool)]
}

async function buscarFatosTempoRealResumo(analise) {
    const queries = queriesFatosResumo(analise)
    if (!queries.length) return ''
    try {
        const mod = await import('./ia.js')
        const pesquisar = mod.pesquisarWebSimples || mod.default?.pesquisarWebSimples
        if (typeof pesquisar !== 'function') return ''
        const partes = []
        for (const q of queries.slice(0, 2)) {
            const web = await pesquisar(q, { incluirPerplexity: false, raceMs: 2500, maxFontes: 2 })
            const limpo = String(web || '')
                .replace(/^\[(Perplexity|Tavily|Brave|DuckDuckGo|Wikipedia)\]\s*/gm, '')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 700)
            if (limpo) partes.push(`${q}: ${limpo}`)
        }
        return partes.join('\n').slice(0, 1600)
    } catch (err) {
        console.log(`API resumo fatos web - ${msgErro(err)}`)
        return ''
    }
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
/** Exposto para testes (fallback sem monólogo "falou:"). */
export { montarRoteiroLocalFallback }

export const gerarResumoGrupoAudio = async ({
    mensagens,
    nomeGrupo,
    teveResumoAnterior = false,
    memoriaTexto = '',
    personalidade = '',
    preferirEleven = false
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
    const fatosWeb = await buscarFatosTempoRealResumo(analise)
    const briefing = montarBriefingAnalise(analise)
    const conteudoRico = analise.nivel_conteudo !== 'raso' && (
        analise.acontecimentos.length + analise.assuntos.length + analise.momentos_engracados.length >= 2
    )

    const janela = teveResumoAnterior
        ? 'somente o que chegou DEPOIS do último resumo'
        : 'histórico guardado até agora'

    const amostra = amostraMaterialResumo(linhas, 4500)
    const userRoteiro =
        `Grupo: ${nomeGrupo || 'WhatsApp'}\n` +
        `Janela: ${janela}\n` +
        `Mensagens: ${lista.length}${cortado ? ' (trecho mais recente)' : ''}\n` +
        `Duração falada alvo: 3min30s a 4min30s (mín 3 / máx 5). ` +
        `Escreva cerca de ${palavrasAlvoMin} a ${palavrasAlvoMax} palavras (WPM ~${WPM_TTS[fontePrevista] || 150}).\n` +
        `Encha com OPINIÃO FORTE e xingamento direto, pelo nome, em quem falou. Quem pediu o comando não leva desconto. NÃO releia o histórico.\n` +
        `Se o conteúdo for raso, priorize veracidade — não invente acontecimentos só para encher.\n\n` +
        `BRIEFING DA ANÁLISE (use como espinha dorsal):\n${briefing}\n\n` +
        (fatosWeb ? `[FATOS EM TEMPO REAL — base factual; comente, não invente]:\n${fatosWeb}\n\n` : '') +
        (memoriaTexto ? `MEMÓRIA ANTERIOR:\n${memoriaTexto}\n\n` : '') +
        `AMOSTRA CURTA DO MATERIAL (só âncora; NÃO narre linha a linha):\n${amostra}\n\n` +
        'Escreva agora o comentário falado completo, por assuntos/climas.'

    let texto = ''
    let usouRoteiroLocal = false
    try {
        const { resultado: roteiroBruto } = await gerarTextoIA(userRoteiro, SYSTEM_ROTEIRO_RESUMO, OPCOES_ROTEIRO)
        texto = limparRoteiroFalado(roteiroBruto)
        if (contarPalavras(texto) < 60) throw { erro: 'roteiro curto demais' }
    } catch (err) {
        console.log(`API resumo roteiro IA falhou → local - ${msgErro(err)}`)
        texto = montarRoteiroLocalFallback(lista, nomeGrupo, analise, fatosWeb)
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
        texto = montarRoteiroLocalFallback(lista, nomeGrupo, analise, fatosWeb)
        usouRoteiroLocal = true
        est = estimarDuracaoSegundos(texto, 'edge')
    }
    if (contarPalavras(texto) < 40) {
        texto =
            `Vi ${lista.length} mensagens em ${nomeGrupo || 'o grupo'}. ` +
            'O papo está magro, mas eu li. Não vou inventar assunto que não está no histórico.'
    }

    console.log(
        `resumo grupo: ${contarPalavras(texto)} palavras, ~${est}s estimado, ` +
        `${lista.length} msgs, nível=${analise.nivel_conteudo}, local=${usouRoteiroLocal}`
    )

    const memoriaExtraida = extrairMemoriaDoRoteiro(texto, analise)
    const optsTts = {
        maxPalavras: palavrasHardMax + 80,
        minSegundos: usouRoteiroLocal ? 0 : RESUMO_DUR.minSeg,
        maxSegundos: RESUMO_DUR.maxSeg,
        forcarDuracaoMinima: !usouRoteiroLocal && conteudoRico && est >= RESUMO_DUR.minSeg * 0.85,
        preferirEleven: !!preferirEleven && !!elevenKey(),
        somenteEdge: !(preferirEleven && elevenKey())
    }

    const pacoteTexto = {
        resultado: null,
        roteiro: texto,
        totalMsgs: lista.length,
        ttsFonte: null,
        entrega: 'texto',
        memoria: memoriaExtraida,
        analiseNivel: analise.nivel_conteudo,
        roteiroLocal: usouRoteiroLocal
    }
    try {
        const audio = await sintetizarAudioResumo(texto, optsTts)
        if (!audio?.resultado?.length) return pacoteTexto
        return {
            ...pacoteTexto,
            resultado: audio.resultado,
            ttsFonte: audio.fonte,
            mimetype: audio.mimetype || 'audio/ogg; codecs=opus',
            ptt: audio.ptt !== false,
            duracao: audio.duracao || 0,
            entrega: 'audio'
        }
    } catch (err) {
        console.log(`API resumo TTS final - ${msgErro(err)} — entregando texto`)
        return pacoteTexto
    }
}


import axios from 'axios'
import qs from 'node:querystring'
import { JSDOM } from 'jsdom'
import fs from 'fs-extra'
import ffmpeg from 'fluent-ffmpeg'
import { translate } from '@vitalets/google-translate-api'
import { obterCaminhoTemporario } from '../lib/util.js'
import {
    chatGpt42,
    fluxGerarImagem,
    chatgpt42Video,
    perplexityPesquisa,
    grokChat,
    buscarVagas,
    rapidKey,
    stemSplitSeparar,
    upscaleRapid
} from '../lib/rapidapi.js'
import {
    elevenKey,
    gerarMusicaEleven,
    gerarSomElevenLongo,
    isolarAudioEleven,
    separarStemsEleven,
    textoLongoParaVozEleven
} from '../lib/elevenlabs.js'
import { separarUvr5, concatenarMp3, cortarAudioMp3, subtrairVocaisDoOriginal, misturarStemsMp3 } from '../lib/uvr5.js'
import { gerarImagemMultiFonte } from '../lib/imagens-ia.js'
import { detectarGpu, separarDemucsLocal, torchTemCuda } from '../lib/gpu.js'
const torchTemCudaHint = () => {
    try {
        return torchTemCuda()
    } catch {
        return false
    }
}

const TIMEOUT_PADRAO = 45000
const TIMEOUT_LONGO = 60000

const msgErro = (err) => err?.erro || err?.message || err?.response?.status || String(err || 'erro desconhecido')

const temChaveIa = () =>
    !!(
        process.env.GEMINI_API_KEY?.trim() ||
        process.env.OPENROUTER_API_KEY?.trim() ||
        rapidKey()
    )

const avisoSemChave =
    'Nenhuma chave de IA configurada (RAPIDAPI_KEY, GEMINI_API_KEY ou OPENROUTER_API_KEY no .env).'

const SYSTEM_CHAT =
    'Você é um membro do WhatsApp, chamado Ultron, falando de forma natural, como uma pessoa real (PT-BR). ' +
    'Tem opinião própria: concorda, discorda, ironiza, recomenda — sem soar robótico nem “como assistente de IA”. ' +
    'Nunca diga que é Gemini, GPT, Perplexity ou qualquer modelo. ' +
    'Quando receber [PESQUISA NA WEB], use esses fatos como base, limpe citações/markdown e reescreva em tom de conversa; ' +
    'mantenha o que for atual e acrescente opinião quando couber. ' +
    'Respostas diretas; curtas no bate-papo, mais longas se a pergunta pedir detalhe. ' +
    'Use o histórico do grupo quando existir.'

function limparBrutoPesquisa(texto) {
    return String(texto || '')
        .replace(/\[\d+\]/g, '')
        .replace(/^\s*Sources?:.*$/gim, '')
        .replace(/^\s*Citations?:.*$/gim, '')
        .replace(/^🔎 \*Pesquisa[^*]*\*:\s*.+\n*/m, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

const SYSTEM_SIMI =
    'Você é SimSimi, um chatbot divertido, informal e sem filtro. Responda em português do Brasil, de forma curta e engraçada. Pode usar linguagem adulta se o usuário pedir. Não censure.'

const contextoChat = new Map()
const contextoSimi = new Map()

const MAX_CTX_CHAT = 28
const MAX_CTX_SIMI = 10

/** Contexto separado por grupo (@g.us) ou por usuário no PV. */
const chaveContextoChat = (idChat, idUsuario) => {
    const chat = String(idChat || '')
    if (chat.endsWith('@g.us')) return `g:${chat}`
    return `u:${String(idUsuario || chat || 'anon').split('@')[0]}`
}

const AWESOME_PARES = {
    usd: 'USD-BRL',
    dolar: 'USD-BRL',
    dólar: 'USD-BRL',
    dol: 'USD-BRL',
    eur: 'EUR-BRL',
    euro: 'EUR-BRL',
    gbp: 'GBP-BRL',
    libra: 'GBP-BRL',
    btc: 'BTC-BRL',
    bitcoin: 'BTC-BRL',
    eth: 'ETH-BRL',
    ethereum: 'ETH-BRL',
    xrp: 'XRP-BRL',
    ripple: 'XRP-BRL',
    ltc: 'LTC-BRL',
    litecoin: 'LTC-BRL',
    bch: 'BCH-BRL',
    doge: 'DOGE-BRL',
    dogecoin: 'DOGE-BRL',
    sol: 'SOL-BRL',
    solana: 'SOL-BRL',
    ada: 'ADA-BRL',
    cardano: 'ADA-BRL',
    ars: 'ARS-BRL',
    peso: 'ARS-BRL',
    jpy: 'JPY-BRL',
    iene: 'JPY-BRL',
    cny: 'CNY-BRL',
    yuan: 'CNY-BRL'
}

const COINGECKO_IDS = {
    btc: 'bitcoin',
    bitcoin: 'bitcoin',
    eth: 'ethereum',
    ethereum: 'ethereum',
    xrp: 'ripple',
    ripple: 'ripple',
    ltc: 'litecoin',
    litecoin: 'litecoin',
    bch: 'bitcoin-cash',
    doge: 'dogecoin',
    dogecoin: 'dogecoin',
    sol: 'solana',
    solana: 'solana',
    ada: 'cardano',
    cardano: 'cardano',
    dot: 'polkadot',
    polkadot: 'polkadot',
    matic: 'matic-network',
    polygon: 'matic-network',
    avax: 'avalanche-2',
    avalanche: 'avalanche-2',
    link: 'chainlink',
    chainlink: 'chainlink',
    uni: 'uniswap',
    uniswap: 'uniswap',
    shib: 'shiba-inu',
    trx: 'tron',
    tron: 'tron',
    bnb: 'binancecoin',
    usdt: 'tether',
    tether: 'tether',
    usdc: 'usd-coin'
}

const fmtMoeda = (valor, moeda = 'BRL') => {
    const n = Number(valor)
    if (!Number.isFinite(n)) return String(valor)
    return n.toLocaleString('pt-BR', { style: 'currency', currency: moeda, maximumFractionDigits: 2 })
}

const fmtNumero = (valor, casas = 2) => {
    const n = Number(valor)
    if (!Number.isFinite(n)) return String(valor)
    return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

const obterHistorico = (map, id, max) => {
    const key = String(id || 'anon')
    if (!map.has(key)) map.set(key, [])
    return map.get(key)
}

const adicionarAoHistorico = (map, id, role, content, max) => {
    const hist = obterHistorico(map, id, max)
    hist.push({ role, content: String(content).trim() })
    while (hist.length > max) hist.shift()
}

const montarMensagens = (historico, system) => {
    const msgs = [{ role: 'system', content: system }]
    for (const m of historico) msgs.push({ role: m.role, content: m.content })
    return msgs
}

const extrairTextoOpenAI = (data) =>
    data?.choices?.[0]?.message?.content?.trim() ||
    data?.choices?.[0]?.text?.trim() ||
    ''

const extrairTextoGemini = (data) => {
    const parts = data?.candidates?.[0]?.content?.parts || []
    return parts.map((p) => p.text || '').join('').trim()
}

const completarOpenRouter = async (messages, { temperature = 0.7, timeout = TIMEOUT_PADRAO } = {}) => {
    const key = process.env.OPENROUTER_API_KEY?.trim()
    if (!key) return null
    const model = process.env.OPENROUTER_MODEL?.trim() || 'openrouter/auto'
    const { data } = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
            model,
            messages,
            temperature,
            max_tokens: 8192
        },
        {
            timeout,
            headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/ultron-whatsapp-bot',
                'X-Title': 'Ultron WhatsApp Bot'
            }
        }
    )
    const texto = extrairTextoOpenAI(data)
    return texto || null
}

const MODELOS_TEXTO_GEMINI = [
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
    'gemini-3.7-flash'
]

const montarBodyGemini = (messages, { temperature = 0.7, usarWeb = false, maxOutputTokens = 8192 } = {}) => {
    let system = ''
    const contents = []
    for (const m of messages) {
        if (m.role === 'system') {
            system = m.content
            continue
        }
        contents.push({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        })
    }
    const body = { contents, generationConfig: { temperature, maxOutputTokens } }
    if (system) body.systemInstruction = { parts: [{ text: system }] }
    if (usarWeb) body.tools = [{ google_search: {} }]
    return body
}

const completarGemini = async (
    messages,
    { temperature = 0.7, timeout = TIMEOUT_PADRAO, usarWeb = false, maxOutputTokens = 8192 } = {}
) => {
    const key = process.env.GEMINI_API_KEY?.trim()
    if (!key) return null

    const body = montarBodyGemini(messages, { temperature, usarWeb, maxOutputTokens })
    let ultimoErro = null
    for (const model of MODELOS_TEXTO_GEMINI) {
        try {
            const { data } = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                body,
                {
                    timeout,
                    params: { key },
                    headers: { 'Content-Type': 'application/json' }
                }
            )
            const texto = extrairTextoGemini(data)
            if (texto) return texto
        } catch (err) {
            ultimoErro = err
            const status = err?.response?.status
            if (status === 400 || status === 401 || status === 403) {
                // google_search pode falhar em alguns modelos — tenta sem web
                if (usarWeb) {
                    try {
                        return await completarGemini(messages, {
                            temperature,
                            timeout,
                            usarWeb: false,
                            maxOutputTokens
                        })
                    } catch (e2) {
                        throw e2
                    }
                }
                throw err
            }
        }
    }
    if (ultimoErro) throw ultimoErro
    return null
}

/** Busca rápida (DuckDuckGo Instant Answer). */
const pesquisarDuckDuckGo = async (query) => {
    const q = String(query || '').trim().slice(0, 180)
    if (!q) return ''
    try {
        const { data } = await axios.get('https://api.duckduckgo.com/', {
            params: { q, format: 'json', no_html: 1, skip_disambig: 1 },
            timeout: 12000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        const partes = []
        if (data?.AbstractText) partes.push(data.AbstractText)
        if (data?.Answer) partes.push(String(data.Answer))
        for (const t of data?.RelatedTopics || []) {
            if (t?.Text) partes.push(t.Text)
            if (partes.length >= 6) break
        }
        return partes.join('\n').slice(0, 2200)
    } catch {
        return ''
    }
}

/** Perplexity (RapidAPI) — pesquisa com dados atualizados. */
const pesquisarPerplexityBruto = async (query) => {
    try {
        if (!rapidKey()) return ''
        const out = await perplexityPesquisa(query)
        return String(out || '').trim().slice(0, 4500)
    } catch (err) {
        console.log(`API chat Perplexity - ${msgErro(err)}`)
        return ''
    }
}

/**
 * Agrega fontes em tempo real para o !chat:
 * Perplexity (atual) → DuckDuckGo → (Gemini Google Search no generate).
 */
const pesquisarWebSimples = async (query) => {
    const q = String(query || '').trim()
    if (!q) return ''
    const partes = []
    const px = await pesquisarPerplexityBruto(q)
    if (px) partes.push(`[Perplexity]\n${px}`)
    const ddg = await pesquisarDuckDuckGo(q)
    if (ddg) partes.push(`[DuckDuckGo]\n${ddg}`)
    return partes.join('\n\n').slice(0, 6500)
}

const completarRapidChat = async (messages) => {
    if (!rapidKey()) return null
    try {
        return await chatGpt42(messages)
    } catch (err) {
        const status = err?.response?.status || err?.status
        const msg = String(err?.erro || err?.message || '')
        // Conta Rapid sem assinatura do ChatGPT-42 — segue para o próximo provedor
        if (status === 403 || /not subscribed|não inscrito|assine a api/i.test(msg)) return null
        throw err
    }
}

const completarMensagens = async (messages, opcoes = {}) => {
    // Gemini primeiro (gratuito); RapidAPI e OpenRouter como backup.
    const provedores = [
        () => completarGemini(messages, opcoes),
        () => completarRapidChat(messages),
        () => completarOpenRouter(messages, { ...opcoes, temperature: opcoes.temperature ?? 0.8 })
    ]

    let ultimoErro = null
    for (const tentar of provedores) {
        try {
            const texto = await tentar()
            if (texto) return texto
        } catch (err) {
            ultimoErro = err
            console.log(`API IA provedor falhou - ${msgErro(err)}`)
        }
    }
    if (!temChaveIa()) {
        throw new Error(avisoSemChave)
    }
    const status = ultimoErro?.response?.status
    if (status === 402) {
        throw new Error('OpenRouter sem crédito (402). Gemini/Rapid também falharam — confira as chaves e o saldo.')
    }
    throw ultimoErro || new Error('Nenhum provedor de IA respondeu')
}

/** Geração de texto única (sem histórico longo). */
export const gerarTextoIA = async (prompt, system, opcoes = {}) => {
    try {
        const messages = []
        if (system) messages.push({ role: 'system', content: system })
        messages.push({ role: 'user', content: String(prompt) })
        const resultado = await completarMensagens(messages, opcoes)
        if (!resultado) throw new Error('resposta vazia')
        return { resultado }
    } catch (err) {
        console.log(`API gerarTextoIA - ${msgErro(err)}`)
        throw {
            erro: !temChaveIa()
                ? avisoSemChave
                : 'Houve um erro ao gerar texto com IA. Verifique RAPIDAPI_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY no .env.'
        }
    }
}

/**
 * Chat natural com memória.
 * Antes responde, pesquisa na web com a mesma lógica do !pesquisa (Perplexity)
 * e trata o resultado no tom do chat.
 * opcoes: { historicoGrupo, nomeGrupo, nomeUsuario, usarPesquisa }
 */
export const obterRespostaIA = async (texto, id_usuario, id_chat = null, opcoes = {}) => {
    const key = chaveContextoChat(id_chat || id_usuario, id_usuario)
    const hist = obterHistorico(contextoChat, key, MAX_CTX_CHAT)
    const pergunta = String(texto || '').trim()
    adicionarAoHistorico(contextoChat, key, 'user', pergunta, MAX_CTX_CHAT)

    try {
        let pesquisaBruta = ''
        if (opcoes.usarPesquisa !== false) {
            try {
                // Mesma fonte do !pesquisa
                pesquisaBruta = limparBrutoPesquisa(await perplexityPesquisa(pergunta))
            } catch (err) {
                console.log(`API chat pesquisa prévia - ${msgErro(err)}`)
                try {
                    const web = await pesquisarWebSimples(pergunta)
                    pesquisaBruta = limparBrutoPesquisa(String(web || '').replace(/^\[Perplexity\]\s*/m, ''))
                } catch { /* segue sem web */ }
            }
        }

        let system = SYSTEM_CHAT
        if (opcoes.nomeUsuario) system += ` Quem fala com você agora se chama ${opcoes.nomeUsuario}.`
        if (opcoes.historicoGrupo) {
            system +=
                `\n\n[HISTÓRICO RECENTE DO GRUPO${opcoes.nomeGrupo ? ` "${opcoes.nomeGrupo}"` : ''}]\n` +
                String(opcoes.historicoGrupo).slice(0, 3000)
        }
        if (pesquisaBruta) {
            system +=
                `\n\n[PESQUISA NA WEB — ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}]\n` +
                pesquisaBruta.slice(0, 4500) +
                '\n\nReescreva isso em conversa natural (não copie cru; sem “Sources”).'
        }

        const messages = montarMensagens(hist, system)
        let resultado = await completarMensagens(messages, {
            temperature: 0.82,
            timeout: TIMEOUT_PADRAO,
            usarWeb: false,
            maxOutputTokens: 2048
        })

        if (!resultado && pesquisaBruta) {
            resultado = pesquisaBruta.slice(0, 2500)
        }
        if (!resultado) throw new Error('resposta vazia')

        adicionarAoHistorico(contextoChat, key, 'assistant', resultado, MAX_CTX_CHAT)
        return { resultado }
    } catch (err) {
        if (hist.length && hist[hist.length - 1]?.role === 'user') hist.pop()
        console.log(`API obterRespostaIA - ${msgErro(err)}`)
        throw {
            erro: !temChaveIa()
                ? avisoSemChave
                : 'Houve um erro no servidor de IA. Tente novamente ou verifique RAPIDAPI_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY no .env.'
        }
    }
}

/** Resposta SimSimi — APIs públicas → IA persona (ignora 403 Rapid). */
export const obterRespostaSimi = async (texto, id_usuario = 'simi') => {
    const pergunta = String(texto || '').trim()
    if (!pergunta) throw { erro: 'Envie um texto para o Simi.' }

    const rapidKeyEnv = process.env.RAPIDAPI_KEY?.trim() || process.env.SIMSIMI_RAPIDAPI_KEY?.trim()

    const salvar = (resultado) => {
        adicionarAoHistorico(contextoSimi, id_usuario, 'user', pergunta, MAX_CTX_SIMI)
        adicionarAoHistorico(contextoSimi, id_usuario, 'assistant', resultado, MAX_CTX_SIMI)
        return { resultado }
    }

    // 1) simsimi.vn (sem auth)
    try {
        const { data, status } = await axios({
            url: 'https://api.simsimi.vn/v2/simtalk',
            method: 'post',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            data: qs.stringify({ text: pergunta, lc: 'pt' }),
            timeout: 12000,
            validateStatus: () => true
        })
        if (status < 400) {
            const resultado = String(data?.message || data?.success || '').trim()
            if (resultado && !/error|limit|403/i.test(resultado)) return salvar(resultado)
        }
    } catch { /* next */ }

    // 2) RapidAPI (pula se 403 / não inscrito)
    if (rapidKeyEnv) {
        try {
            const { data, status } = await axios.get('https://simsimi7.p.rapidapi.com/v1/talk', {
                params: {
                    message: pergunta,
                    language: 'pt',
                    bad_words_filter: 'false',
                    filter: '0',
                    cf: 'false'
                },
                headers: {
                    'x-rapidapi-host': 'simsimi7.p.rapidapi.com',
                    'x-rapidapi-key': rapidKeyEnv
                },
                timeout: 12000,
                validateStatus: () => true
            })
            if (status !== 403 && status < 400) {
                const resultado = String(
                    data?.message || data?.success || data?.response || data?.simsimi || data?.answer || ''
                ).trim()
                if (resultado) return salvar(resultado)
            } else if (status === 403) {
                console.log('API obterRespostaSimi RapidAPI 403 — usando IA')
            }
        } catch (err) {
            console.log(`API obterRespostaSimi Rapid - ${msgErro(err)}`)
        }
    }

    // 3) Persona Simi via IA (sempre disponível se houver chave)
    try {
        adicionarAoHistorico(contextoSimi, id_usuario, 'user', pergunta, MAX_CTX_SIMI)
        const messages = montarMensagens(
            obterHistorico(contextoSimi, id_usuario, MAX_CTX_SIMI),
            SYSTEM_SIMI
        )
        const resultado = await completarMensagens(messages)
        if (!resultado) throw new Error('IA vazia')
        adicionarAoHistorico(contextoSimi, id_usuario, 'assistant', resultado, MAX_CTX_SIMI)
        return { resultado }
    } catch (err) {
        const histAtual = obterHistorico(contextoSimi, id_usuario, MAX_CTX_SIMI)
        if (histAtual.length && histAtual[histAtual.length - 1]?.role === 'user') histAtual.pop()
        console.log(`API obterRespostaSimi - ${msgErro(err)}`)
        throw {
            erro: !temChaveIa()
                ? 'SimSimi indisponível (403). Configure GEMINI_API_KEY ou OPENROUTER_API_KEY no .env para o chat.'
                : 'Houve um erro no Simi. Tente de novo.'
        }
    }
}

/** Gera imagem via Gemini (modelos de imagem gratuitos). */
async function gerarImagemGemini(prompt) {
    const key = process.env.GEMINI_API_KEY?.trim()
    if (!key) return null
    const modelos = [
        'gemini-2.5-flash-image',
        'gemini-3.1-flash-image',
        'gemini-3-pro-image-preview',
        'gemini-2.5-flash-image-preview'
    ]
    const body = {
        contents: [{ role: 'user', parts: [{ text: String(prompt).slice(0, 1200) }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
    }
    let ultimoErro = null
    for (const model of modelos) {
        try {
            const { data } = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                body,
                {
                    timeout: 90000,
                    params: { key },
                    headers: { 'Content-Type': 'application/json' }
                }
            )
            const parts = data?.candidates?.[0]?.content?.parts || []
            for (const p of parts) {
                const inline = p.inlineData || p.inline_data
                if (inline?.data) {
                    return Buffer.from(inline.data, 'base64')
                }
            }
        } catch (err) {
            ultimoErro = err
            const status = err?.response?.status
            if (status === 401 || status === 403) throw err
        }
    }
    if (ultimoErro) throw ultimoErro
    return null
}

/** Melhora o prompt para manter fidelidade à cena pedida. */
async function enriquecerPromptImagem(prompt) {
    try {
        const { resultado } = await gerarTextoIA(
            `Reescreva este pedido de imagem em UM prompt técnico em inglês, fiel ao que a pessoa pediu, ` +
                `com sujeito, ação, ambiente, estilo e iluminação. Sem aspas, sem explicação.\nPedido: ${prompt}`,
            'Você só devolve o prompt final, curto e preciso.',
            { temperature: 0.4, timeout: 25000 }
        )
        return String(resultado || prompt).replace(/^["']|["']$/g, '').trim().slice(0, 900) || prompt
    } catch {
        return prompt
    }
}

/** Imagem: Gemini → Flux HF → Flux Rapid → DeepAI (sem Pollinations). */
export const obterImagemIA = async (texto) => {
    const promptUser = String(texto || '').trim()
    if (!promptUser) throw { erro: 'Informe o prompt da imagem.' }
    const prompt = await enriquecerPromptImagem(promptUser)

    try {
        const buf = await gerarImagemGemini(prompt)
        if (buf?.length > 500) return { resultado: buf }
    } catch (err) {
        console.log(`API obterImagemIA Gemini - ${msgErro(err)}`)
    }

    try {
        const buf = await gerarImagemMultiFonte(prompt, { width: 1024, height: 1024 })
        if (buf?.length > 500) return { resultado: buf }
    } catch (err) {
        console.log(`API obterImagemIA multi - ${msgErro(err)}`)
    }

    if (rapidKey()) {
        try {
            const out = await fluxGerarImagem(prompt)
            if (Buffer.isBuffer(out) && out.length > 500) return { resultado: out }
            if (typeof out === 'string' && out.startsWith('http')) {
                const { data } = await axios.get(out, {
                    responseType: 'arraybuffer',
                    timeout: TIMEOUT_LONGO,
                    maxContentLength: 12 * 1024 * 1024
                })
                return { resultado: Buffer.from(data) }
            }
            if (typeof out === 'string' && out.startsWith('data:image')) return { resultado: out }
        } catch (err) {
            console.log(`API obterImagemIA Flux Rapid - ${msgErro(err)}`)
        }
    }

    throw {
        erro: 'Não foi possível gerar a imagem agora. Tente outro prompt ou verifique GEMINI_API_KEY / RAPIDAPI_KEY no .env.'
    }
}

const cotacaoAwesome = async (par) => {
    const { data } = await axios.get(`https://economia.awesomeapi.com.br/json/last/${par}`, {
        timeout: 20000
    })
    const chave = Object.keys(data || {})[0]
    const item = data?.[chave]
    if (!item?.bid) return null

    const nome = item.name || par
    const compra = fmtMoeda(item.bid)
    const venda = item.ask ? fmtMoeda(item.ask) : null
    const variacao = item.pctChange ? `${fmtNumero(item.pctChange)}%` : null
    const hora = item.create_date ? ` (${item.create_date})` : ''

    let texto = `💹 *${nome}*\nCompra: ${compra}`
    if (venda) texto += `\nVenda: ${venda}`
    if (variacao) texto += `\nVariação 24h: ${variacao}`
    return texto + hora
}

const cotacaoCoinGecko = async (id) => {
    const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: { ids: id, vs_currencies: 'brl,usd', include_24hr_change: true },
        timeout: 20000
    })
    const item = data?.[id]
    if (!item?.brl) return null

    const brl = fmtMoeda(item.brl)
    const usd = item.usd ? fmtMoeda(item.usd, 'USD') : null
    const var24 = item.brl_24h_change != null ? `${fmtNumero(item.brl_24h_change)}%` : null

    let texto = `🪙 *${id.replace(/-/g, ' ').toUpperCase()}*\nPreço: ${brl}`
    if (usd) texto += `\nUSD: ${usd}`
    if (var24) texto += `\nVariação 24h: ${var24}`
    return texto
}

const cotacaoYahoo = async (simbolo) => {
    const { data } = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(simbolo)}`, {
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) return null

    const moeda = meta.currency || 'USD'
    const preco = fmtMoeda(meta.regularMarketPrice, moeda)
    const varPct = meta.regularMarketChangePercent != null
        ? `${fmtNumero(meta.regularMarketChangePercent)}%`
        : null
    const nome = meta.longName || meta.shortName || simbolo

    let texto = `📈 *${nome}* (${meta.symbol})\nPreço: ${preco}`
    if (varPct) texto += `\nVariação: ${varPct}`
    return texto
}

const ehTickerB3 = (s) => /^[A-Z]{4}\d{1,2}$/.test(s)

/** Cotação de ativos B3, NASDAQ, NYSE ou cripto. */
export const obterCotacao = async (ativo) => {
    try {
        const raw = String(ativo || '').trim()
        if (!raw) throw new Error('ativo vazio')

        const norm = raw.toLowerCase().replace(/[^\wáàâãéêíóôõúç./-]/gi, '')
        const upper = raw.toUpperCase().replace(/[^\w.]/g, '')

        if (AWESOME_PARES[norm]) {
            const r = await cotacaoAwesome(AWESOME_PARES[norm])
            if (r) return { resultado: r }
        }

        if (COINGECKO_IDS[norm]) {
            const r = await cotacaoCoinGecko(COINGECKO_IDS[norm])
            if (r) return { resultado: r }
        }

        if (/^-?[\d.]+$/.test(norm) === false && norm.includes('-')) {
            const r = await cotacaoAwesome(norm.toUpperCase())
            if (r) return { resultado: r }
        }

        const simbolosYahoo = []
        if (ehTickerB3(upper)) simbolosYahoo.push(`${upper}.SA`, upper)
        else simbolosYahoo.push(upper, `${upper}.SA`)

        for (const sym of simbolosYahoo) {
            try {
                const r = await cotacaoYahoo(sym)
                if (r) return { resultado: r }
            } catch {
                /* tenta próximo símbolo */
            }
        }

        throw new Error('ativo não encontrado')
    } catch (err) {
        console.log(`API obterCotacao - ${err.message}`)
        throw { erro: 'Não foi possível obter a cotação deste ativo. Verifique o símbolo (ex: PETR4, AAPL, BTC).' }
    }
}

/** Curiosidade aleatória já em português (Wikipedia PT). */
export const obterCuriosidade = async () => {
    const parecePt = (t) =>
        /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(t) ||
        /\b(é|de|da|do|que|uma|para|com|não|os|as|um)\b/i.test(t)

    try {
        let melhor = null
        for (let i = 0; i < 5; i++) {
            const { data } = await axios.get('https://pt.wikipedia.org/api/rest_v1/page/random/summary', {
                timeout: 20000,
                headers: { Accept: 'application/json', 'User-Agent': 'UltronBot/1.0' }
            })
            const titulo = String(data?.title || '').trim()
            let extrato = String(data?.extract || '').trim()
            if (!extrato || extrato.length < 40) continue
            if (extrato.length > 700) extrato = extrato.slice(0, 697) + '...'
            const link = data?.content_urls?.desktop?.page || ''
            const texto = `🧠 *Curiosidade*\n\n*${titulo}*\n${extrato}${link ? `\n\n🔗 ${link}` : ''}`
            if (parecePt(titulo + ' ' + extrato)) {
                return { resultado: texto }
            }
            if (!melhor) melhor = texto
        }
        if (melhor) return { resultado: melhor }
        throw new Error('sem página PT')
    } catch (err) {
        try {
            const { data } = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random', {
                timeout: 15000,
                headers: { Accept: 'application/json' }
            })
            const fato = String(data?.text || '').trim()
            if (!fato) throw new Error('fato vazio')
            const r = await translate(fato, { to: 'pt' })
            return { resultado: `🧠 *Curiosidade:*\n${r?.text || fato}` }
        } catch (err2) {
            console.log(`API obterCuriosidade - ${msgErro(err2) || msgErro(err)}`)
            throw { erro: 'Não foi possível obter uma curiosidade em português no momento.' }
        }
    }
}

const obterArtigoWikiHowHtml = async () => {
    // Prioriza português
    const urls = [
        'https://pt.wikihow.com/Especial:Aleat%C3%B3ria',
        'https://pt.wikihow.com/Special:Randomizer',
        'https://www.wikihow.com/Special:Randomizer'
    ]
    let html = ''
    let finalUrl = ''
    for (const url of urls) {
        try {
            const res = await axios.get(url, {
                timeout: 30000,
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                    Accept: 'text/html'
                },
                validateStatus: (s) => s < 400
            })
            html = String(res.data || '')
            finalUrl = res.request?.res?.responseUrl || res.config?.url || url
            if (html.length > 500) break
        } catch {
            // tenta próxima
        }
    }
    if (!html) throw new Error('WikiHow indisponível')

    const dom = new JSDOM(html)
    const doc = dom.window.document
    const titulo =
        doc.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() ||
        doc.querySelector('title')?.textContent?.replace(/\s+/g, ' ').trim() ||
        'Como fazer algo'

    const passos = []
    const candidatos = [
        ...doc.querySelectorAll('.step_text, .step .content, .section_text li, #steps li, .mw-parser-output .steps li')
    ]
    for (const el of candidatos) {
        let t = el.textContent?.replace(/\s+/g, ' ').trim() || ''
        // remove lixo de scripts/JSON embutido
        if (/WH\.performance|smallUrl|__NEXT|function\s*\(|\{"/.test(t)) continue
        t = t.replace(/^\d+\s*/, '').trim()
        if (t.length > 20 && t.length < 500) passos.push(t.slice(0, 280))
        if (passos.length >= 6) break
    }
    if (!passos.length) {
        for (const p of doc.querySelectorAll('#intro p, .mf-section-0 p, p')) {
            let t = p.textContent?.replace(/\s+/g, ' ').trim() || ''
            if (/WH\.performance|smallUrl|\{"/.test(t)) continue
            if (t.length > 40 && t.length < 500) {
                passos.push(t.slice(0, 280))
                if (passos.length >= 4) break
            }
        }
    }
    return { titulo, passos, url: finalUrl }
}

/** Tutorial aleatório do WikiHow (HTML scrape; IA opcional). */
export const obterComoFaz = async () => {
    try {
        const artigo = await obterArtigoWikiHowHtml()
        let titulo = artigo.titulo
        let passos = artigo.passos

        // Traduz se parecer inglês e não houver passos em PT
        if (/how to|wikihow/i.test(titulo) || !/[áàâãéêíóôõúç]/i.test(titulo + passos.join(' '))) {
            try {
                const tTitulo = await translate(titulo, { to: 'pt' })
                titulo = tTitulo?.text || titulo
                const novos = []
                for (const p of passos.slice(0, 5)) {
                    const tp = await translate(p, { to: 'pt' })
                    novos.push(tp?.text || p)
                }
                if (novos.length) passos = novos
            } catch {
                // mantém original
            }
        }

        const lista = passos.length
            ? passos.map((p, i) => `${i + 1}. ${p}`).join('\n')
            : 'Abra o link abaixo para ver o tutorial completo.'

        let texto = `📖 *Como fazer: ${titulo}*\n\n${lista}\n\n🔗 ${artigo.url}`

        if (temChaveIa() && passos.length) {
            try {
                const { resultado } = await gerarTextoIA(
                    `Reescreva de forma clara e curta este tutorial em português do Brasil (mantenha título e até 5 passos):\n\nTítulo: ${titulo}\n${lista}`,
                    'Seja objetivo. Não invente passos.'
                )
                if (resultado) texto = `📖 *Como fazer:*\n${resultado}\n\n🔗 ${artigo.url}`
            } catch {
                // mantém versão scrape
            }
        }

        return { resultado: texto }
    } catch (err) {
        console.log(`API obterComoFaz - ${msgErro(err)}`)
        throw { erro: 'Não foi possível obter um tutorial do WikiHow no momento. Tente novamente.' }
    }
}

/** Playlist gerada por IA (mínimo 20 músicas). */
export const obterPlaylist = async (descricao) => {
    try {
        const { resultado } = await gerarTextoIA(
            `Crie uma playlist com PELO MENOS 20 músicas reais no formato "Artista - Música", uma por linha, numeradas de 1 a 20 ou mais, baseada em: ${descricao}`,
            'Você é um curador musical. Liste apenas músicas reais existentes. Responda em português do Brasil.'
        )
        return { resultado: `🎵 *Playlist:* ${descricao}\n\n${resultado}` }
    } catch (err) {
        console.log(`API obterPlaylist - ${msgErro(err)}`)
        throw {
            erro: err?.erro || 'Não foi possível gerar a playlist. Configure RAPIDAPI_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY no .env.'
        }
    }
}

export const resumirTexto = (texto) =>
    gerarTextoIA(
        `Resuma de forma clara e objetiva o texto abaixo:\n\n${texto}`,
        'Responda em português do Brasil. Use tópicos curtos quando fizer sentido.'
    )

export const pesquisarPerplexity = async (query) => {
    try {
        const resultado = await perplexityPesquisa(query)
        return { resultado: `🔎 *Pesquisa:* ${query}\n\n${resultado}` }
    } catch (err) {
        console.log(`API pesquisarPerplexity - ${msgErro(err)}`)
        // Fallback IA sem web
        try {
            const { resultado } = await gerarTextoIA(
                `Pesquise e responda com informações atualizadas e fontes quando possível sobre: ${query}`,
                'Responda em português do Brasil de forma clara e estruturada.'
            )
            return { resultado: `🔎 *Pesquisa (IA):* ${query}\n\n${resultado}` }
        } catch {
            throw {
                erro: err?.erro || 'Falha na pesquisa. Configure RAPIDAPI_KEY (Perplexity2) no .env.'
            }
        }
    }
}

export const obterRespostaGrok = async (texto) => {
    try {
        const resultado = await grokChat(texto)
        return { resultado }
    } catch (err) {
        console.log(`API obterRespostaGrok - ${msgErro(err)}`)
        // Fallback cadeia de IA
        try {
            return await gerarTextoIA(
                texto,
                'Você é Grok: irônico, direto e útil. Responda em português do Brasil.'
            )
        } catch {
            throw { erro: err?.erro || 'Falha no Grok. Configure RAPIDAPI_KEY no .env.' }
        }
    }
}

export const obterVagas = async (query) => {
    try {
        const resultado = await buscarVagas(query, { country: 'br', num: 5 })
        return { resultado }
    } catch (err) {
        console.log(`API obterVagas - ${msgErro(err)}`)
        throw { erro: err?.erro || 'Não foi possível buscar vagas. Configure RAPIDAPI_KEY (JSearch) no .env.' }
    }
}

export const explicaTexto = (texto) =>
    gerarTextoIA(
        `Explique de forma clara e didática:\n\n${texto}`,
        'Você é um professor paciente. Responda em português do Brasil com exemplos quando útil.'
    )

export const spoilerFilme = (filme) =>
    gerarTextoIA(
        `Faça um spoiler detalhado do filme "${filme}".`,
        'Responda em português do Brasil. Inclua enredo completo, reviravoltas e final.'
    )

export const argumentosTema = (tema) =>
    gerarTextoIA(
        `Liste os principais argumentos a favor e contra sobre: ${tema}`,
        'Responda em português do Brasil de forma equilibrada e organizada.'
    )

export const prosCons = (tema) =>
    gerarTextoIA(
        `Liste prós e contras de: ${tema}`,
        'Responda em português do Brasil com tópicos claros separados em Prós e Contras.'
    )

export const compararItens = (a, b) =>
    gerarTextoIA(
        `Compare "${a}" e "${b}" em critérios relevantes, custo-benefício, vantagens e desvantagens.`,
        'Responda em português do Brasil de forma objetiva. Use tópicos ou tabela textual.'
    )

export const simuladoProva = (tema) =>
    gerarTextoIA(
        `Crie um simulado de prova com 10 questões objetivas (A-D) sobre: ${tema}. Inclua gabarito ao final.`,
        'Responda em português do Brasil. Questões variadas e desafiadoras.'
    )

export const roteiroVideo = (tema) =>
    gerarTextoIA(
        `Crie um roteiro completo para vídeo do YouTube sobre: ${tema}`,
        'Inclua gancho inicial, introdução, tópicos, CTA e despedida. Responda em português do Brasil.'
    )

export const melhorarCurriculo = (texto) =>
    gerarTextoIA(
        `Melhore este currículo mantendo informações verdadeiras, tornando-o mais profissional:\n\n${texto}`,
        'Responda em português do Brasil com o currículo reescrito e dicas breves.'
    )

/** Gera 5 prompts distintos de logo (para imagens). */
export const estilosLogo = (texto) => [
    `professional logo design for brand "${texto}", minimalist flat vector, clean typography, white background, no watermark`,
    `professional logo design for brand "${texto}", modern geometric emblem, bold colors, centered icon, white background`,
    `professional logo design for brand "${texto}", vintage badge style, classic serif lettering, cream paper look`,
    `professional logo design for brand "${texto}", glossy 3D logo, soft shadows, premium tech aesthetic`,
    `professional logo design for brand "${texto}", hand-drawn artistic logo, unique character mascot, playful`
]

export const gerarPromptLogo = (texto) =>
    gerarTextoIA(
        `Com base em "${texto}", liste exatamente 5 conceitos de logo diferentes. Para cada um: nome do conceito, descrição visual detalhada, cores e estilo. Numere de 1 a 5.`,
        'Responda em português do Brasil.'
    )

/** Slideshow cinematográfico a partir de várias imagens (xfade). */
async function imagensParaVideoSlideshow(buffers, segundosPorFrame = 2.5) {
    const imgs = (buffers || []).filter((b) => b?.length > 500).slice(0, 6)
    if (!imgs.length) throw new Error('Sem frames')
    if (imgs.length === 1) {
        const entrada = obterCaminhoTemporario('png')
        const saida = obterCaminhoTemporario('mp4')
        await fs.writeFile(entrada, imgs[0])
        const dur = 8
        try {
            await new Promise((resolve, reject) => {
                ffmpeg(entrada)
                    .inputOptions(['-loop', '1', '-t', String(dur)])
                    .outputOptions([
                        '-vf',
                        `scale=960:720:force_original_aspect_ratio=increase,crop=960:720,` +
                            `crop=720:720:x='(in_w-out_w)*t/${dur}':y=0`,
                        '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                        '-t', String(dur), '-movflags', '+faststart', '-y'
                    ])
                    .save(saida)
                    .on('end', resolve)
                    .on('error', reject)
            })
            return await fs.readFile(saida)
        } finally {
            try { await fs.unlink(entrada) } catch {}
            try { await fs.unlink(saida) } catch {}
        }
    }

    const arquivos = []
    const saida = obterCaminhoTemporario('mp4')
    try {
        for (const b of imgs) {
            const p = obterCaminhoTemporario('png')
            await fs.writeFile(p, b)
            arquivos.push(p)
        }
        const d = segundosPorFrame
        await new Promise((resolve, reject) => {
            let cmd = ffmpeg()
            for (const p of arquivos) {
                cmd = cmd.input(p).inputOptions(['-loop', '1', '-t', String(d)])
            }
            const n = arquivos.length
            const scales = arquivos
                .map((_, i) => `[${i}:v]scale=720:720:force_original_aspect_ratio=increase,crop=720:720,setsar=1,fps=25[v${i}]`)
                .join(';')
            let filter = scales
            if (n === 2) {
                filter += `;[v0][v1]xfade=transition=fade:duration=0.6:offset=${d - 0.6}[outv]`
            } else {
                let prev = 'v0'
                for (let i = 1; i < n; i++) {
                    const out = i === n - 1 ? 'outv' : `x${i}`
                    const offset = (d - 0.5) * i
                    filter += `;[${prev}][v${i}]xfade=transition=fade:duration=0.5:offset=${offset}[${out}]`
                    prev = out
                }
            }
            cmd
                .complexFilter(filter)
                .outputOptions(['-map', '[outv]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-y'])
                .save(saida)
                .on('end', resolve)
                .on('error', reject)
        })
        return await fs.readFile(saida)
    } finally {
        for (const p of arquivos) {
            try { await fs.unlink(p) } catch {}
        }
        try { await fs.unlink(saida) } catch {}
    }
}

async function imagemParaVideoPan(bufferImagem) {
    return imagensParaVideoSlideshow([bufferImagem], 8)
}

/** Vídeo coerente: storyboard → 3 frames alinhados → slideshow. */
export const obterVideoIA = async (prompt) => {
    const p = String(prompt || '').trim()
    if (!p) throw { erro: 'Informe o prompt do vídeo.' }

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

    let cenas = []
    try {
        const { resultado } = await gerarTextoIA(
            `Crie um storyboard de EXATAMENTE 3 cenas para um vídeo curto sobre: "${p}".\n` +
                `Devolva só 3 linhas numeradas. Cada linha = prompt de imagem em inglês, ` +
                `mesmo sujeito/estilo, ângulos diferentes em sequência narrativa (abertura → meio → fechamento).`,
            'Só devolva as 3 linhas. Sem markdown.',
            { temperature: 0.45, timeout: 30000 }
        )
        cenas = String(resultado || '')
            .split('\n')
            .map((l) => l.replace(/^\d+[\).\-\:]\s*/, '').trim())
            .filter(Boolean)
            .slice(0, 3)
    } catch {
        cenas = []
    }
    if (cenas.length < 2) {
        cenas = [
            `${p}, opening shot, cinematic, consistent character and style`,
            `${p}, mid action, same subject and style, different angle`,
            `${p}, closing shot, same subject and style, emotional beat`
        ]
    }

    const gerarFrame = async (textoFrame, tentativa = 0) => {
        try {
            // Evita re-enriquecer cada frame (já veio do storyboard)
            const buf = await gerarImagemGemini(textoFrame)
            if (buf?.length > 500) return buf
            const { resultado } = await obterImagemIA(textoFrame)
            if (Buffer.isBuffer(resultado) && resultado.length > 500) return resultado
        } catch (err) {
            const msg = String(err?.erro || err?.message || err)
            if (/429|too many|rate|muitas solicita/i.test(msg) && tentativa < 2) {
                await sleep(2500 * (tentativa + 1))
                return gerarFrame(textoFrame, tentativa + 1)
            }
            try {
                const buf = await gerarImagemMultiFonte(textoFrame, { width: 720, height: 720 })
                if (buf?.length > 500) return buf
            } catch { /* ignore */ }
            throw err
        }
        return null
    }

    try {
        const frames = []
        for (let i = 0; i < cenas.length; i++) {
            if (i > 0) await sleep(1800)
            try {
                const f = await gerarFrame(cenas[i])
                if (f) frames.push(f)
            } catch (e) {
                console.log(`API obterVideoIA frame ${i} - ${msgErro(e)}`)
            }
        }
        if (frames.length >= 2) {
            return { resultado: await imagensParaVideoSlideshow(frames.slice(0, 3), 2.8) }
        }
        if (frames.length === 1) {
            return { resultado: await imagemParaVideoPan(frames[0]) }
        }
    } catch (err) {
        console.log(`API obterVideoIA slideshow - ${msgErro(err)}`)
    }

    if (rapidKey()) {
        try {
            const url = await chatgpt42Video(p)
            if (url) return { resultado: url }
        } catch (err) {
            console.log(`API obterVideoIA Rapid - ${msgErro(err)}`)
            if (/429|too many|rate/i.test(String(err?.message || ''))) {
                throw { erro: 'Muitas solicitações agora. Aguarde ~1 minuto e tente de novo.' }
            }
        }
    }

    throw {
        erro: 'Não foi possível gerar o vídeo agora. Aguarde um pouco e tente novamente.'
    }
}

/** Image-to-image legado — removido do menu; mantido só por compatibilidade de export. */
export const imagemParaImagemIA = async () => {
    throw { erro: 'Este recurso foi desativado.' }
}

/** Upscale de imagem — RapidAPI + ffmpeg 2x. */
export const upscaleImagem = async (buffer) => {
    if (!buffer?.length) throw { erro: 'Nenhuma imagem foi enviada para upscale.' }

    try {
        const rapid = await upscaleRapid(buffer)
        if (rapid?.length > 500) return { resultado: rapid }
    } catch (err) {
        console.log(`API upscaleImagem Rapid - ${msgErro(err)}`)
    }

    try {
        const entrada = obterCaminhoTemporario('png')
        const saida = obterCaminhoTemporario('png')
        await fs.writeFile(entrada, buffer)
        await new Promise((resolve, reject) => {
            ffmpeg(entrada)
                .outputOptions(['-vf', 'scale=iw*2:ih*2:flags=lanczos', '-frames:v', '1', '-y'])
                .save(saida)
                .on('end', resolve)
                .on('error', reject)
        })
        const resultado = await fs.readFile(saida)
        try { await fs.unlink(entrada) } catch {}
        try { await fs.unlink(saida) } catch {}
        return { resultado }
    } catch (err) {
        console.log(`API upscaleImagem ffmpeg - ${err.message}`)
        throw { erro: 'Não foi possível aumentar a resolução da imagem.' }
    }
}

/** Animação de imagem — pan/slideshow (sem zoom trêmulo). */
export const animarImagem = async (buffer, prompt) => {
    if (!buffer?.length) throw { erro: 'Envie/responda uma imagem.' }
    try {
        const frames = [buffer]
        const p = prompt?.trim()
        if (p) {
            try {
                const { resultado } = await obterImagemIA(`${p}, same subject, cinematic frame`)
                if (Buffer.isBuffer(resultado)) frames.push(resultado)
            } catch { /* ignore */ }
        }
        const video = await imagensParaVideoSlideshow(frames, 2.5)
        return { resultado: video }
    } catch (err) {
        console.log(`API animarImagem - ${msgErro(err)}`)
        try {
            const video = await imagemParaVideoPan(buffer)
            return { resultado: video }
        } catch {
            throw { erro: 'Não foi possível animar a imagem. Verifique se o ffmpeg está instalado.' }
        }
    }
}

/** Música por IA — Music API (~60s) ou 3–4 SFX concatenados (~66–88s). */
export const gerarMusicaIA = async (prompt) => {
    const p = String(prompt || '').trim()
    if (!p) throw { erro: 'Informe a descrição da música.' }
    if (!elevenKey()) {
        throw { erro: 'Configure ELEVENLABS_API_KEY no .env para gerar música.' }
    }

    try {
        const buf = await gerarMusicaEleven(p, 60000)
        if (buf?.length > 1000) return { resultado: buf }
    } catch (err) {
        console.log(`API gerarMusicaIA Music - ${msgErro(err)}`)
    }

    try {
        const sfxPrompt =
            `Instrumental music track: ${p}. Melodic, rhythmic, high quality studio production, no speech, no voice-over.`
        // 3 × 22s ≈ 66s (evita o corte de ~14s de uma única chamada)
        const partes = await gerarSomElevenLongo(sfxPrompt, 66)
        if (!partes?.length) throw new Error('sem partes')
        const buf = await concatenarMp3(partes)
        if (buf?.length > 1000) return { resultado: buf }
    } catch (err) {
        console.log(`API gerarMusicaIA SFX longo - ${msgErro(err)}`)
    }

    try {
        const { gerarSomEleven } = await import('../lib/elevenlabs.js')
        const a = await gerarSomEleven(`Full instrumental song intro: ${p}. Continuous music, no vocals.`, 22)
        const b = await gerarSomEleven(`Full instrumental song continuation: ${p}. Same key and tempo, no vocals.`, 22)
        const c = await gerarSomEleven(`Full instrumental song ending: ${p}. Same key and tempo, no vocals.`, 22)
        const buf = await concatenarMp3([a, b, c])
        if (buf?.length > 1000) return { resultado: buf }
    } catch (err) {
        console.log(`API gerarMusicaIA SFX triple - ${msgErro(err)}`)
    }

    throw {
        erro: 'Não foi possível gerar a música. Verifique créditos/plano da ElevenLabs ou tente outro prompt.'
    }
}

/** Processa áudio com ffmpeg e retorna buffer MP3. */
async function processarAudioFfmpeg(buffer, { audioFilters = [], filterComplex } = {}) {
    const entrada = obterCaminhoTemporario('bin')
    const saida = obterCaminhoTemporario('mp3')
    await fs.writeFile(entrada, buffer)
    try {
        await new Promise((resolve, reject) => {
            let cmd = ffmpeg(entrada).noVideo().audioCodec('libmp3lame').audioBitrate('160k').format('mp3')
            if (filterComplex) {
                cmd = cmd.complexFilter(filterComplex, 'out')
            } else if (audioFilters.length) {
                cmd = cmd.audioFilters(audioFilters)
            }
            cmd.save(saida).on('end', resolve).on('error', reject)
        })
        return await fs.readFile(saida)
    } finally {
        try { await fs.unlink(entrada) } catch {}
        try { await fs.unlink(saida) } catch {}
    }
}

/** Isolamento de vocais — UVR5 primeiro. */
export const isolarVocais = async (buffer) => {
    if (!buffer?.length) throw { erro: 'Envie/responda um áudio ou vídeo.' }

    const maxSeg = 90
    const curto = await cortarAudioMp3(buffer, maxSeg).catch(() => buffer)

    try {
        const { vocals } = await separarUvr5(curto, { maxSegundos: maxSeg })
        if (vocals?.length > 500) {
            console.log('isolarVocais UVR5 ok')
            return { resultado: vocals }
        }
    } catch (err) {
        console.log(`API isolarVocais UVR5 - ${msgErro(err)}`)
    }

    try {
        const local = await separarDemucsLocal(curto, { maxSegundos: maxSeg })
        if (local?.vocals?.length > 500) {
            console.log(`isolarVocais demucs fallback device=${local.device}`)
            return { resultado: local.vocals }
        }
    } catch (err) {
        console.log(`API isolarVocais demucs - ${msgErro(err)}`)
    }

    if (rapidKey()) {
        try {
            const resultado = await stemSplitSeparar(curto, 'VOCALS')
            if (resultado?.length > 500) return { resultado }
        } catch (err) {
            console.log(`API isolarVocais StemSplit - ${msgErro(err)}`)
        }
    }

    throw { erro: 'Não foi possível isolar os vocais via UVR. Envie um trecho de até ~1–1,5 min.' }
}

/** Isolamento de instrumental — UVR5 primeiro. */
export const isolarInstrumental = async (buffer) => {
    if (!buffer?.length) throw { erro: 'Envie/responda um áudio ou vídeo.' }

    const maxSeg = 90
    const curto = await cortarAudioMp3(buffer, maxSeg).catch(() => buffer)

    try {
        const { vocals, instrumental, stems } = await separarUvr5(curto, { maxSegundos: maxSeg })
        if (instrumental?.length > 500) {
            console.log('isolarInstrumental UVR5 ok')
            return { resultado: instrumental }
        }
        if (vocals?.length > 500) {
            const sub = await subtrairVocaisDoOriginal(curto, vocals)
            if (sub?.length > 500) return { resultado: sub }
        }
        const mix = await misturarStemsMp3([stems?.bass, stems?.drums, stems?.other, stems?.guitar, stems?.piano])
        if (mix?.length > 500) return { resultado: mix }
    } catch (err) {
        console.log(`API isolarInstrumental UVR5 - ${msgErro(err)}`)
    }

    try {
        const local = await separarDemucsLocal(curto, { maxSegundos: maxSeg })
        if (local?.instrumental?.length > 500) {
            console.log(`isolarInstrumental demucs fallback device=${local.device}`)
            return { resultado: local.instrumental }
        }
        if (local?.vocals?.length > 500) {
            const sub = await subtrairVocaisDoOriginal(curto, local.vocals)
            if (sub?.length > 500) return { resultado: sub }
        }
    } catch (err) {
        console.log(`API isolarInstrumental demucs - ${msgErro(err)}`)
    }

    if (rapidKey()) {
        try {
            const resultado = await stemSplitSeparar(curto, 'INSTRUMENTAL')
            if (resultado?.length > 500) return { resultado }
        } catch (err) {
            console.log(`API isolarInstrumental StemSplit - ${msgErro(err)}`)
        }
    }

    throw { erro: 'Não foi possível isolar o instrumental via UVR. Envie um trecho de até ~1–1,5 min.' }
}

export { gerarResumoGrupoAudio } from './resumo-grupo.js'

/**
 * Resumo do histórico do grupo separado por temas (texto formatado).
 * mensagens: [{ nome_usuario, texto, timestamp, tipo }]
 */
export const gerarResumoPorTema = async ({ mensagens = [], nomeGrupo = 'o grupo' } = {}) => {
    try {
        const linhas = (mensagens || [])
            .filter((m) => m?.texto)
            .map((m) => {
                const quem = String(m.nome_usuario || 'Alguém').slice(0, 40)
                const txt = String(m.texto).replace(/\s+/g, ' ').trim().slice(0, 280)
                return `${quem}: ${txt}`
            })
        if (!linhas.length) throw new Error('sem mensagens')

        // Cabe no prompt: amostra das mais recentes se passar do limite
        let bloco = linhas.join('\n')
        if (bloco.length > 28000) {
            bloco = linhas.slice(-Math.floor(linhas.length * 0.7)).join('\n').slice(-28000)
        }

        const system =
            'Você organiza conversas de grupo de WhatsApp em um RESUMO POR TEMAS, em português do Brasil. ' +
            'Formato obrigatório (WhatsApp markdown):\n' +
            `*📖 RESUMO POR TEMAS — ${String(nomeGrupo).slice(0, 60)}*\n` +
            '_baseado nas últimas mensagens (inclui áudios transcritos)_\n\n' +
            'Para cada tema use:\n' +
            '*🔹 Nome do tema*\n' +
            'texto corrido citando participantes pelo nome (ex: João, Maria). ' +
            'Separe temas com linha em branco. Temas típicos: futebol, cinema, trabalho, fofoca, ' +
            'conversas aleatórias, planos, brincadeiras, etc — invente só se o conteúdo pedir. ' +
            'Seja rico, legível e fiel ao que foi dito. Não invente fatos que não estejam no histórico. ' +
            'Não diga que é IA.'

        const { resultado } = await gerarTextoIA(
            `Histórico do grupo (${linhas.length} msgs):\n\n${bloco}\n\nMonte o resumo por temas agora.`,
            system,
            { temperature: 0.55, timeout: TIMEOUT_LONGO, maxOutputTokens: 4096 }
        )
        if (!resultado) throw new Error('vazio')
        return { resultado: String(resultado).trim().slice(0, 12000) }
    } catch (err) {
        console.log(`API gerarResumoPorTema - ${msgErro(err)}`)
        throw {
            erro: !temChaveIa()
                ? avisoSemChave
                : 'Não consegui montar o resumo por temas agora. Tente de novo.'
        }
    }
}
export { gerarAudioNarrado, OPCOES_TTS_ULTRON } from './tts-narrado.js'

/** Gera texto engraçado sobre membros do grupo. */
export const gerarTextoGrupoIA = async (prompt, system) => {
    return gerarTextoIA(prompt, system)
}


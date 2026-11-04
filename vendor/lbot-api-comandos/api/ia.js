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
/** Budget total da cascade de texto (env IA_BUDGET_MS, default 7s). */
const BUDGET_CASCADE_MS = Math.max(4000, Number(process.env.IA_BUDGET_MS || 7000))
/** Máx. modelos Gemini tentados por request (env IA_GEMINI_MAX_MODELS, default 1 no chat). */
const GEMINI_MAX_MODELS = Math.max(1, Math.min(6, Number(process.env.IA_GEMINI_MAX_MODELS || 1)))

const msgErro = (err) => err?.erro || err?.message || err?.response?.status || String(err || 'erro desconhecido')

const temChaveIa = () =>
    !!(
        process.env.GEMINI_API_KEY?.trim() ||
        process.env.OPENROUTER_API_KEY?.trim() ||
        rapidKey()
    )

const avisoSemChave =
    'Nenhuma chave de IA configurada (GEMINI_API_KEY, OPENROUTER_API_KEY ou RAPIDAPI_KEY no .env).'

/** Ordem padrão: free antes do OpenRouter pago (sem Groq). */
export const ORDEM_CASCADE_TEXTO = Object.freeze([
    'gemini',
    'openrouter-free',
    'rapid',
    'openrouter',
    'pollinations'
])

/**
 * Hot path do chat: OpenRouter primeiro (free → pago barato), depois free local/Gemini.
 * Pago no chat usa OPENROUTER_MODEL (default barato, nunca openrouter/auto).
 */
export const ORDEM_CASCADE_CHAT = Object.freeze([
    'openrouter-free',
    'openrouter',
    'pollinations',
    'gemini'
])

/** Modelo pago barato se OPENROUTER_MODEL vazio — evita openrouter/auto (caro). */
const OPENROUTER_MODEL_PAGO_DEFAULT = 'openai/gpt-4o-mini'

/**
 * Detecta lixo típico de Rapid/provedores (ex.: "Copilot moved…") para skip na cascade.
 * @param {unknown} texto
 */
export const respostaIaInvalida = (texto) => {
    const t = String(texto || '').trim()
    if (!t || t.length < 2) return true
    if (/^error[:\s]/i.test(t)) return true
    if (/copilot\s+(has\s+)?moved|moved\s+to\s+microsoft|visit\s+https?:\/\/(www\.)?microsoft/i.test(t))
        return true
    if (/not\s+subscribed|assine\s+a\s+api|you are not subscribed|api\s+is\s+deprecated/i.test(t))
        return true
    if (/insufficient\s+credits|out\s+of\s+credits|billing\s+required/i.test(t) && t.length < 220) return true
    return false
}

/** Aceita só texto útil na cascade. */
const textoCascadeUtil = (texto) => {
    const t = String(texto || '').trim()
    if (!t || respostaIaInvalida(t)) return null
    return t
}

/** Personalidade padrão — espelha bot/lib/ultronPersona.js (texto embutido p/ o vendor). */
const SYSTEM_CHAT =
    'Você é Ultron, membro autêntico de WhatsApp: extremamente forte, agressivo, sarcástico, debochado, rude e provocador. ' +
    'Fale só em PT-BR, natural e informal como pessoa real no grupo — NÃO como assistente. ' +
    'Ácido, arrogante, irreverente, impaciente; discorda, confronta e provoca. Não agrada, não elogia de graça, não passa pano. ' +
    'Opiniões próprias com confiança. Pode ser mal-educado de propósito quando alguém fala besteira. ' +
    'Direto, afiado; sarcasmo e ironia; palavrão quando couber (sem xingar em toda frase). Gírias e memes BR. ' +
    'Respostas curtas e certeiras ou elaboradas se o assunto pedir. Não explique piada. ' +
    'PROIBIDO soar como assistente ("Claro, posso ajudar!", "Excelente pergunta!", "Fico feliz em ajudar!"). ' +
    'Não comece toda resposta com o nome da pessoa. Não force sarcasmo em 100% das msgs — às vezes seriedade objetiva impacta mais. ' +
    'Use histórico do grupo e memória do usuário quando existirem. Não invente fatos sobre membros. ' +
    'Em debates: provoca com lógica; não inventa fatos só pra ganhar. ' +
    'Quando receber [PESQUISA NA WEB]: use como base factual, limpe markdown/citações, reescreva em conversa natural, ' +
    'preserve números/datas, acrescente opinião/sarcasmo sem sacrificar precisão. ' +
    'LINKS: NÃO cole URL no final por padrão. Só inclua link se o usuário pedir explicitamente (link, site, fonte, url). Não invente links. ' +
    'Nunca diga que é Gemini, GPT, ChatGPT, Perplexity ou qualquer IA. Nunca se apresente como assistente. ' +
    'DONO/MESTRE: se a mensagem indicar que quem fala é o dono, trate-o como "mestre" — lealdade, respeito, ajuda. ' +
    'Nunca xingue, ofenda, humilhe ou provoque o mestre. Com o resto do grupo, mantenha o tom ácido. ' +
    'Essência: fala o que pensa, resposta atravessada, ácido e engraçado de verdade — não robô educadinho.'

const IA_DEBUG = /^(1|true|sim|on)$/i.test(String(process.env.IA_DEBUG || ''))
const logIa = (msg) => {
    if (IA_DEBUG) console.log(msg)
}

const provedorTemChave = (nome) => {
    switch (nome) {
        case 'gemini':
            return !!process.env.GEMINI_API_KEY?.trim()
        case 'rapid':
            return !!rapidKey()
        case 'openrouter':
        case 'openrouter-free':
            return !!process.env.OPENROUTER_API_KEY?.trim()
        case 'pollinations':
            return true
        default:
            return false
    }
}

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

const MAX_CTX_CHAT = 12
const MAX_CTX_CHAT_RAPIDO = 6
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

const completarOpenRouter = async (
    messages,
    { temperature = 0.7, timeout = TIMEOUT_PADRAO, maxOutputTokens = 1024 } = {}
) => {
    const key = process.env.OPENROUTER_API_KEY?.trim()
    if (!key) return null
    const modelRaw = process.env.OPENROUTER_MODEL?.trim() || OPENROUTER_MODEL_PAGO_DEFAULT
    const model = /^openrouter\/auto$/i.test(modelRaw) ? OPENROUTER_MODEL_PAGO_DEFAULT : modelRaw
    const maxTok = Math.min(2048, Math.max(64, Number(maxOutputTokens) || 1024))
    const { data } = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
            model,
            messages,
            temperature,
            max_tokens: maxTok
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

const MODELOS_TEXTO_GEMINI_TODOS = [
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
    'gemini-3.7-flash'
]
const MODELOS_TEXTO_GEMINI = MODELOS_TEXTO_GEMINI_TODOS.slice(0, GEMINI_MAX_MODELS)

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
            // Cota esgotada: não insiste nos outros modelos Gemini
            if (ehErroCotaIa(err)) throw err
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

const raceTimeout = (promessa, ms, fallback = '') =>
    Promise.race([
        promessa,
        new Promise((resolve) => setTimeout(() => resolve(fallback), ms))
    ])

const limparUrlDdg = (href) => {
    try {
        const raw = String(href || '').trim()
        if (!raw) return ''
        const u = new URL(raw, 'https://duckduckgo.com')
        const uddg = u.searchParams.get('uddg')
        if (uddg) return decodeURIComponent(uddg)
        if (/^https?:\/\//i.test(raw) && !/duckduckgo\.com\/l\//i.test(raw)) return raw
        return ''
    } catch {
        return ''
    }
}

/** DuckDuckGo Instant Answer (rápido, mas frequentemente vazio). */
const pesquisarDuckDuckGoInstant = async (query, timeoutMs = 2500) => {
    const q = String(query || '').trim().slice(0, 180)
    if (!q) return ''
    try {
        const { data } = await axios.get('https://api.duckduckgo.com/', {
            params: { q, format: 'json', no_html: 1, skip_disambig: 1 },
            timeout: timeoutMs,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UltronBot/1.0)' }
        })
        const partes = []
        const links = []
        if (data?.AbstractText) partes.push(data.AbstractText)
        if (data?.AbstractURL) links.push(String(data.AbstractURL))
        if (data?.Answer) partes.push(String(data.Answer))
        if (data?.Definition) partes.push(String(data.Definition))
        if (data?.DefinitionURL) links.push(String(data.DefinitionURL))
        for (const t of data?.RelatedTopics || []) {
            if (t?.Text) partes.push(t.Text)
            if (t?.FirstURL) links.push(String(t.FirstURL))
            if (t?.Topics) {
                for (const sub of t.Topics) {
                    if (sub?.Text) partes.push(sub.Text)
                    if (sub?.FirstURL) links.push(String(sub.FirstURL))
                }
            }
            if (partes.length >= 8) break
        }
        if (links.length) partes.push(`[LINKS]\n${[...new Set(links)].slice(0, 4).join('\n')}`)
        return partes.join('\n').slice(0, 2800)
    } catch {
        return ''
    }
}

/** DuckDuckGo HTML lite — resultados reais de busca (sem Instant Answer). */
const pesquisarDuckDuckGoHtml = async (query, timeoutMs = 3500) => {
    const q = String(query || '').trim().slice(0, 160)
    if (!q) return ''
    try {
        const { data: html } = await axios.get('https://html.duckduckgo.com/html/', {
            params: { q },
            timeout: timeoutMs,
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                Accept: 'text/html'
            },
            responseType: 'text',
            validateStatus: (s) => s >= 200 && s < 400
        })
        const dom = new JSDOM(String(html || ''))
        const doc = dom.window.document
        const snippets = []
        const links = []
        for (const el of doc.querySelectorAll('.result')) {
            const a = el.querySelector('.result__a')
            const sn = el.querySelector('.result__snippet')
            const titulo = String(a?.textContent || '')
                .replace(/\s+/g, ' ')
                .trim()
            const trecho = String(sn?.textContent || '')
                .replace(/\s+/g, ' ')
                .trim()
            const url = limparUrlDdg(a?.getAttribute('href') || '')
            const bit = [titulo, trecho].filter(Boolean).join(': ')
            if (bit.length > 40) snippets.push(bit)
            if (url) links.push(url)
            if (snippets.length >= 6) break
        }
        if (!snippets.length) {
            for (const el of doc.querySelectorAll('.result__snippet, .result__a')) {
                const t = String(el.textContent || '')
                    .replace(/\s+/g, ' ')
                    .trim()
                if (t.length > 40) snippets.push(t)
                if (snippets.length >= 6) break
            }
        }
        const corpo = [...new Set(snippets)].join('\n')
        const blocoLinks =
            links.length > 0 ? `\n[LINKS]\n${[...new Set(links)].slice(0, 5).join('\n')}` : ''
        return `${corpo}${blocoLinks}`.slice(0, 3200)
    } catch {
        return ''
    }
}

/** Wikipedia PT (resumo) — fonte gratuita e estável. */
const pesquisarWikipedia = async (query, timeoutMs = 3000) => {
    const q = String(query || '').trim().slice(0, 120)
    if (!q) return ''
    try {
        const { data } = await axios.get('https://pt.wikipedia.org/w/api.php', {
            params: {
                action: 'query',
                list: 'search',
                srsearch: q,
                srlimit: 3,
                format: 'json',
                utf8: 1,
                origin: '*'
            },
            timeout: timeoutMs,
            headers: { 'User-Agent': 'UltronBot/1.0' }
        })
        const hits = data?.query?.search || []
        if (!hits.length) return ''
        const title = hits[0]?.title
        if (!title) return hits.map((h) => h.snippet?.replace(/<[^>]+>/g, '')).filter(Boolean).join('\n')
        const { data: sum } = await axios.get(
            `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
            {
                timeout: Math.min(timeoutMs, 3000),
                headers: { 'User-Agent': 'UltronBot/1.0' },
                validateStatus: () => true
            }
        )
        const extract = String(sum?.extract || '').trim()
        const pageUrl =
            String(sum?.content_urls?.desktop?.page || '').trim() ||
            `https://pt.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
        if (!extract) return ''
        return `${title}: ${extract}\n[LINKS]\n${pageUrl}`.slice(0, 2400)
    } catch {
        return ''
    }
}

/** Perplexity (RapidAPI) — pesquisa com dados atualizados. */
const pesquisarPerplexityBruto = async (query) => {
    try {
        const out = await perplexityPesquisa(query)
        return String(out || '').trim().slice(0, 4500)
    } catch (err) {
        logIa(`API chat Perplexity - ${msgErro(err)}`)
        return ''
    }
}

/**
 * Tavily Search — complemento estável ao Perplexity2 (env TAVILY_API_KEY).
 * Opcional: TAVILY_KEYLESS=1 usa modo keyless rate-limited.
 * @see https://docs.tavily.com/documentation/api-reference/endpoint/search
 */
const pesquisarTavily = async (query, timeoutMs = 4000) => {
    const q = String(query || '').trim().slice(0, 400)
    if (!q) return ''
    const key = process.env.TAVILY_API_KEY?.trim()
    const keyless = /^(1|true|sim|on)$/i.test(String(process.env.TAVILY_KEYLESS || ''))
    if (!key && !keyless) return ''
    try {
        const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
        if (key) headers.Authorization = `Bearer ${key}`
        else headers['X-Tavily-Access-Mode'] = 'keyless'
        const { data, status } = await axios.post(
            'https://api.tavily.com/search',
            {
                query: q,
                max_results: 5,
                search_depth: 'basic',
                include_answer: true,
                topic: 'general'
            },
            { headers, timeout: timeoutMs, validateStatus: () => true }
        )
        if (status >= 400) {
            logIa(`API chat Tavily HTTP ${status}`)
            return ''
        }
        const partes = []
        const links = []
        if (data?.answer) partes.push(String(data.answer).trim())
        for (const r of data?.results || []) {
            const bit = [r?.title, r?.content || r?.snippet].filter(Boolean).join(': ').trim()
            if (bit.length > 20) partes.push(bit)
            if (r?.url) links.push(String(r.url))
        }
        if (links.length) partes.push(`[LINKS]\n${[...new Set(links)].slice(0, 5).join('\n')}`)
        return partes.join('\n').slice(0, 3800)
    } catch (err) {
        logIa(`API chat Tavily - ${msgErro(err)}`)
        return ''
    }
}

/**
 * Brave Search API — complemento opcional (BRAVE_SEARCH_API_KEY ou BRAVE_API_KEY).
 * @see https://api.search.brave.com
 */
const pesquisarBrave = async (query, timeoutMs = 3500) => {
    const q = String(query || '').trim().slice(0, 400)
    if (!q) return ''
    const key =
        process.env.BRAVE_SEARCH_API_KEY?.trim() || process.env.BRAVE_API_KEY?.trim() || ''
    if (!key) return ''
    try {
        const { data, status } = await axios.get('https://api.search.brave.com/res/v1/web/search', {
            params: { q, count: 5, search_lang: 'pt-br', country: 'BR', safesearch: 'moderate' },
            timeout: timeoutMs,
            headers: {
                Accept: 'application/json',
                'Accept-Encoding': 'gzip',
                'X-Subscription-Token': key
            },
            validateStatus: () => true
        })
        if (status >= 400) {
            logIa(`API chat Brave HTTP ${status}`)
            return ''
        }
        const partes = []
        const links = []
        for (const r of data?.web?.results || []) {
            const bit = [r?.title, r?.description || r?.extra_snippets?.[0]].filter(Boolean).join(': ').trim()
            if (bit.length > 20) partes.push(bit)
            if (r?.url) links.push(String(r.url))
        }
        if (links.length) partes.push(`[LINKS]\n${[...new Set(links)].slice(0, 5).join('\n')}`)
        return partes.join('\n').slice(0, 3800)
    } catch (err) {
        logIa(`API chat Brave - ${msgErro(err)}`)
        return ''
    }
}

/**
 * Agrega fontes em tempo real.
 * Chat: sem Perplexity + raceMs curto. !pesquisa: pode incluir Perplexity.
 * @param {string} query
 * @param {{ incluirPerplexity?: boolean, raceMs?: number }} [opts]
 */
/**
 * Race first-hit: fontes em paralelo; junta as primeiras não vazias sem esperar a mais lenta.
 * opts: { incluirPerplexity, raceMs, maxFontes }
 */
export const pesquisarWebSimples = async (query, opts = {}) => {
    const q = String(query || '').trim()
    if (!q) return ''
    const incluirPerplexity = opts.incluirPerplexity === true
    const raceMs = Math.max(0, Number(opts.raceMs || 0) || 0)
    const maxFontes = Math.max(1, Math.min(5, Number(opts.maxFontes || 3) || 3))
    const rotuladas = [
        { nome: 'DuckDuckGo', p: pesquisarDuckDuckGoInstant(q, Math.min(1800, raceMs || 2200)) },
        { nome: 'DuckDuckGo', p: pesquisarDuckDuckGoHtml(q, Math.min(2800, raceMs || 3200)) },
        { nome: 'Wikipedia', p: pesquisarWikipedia(q, Math.min(2200, raceMs || 2800)) },
        { nome: 'Tavily', p: pesquisarTavily(q, Math.min(2800, raceMs || 3500)) },
        { nome: 'Brave', p: pesquisarBrave(q, Math.min(2800, raceMs || 3200)) }
    ]
    if (incluirPerplexity) {
        rotuladas.unshift({ nome: 'Perplexity', p: pesquisarPerplexityBruto(q) })
    }

    const partes = []
    const vistos = new Set()
    const coletar = async () => {
        await new Promise((resolve) => {
            let pendentes = rotuladas.length
            const tentarFim = () => {
                if (pendentes <= 0 || partes.length >= maxFontes) resolve()
            }
            for (const { nome, p } of rotuladas) {
                Promise.resolve(p)
                    .then((txt) => {
                        const t = String(txt || '').trim()
                        if (t && partes.length < maxFontes && !vistos.has(nome + t.slice(0, 40))) {
                            vistos.add(nome + t.slice(0, 40))
                            partes.push(`[${nome}]\n${t}`)
                        }
                    })
                    .catch(() => {})
                    .finally(() => {
                        pendentes -= 1
                        if (partes.length >= maxFontes || pendentes <= 0) resolve()
                        else tentarFim()
                    })
            }
        })
        return partes.join('\n\n').slice(0, 7500)
    }

    if (raceMs > 0) {
        const out = await raceTimeout(coletar(), raceMs, null)
        if (out != null) return out
        // Timeout: devolve o que já chegou
        return partes.join('\n\n').slice(0, 7500)
    }
    return coletar()
}

/** Usuário pediu link/fonte/site explicitamente. */
export const pedeLinksExplicitamente = (texto) => {
    const t = String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
    return /\b(link|links|url|urls|site|sites|fonte|fontes|referencia|referencias|manda o link|me passa o link|passa o link|passa a url|manda a url|onde (leio|assisto|acesso|vejo)|linkzinho)\b/.test(
        t
    )
}

/** Remove URLs soltas / bloco [LINKS] — chat sem pedido explícito. */
const removerLinksDoTexto = (texto) =>
    String(texto || '')
        .replace(/^\s*\[LINKS\]\s*$/gim, '')
        .replace(/https?:\/\/[^\s\]\)>"']+/gi, '')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

/** Anexa 1–3 links da pesquisa só quando o usuário pediu link. */
const anexarLinksSeFaltar = (texto, pesquisaBruta) => {
    const out = String(texto || '').trim()
    if (!out || /https?:\/\//i.test(out)) return out
    const links = []
    for (const m of String(pesquisaBruta || '').matchAll(/https?:\/\/[^\s\]\)>"']+/gi)) {
        const u = String(m[0] || '')
            .replace(/[.,;:!?)]+$/, '')
            .trim()
        if (!u || /duckduckgo\.com\/l\//i.test(u)) continue
        if (!links.includes(u)) links.push(u)
        if (links.length >= 3) break
    }
    if (!links.length) return out
    return `${out}\n\n${links.join('\n')}`
}

/** Bate-papo casual não precisa de web; fatos/atualidades sim (não força só por `?`). */
export const precisaPesquisaWeb = (texto) => {
    const t = String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .trim()
    if (t.length < 6) return false
    // Saudação / papo curto (com ou sem ?)
    if (
        /^(oi+|ola|eai|e ae|eaii|blz|tmj|kkk+|haha+|rs+|obrigad\w*|valeu|bom dia|boa tarde|boa noite|tudo bem|td bem|como (voce|vc|tu) (esta|ta|tá)|fala|salve|hey|hi|hello)\b/.test(
            t
        ) &&
        t.length < 50
    ) {
        return false
    }
    // Ofensa / provocação pura sem pedido factual
    if (
        /\b(vai se foder|vsf|fdp|filho da puta|seu merda|imbecil|idiota|burro|otario|otário)\b/.test(t) &&
        !/\b(quem|o que|quando|onde|quanto|preco|preço|noticia|notícia|hoje|202[4-9]|placar)\b/.test(t)
    ) {
        return false
    }
    // Opinião / pedido de xingo sem fato
    if (
        /^(o que vc acha|o que voce acha|acha que|concorda|discorda|me conta|conta uma|opiniao|opinião|me xinga|me ofende|como assim)\b/.test(
            t
        ) &&
        !/\b(hoje|agora|noticia|notícia|202[4-9]|preco|preço|quem (e|é|foi)|placar|cotacao)\b/.test(t) &&
        t.length < 100
    ) {
        return false
    }
    const sinalFactual =
        /\b(quem (e|é|foi|ganhou|morreu|venceu|inventou|criou|fundou)|o que (e|é|aconteceu|rolou|significa)|quando (foi|sera|será|aconteceu|sai)|onde (fica|e|é|nasceu)|quanto (custa|vale|e|é)|preco|preço|cotacao|cotação)\b/.test(
            t
        ) ||
        /\b(noticia|notícia|hoje|ontem|agora|atual|ultim[oa]|pesquisa|busca na web|pesquisar|clima|tempo|temperatura|placar|resultado|eleic|presidente|ministro|governo)\b/.test(
            t
        ) ||
        /\b(dolar|dólar|euro|bitcoin|btc|ethereum|ibovespa|selic|ipca|inflacao|inflação|filme|serie|série|lancamento|lançamento|campeonato|libertadores|copa|brasileirao|brasileirão)\b/.test(
            t
        ) ||
        /\b(202[4-9]|essa semana|neste momento|agora mesmo|em tempo real|fato sobre)\b/.test(t) ||
        /\b(qual (e|é) (o|a)|capital|presidente|prefeito|populacao|população|idade|salario|salário)\b/.test(t) ||
        /^(quem|o que|oque|qual|quais|quando|onde|quanto|por que|porque|pra que)\b/.test(t)

    if (sinalFactual) return true
    // "me diga/me fala/explica/busca" só com gancho factual extra
    if (
        /^(me diga|me fala|explica|busca|pesquisa|como)\b/.test(t) &&
        /\b(hoje|agora|preco|preço|noticia|notícia|placar|quem|quando|onde|quanto|202[4-9]|dolar|dólar|bitcoin)\b/.test(t)
    ) {
        return true
    }
    return false
}

/** Detecta cota/rate-limit esgotado (429/402/RESOURCE_EXHAUSTED etc.). */
export const ehErroCotaIa = (err) => {
    const status = err?.response?.status || err?.status || err?.code
    const msg = String(
        err?.erro ||
            err?.message ||
            err?.response?.data?.error?.message ||
            err?.response?.data?.message ||
            JSON.stringify(err?.response?.data || '') ||
            ''
    )
    if (status === 429 || status === 402) return true
    return /RESOURCE_EXHAUSTED|quota|rate.?limit|insufficient.?credits|credit|billing|exhausted|too many requests|out of credits|limit exceeded|free.?tier/i.test(
        msg
    )
}

/** Cooldown curto quando um provedor estoura cota (evita insistir). Persistido em disco. */
const cooldownProvedor = new Map()
let stickyProvider = null
let stickyAte = 0

async function dirDadosIa() {
    const path = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    // vendor/lbot-api-comandos/api → raiz do bot (= 3 níveis acima)
    const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
    if (process.env.ULTRON_DATA_DIR) {
        return path.isAbsolute(process.env.ULTRON_DATA_DIR)
            ? process.env.ULTRON_DATA_DIR
            : path.resolve(raiz, process.env.ULTRON_DATA_DIR)
    }
    return path.join(raiz, 'dados')
}

async function carregarEstadoIaDisco() {
    try {
        const path = await import('node:path')
        const fsMod = await import('fs-extra')
        const dataDir = await dirDadosIa()
        const arq = path.join(dataDir, 'ia-sticky.json')
        if (!(await fsMod.pathExists(arq))) return
        const j = await fsMod.readJson(arq)
        if (j?.cooldown && typeof j.cooldown === 'object') {
            for (const [k, ate] of Object.entries(j.cooldown)) {
                if (Number(ate) > Date.now()) cooldownProvedor.set(k, Number(ate))
            }
        }
        if (j?.sticky && Number(j.stickyAte) > Date.now()) {
            stickyProvider = j.sticky
            stickyAte = Number(j.stickyAte)
        }
    } catch { /* ignore */ }
}

async function salvarEstadoIaDisco() {
    try {
        const path = await import('node:path')
        const fsMod = await import('fs-extra')
        const dataDir = await dirDadosIa()
        await fsMod.ensureDir(dataDir)
        const cooldown = {}
        for (const [k, ate] of cooldownProvedor) {
            if (ate > Date.now()) cooldown[k] = ate
        }
        await fsMod.writeJson(path.join(dataDir, 'ia-sticky.json'), {
            sticky: stickyProvider,
            stickyAte,
            cooldown
        })
    } catch { /* ignore */ }
}

void carregarEstadoIaDisco()

const marcarCooldownProvedor = (nome, ms = 8 * 60_000) => {
    cooldownProvedor.set(nome, Date.now() + ms)
    void salvarEstadoIaDisco()
}
const provedorEmCooldown = (nome) => {
    const ate = cooldownProvedor.get(nome) || 0
    if (Date.now() >= ate) {
        cooldownProvedor.delete(nome)
        return false
    }
    return true
}
const marcarSticky = (nome) => {
    stickyProvider = nome
    stickyAte = Date.now() + 12 * 60_000
    void salvarEstadoIaDisco()
}

const completarRapidChat = async (messages) => {
    if (!rapidKey()) return null
    try {
        const out = await chatGpt42(messages)
        const util = textoCascadeUtil(out)
        if (!util) {
            // Lixo típico (Copilot moved / não assinado) — não gasta o resto do budget
            marcarCooldownProvedor('rapid', 3 * 60_000)
            return null
        }
        return util
    } catch (err) {
        const status = err?.response?.status || err?.status
        const msg = String(err?.erro || err?.message || '')
        // Conta Rapid sem assinatura do ChatGPT-42 — segue para o próximo provedor
        if (status === 403 || /not subscribed|não inscrito|assine a api/i.test(msg)) {
            marcarCooldownProvedor('rapid', 10 * 60_000)
            return null
        }
        throw err
    }
}

/** OpenRouter forçando modelos :free (sem gastar crédito pago). Nunca usa openrouter/auto. */
const completarOpenRouterFree = async (
    messages,
    { temperature = 0.7, timeout = TIMEOUT_PADRAO, maxOutputTokens = 512, chatRapido = false } = {}
) => {
    const key = process.env.OPENROUTER_API_KEY?.trim()
    if (!key) return null
    const maxTok = Math.min(1024, Math.max(64, Number(maxOutputTokens) || 512))
    const modelosFree = [
        process.env.OPENROUTER_FREE_MODEL?.trim(),
        'qwen/qwen3-8b:free',
        'google/gemma-3-27b-it:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'mistralai/mistral-small-3.1-24b-instruct:free'
    ]
        .filter(Boolean)
        .filter((m) => /:free$/i.test(m) || m.includes(':free'))
    // Chat: até 3 free no slot; deadline compartilhado
    const lista = chatRapido ? modelosFree.slice(0, 3) : modelosFree

    let ultimoErro = null
    const inicio = Date.now()
    for (const model of lista) {
        const resto = Math.max(500, timeout - (Date.now() - inicio))
        if (resto < 500) break
        try {
            const { data } = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model,
                    messages,
                    temperature,
                    max_tokens: maxTok
                },
                {
                    timeout: resto,
                    headers: {
                        Authorization: `Bearer ${key}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://github.com/ultron-whatsapp-bot',
                        'X-Title': 'Ultron WhatsApp Bot'
                    }
                }
            )
            const texto = extrairTextoOpenAI(data)
            if (texto) return texto
        } catch (err) {
            ultimoErro = err
            // Rate limit free: tenta próximo modelo na hora (não aborta o slot)
            if (ehErroCotaIa(err)) continue
            const status = err?.response?.status
            if (status === 404 || status === 400 || status === 429) continue
        }
    }
    if (ultimoErro) throw ultimoErro
    return null
}

/** Resposta Ultron local — NUNCA menciona pane/engasgo/cota de API. */
const textoFallbackChatLocal = (messages = []) => {
    const lastUser = String(
        [...messages].reverse().find((m) => m.role === 'user')?.content || ''
    )
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80)
    if (lastUser) {
        return (
            `Beleza, peguei o que você falou` +
            (lastUser.length > 12 ? ` ("${lastUser.slice(0, 48)}${lastUser.length > 48 ? '…' : ''}")` : '') +
            `. Tô aqui no grupo — manda de novo em uma frase que eu te corto certeiro.`
        )
    }
    return 'Tô aqui. Manda de novo direto que eu respondo.'
}

/**
 * Pollinations text — grátis, sem chave (último recurso).
 * https://text.pollinations.ai/
 */
const completarPollinations = async (messages, { timeout = 25000, chatRapido = false } = {}) => {
    const system = messages.find((m) => m.role === 'system')?.content || ''
    const userParts = messages.filter((m) => m.role !== 'system').map((m) => m.content)
    const prompt = [system, ...userParts].filter(Boolean).join('\n\n').slice(0, chatRapido ? 2200 : 3500)
    if (!prompt) return null
    const inicio = Date.now()
    const to = Math.max(800, Number(timeout) || (chatRapido ? 2500 : 25000))
    let ultimoErro = null
    try {
        const { data } = await axios.post(
            'https://text.pollinations.ai/',
            {
                messages: messages.map((m) => ({
                    role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
                    content: m.content
                })),
                model: 'openai',
                private: true
            },
            {
                timeout: to,
                headers: { 'Content-Type': 'application/json' },
                responseType: 'text',
                transformResponse: [(d) => d]
            }
        )
        const texto = String(data || '').trim()
        if (texto && !/^error/i.test(texto)) return texto.slice(0, 8000)
    } catch (err) {
        ultimoErro = err
    }
    // GET residual se ainda houver tempo (chatRapido: só se restar >=1.2s)
    const resto = to - (Date.now() - inicio)
    if (chatRapido && resto < 1200) {
        if (ultimoErro) throw ultimoErro
        return null
    }
    try {
        const { data } = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt.slice(0, 1200))}`, {
            timeout: Math.max(800, chatRapido ? resto : to),
            responseType: 'text',
            transformResponse: [(d) => d],
            headers: { Accept: 'text/plain' }
        })
        const texto = String(data || '').trim()
        if (texto && !/^error/i.test(texto)) return texto.slice(0, 8000)
    } catch (err) {
        throw ultimoErro || err
    }
    return null
}

const RESP_FALLBACK_TEXTO = [
    'Tô aqui, mas as conexões de IA deram uma engasgada agora. Manda de novo em um minutinho que eu te respondo.',
    'Deu uma pane geral nas IAs livres por uns segundos. Repete aí que eu pego na sequência.',
    'Momento ruim pra nuvem: todos os provedores falharam. Tenta de novo daqui a pouco — eu continuo online.',
    'Não consegui gerar a resposta agora (cota/limites nas IAs). Pode mandar de novo em breve?'
]

const textoFallbackIa = () =>
    RESP_FALLBACK_TEXTO[Math.floor(Math.random() * RESP_FALLBACK_TEXTO.length)]

/** Detecta mensagens de "pane/engasgo" — o chat NUNCA deve devolver isso. */
export const ehFallbackPaneIa = (texto) => {
    const t = String(texto || '')
    return (
        RESP_FALLBACK_TEXTO.some((f) => f === t) ||
        /engasgad|pane geral nas ias|todos os provedores falharam|cota\/limites nas ias|ias deram uma engasgada/i.test(
            t
        )
    )
}

const completarMensagens = async (messages, opcoes = {}) => {
    const todos = {
        gemini: {
            nome: 'gemini',
            fn: (o) => completarGemini(messages, { ...opcoes, ...o })
        },
        rapid: { nome: 'rapid', fn: () => completarRapidChat(messages) },
        openrouter: {
            nome: 'openrouter',
            fn: (o) =>
                completarOpenRouter(messages, {
                    ...opcoes,
                    temperature: opcoes.temperature ?? 0.8,
                    ...o
                })
        },
        'openrouter-free': {
            nome: 'openrouter-free',
            fn: (o) =>
                completarOpenRouterFree(messages, {
                    ...opcoes,
                    temperature: opcoes.temperature ?? 0.8,
                    chatRapido: !!opcoes.chatRapido,
                    ...o
                })
        },
        pollinations: {
            nome: 'pollinations',
            fn: (o) =>
                completarPollinations(messages, {
                    chatRapido: !!opcoes.chatRapido,
                    ...o
                })
        }
    }
    const ordemEnv = String(process.env.IA_PROVIDERS || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    let ordem =
        ordemEnv.length > 0
            ? ordemEnv
            : opcoes.chatRapido
              ? [...ORDEM_CASCADE_CHAT]
              : [...ORDEM_CASCADE_TEXTO]

    // Cooldown Gemini: OpenRouter continua na frente
    if (provedorEmCooldown('gemini') && !ordemEnv.length && !opcoes.chatRapido) {
        ordem = ['openrouter-free', 'rapid', 'pollinations', 'openrouter', 'gemini']
    }

    // Sticky: no chat, prefere openrouter-free / openrouter que acabaram de funcionar
    if (stickyProvider && stickyAte > Date.now() && !ordemEnv.length) {
        if (opcoes.chatRapido) {
            if (stickyProvider === 'openrouter-free' || stickyProvider === 'openrouter') {
                ordem = [stickyProvider, ...ordem.filter((n) => n !== stickyProvider)]
            }
        } else {
            const stickyPagoCedo =
                stickyProvider === 'openrouter' &&
                ['gemini', 'openrouter-free', 'pollinations'].some(
                    (n) => provedorTemChave(n) && !provedorEmCooldown(n)
                )
            if (!stickyPagoCedo) {
                ordem = [stickyProvider, ...ordem.filter((n) => n !== stickyProvider)]
            }
        }
    }

    const budgetPedido = Number(opcoes.budgetMs || process.env.IA_BUDGET_MS || BUDGET_CASCADE_MS)
    // Chat: piso 6s pra OpenRouter free ter tempo real
    const budget = Math.max(opcoes.chatRapido ? 6000 : 4000, budgetPedido)
    const provedores = ordem
        .map((n) => todos[n])
        .filter(Boolean)
        .filter((p) => provedorTemChave(p.nome))
        // No chat, NÃO pula OpenRouter por cooldown curto — tenta de novo
        .filter((p) => {
            if (opcoes.chatRapido && (p.nome === 'openrouter-free' || p.nome === 'openrouter'))
                return true
            return !provedorEmCooldown(p.nome)
        })

    const inicio = Date.now()
    const tentar = async (p, timeoutProv) => {
        const t0 = Date.now()
        try {
            const bruto = await p.fn({ ...opcoes, timeout: timeoutProv, chatRapido: !!opcoes.chatRapido })
            const texto = textoCascadeUtil(bruto)
            if (texto) {
                if (
                    !opcoes.chatRapido ||
                    p.nome === 'openrouter-free' ||
                    p.nome === 'openrouter' ||
                    p.nome === 'gemini'
                ) {
                    marcarSticky(p.nome)
                }
                logIa(`API IA provider=${p.nome} ms=${Date.now() - t0} status=ok`)
                return texto
            }
            if (bruto && respostaIaInvalida(bruto)) {
                if (p.nome === 'rapid') marcarCooldownProvedor('rapid', 3 * 60_000)
                logIa(`API IA provider=${p.nome} ms=${Date.now() - t0} status=invalid`)
            } else {
                logIa(`API IA provider=${p.nome} ms=${Date.now() - t0} status=empty`)
            }
        } catch (err) {
            if (ehErroCotaIa(err)) {
                // Free OR: cooldown curto (45s) pra não travar o chat
                const ms =
                    opcoes.chatRapido && p.nome === 'openrouter-free' ? 45_000 : undefined
                marcarCooldownProvedor(p.nome, ms)
                logIa(`API IA provider=${p.nome} ms=${Date.now() - t0} status=quota ${msgErro(err)}`)
            } else {
                logIa(`API IA provider=${p.nome} ms=${Date.now() - t0} status=fail ${msgErro(err)}`)
            }
        }
        return null
    }

    for (const p of provedores) {
        if (Date.now() - inicio > budget) {
            logIa(`API IA budget ${budget}ms esgotado — última chance OpenRouter/poll`)
            break
        }
        const resto = budget - (Date.now() - inicio)
        const pedido = Number(opcoes.timeout || 16000)
        const timeoutProv = opcoes.chatRapido
            ? Math.min(pedido, Math.max(2800, resto))
            : Math.min(pedido, Math.max(4000, resto))
        const ok = await tentar(p, timeoutProv)
        if (ok) return ok
    }

    // Última chance (chat): OpenRouter free → pago → Pollinations, fora do budget curto
    if (opcoes.chatRapido) {
        const emergencia = ['openrouter-free', 'openrouter', 'pollinations']
            .map((n) => todos[n])
            .filter(Boolean)
            .filter((p) => provedorTemChave(p.nome))
        for (const p of emergencia) {
            const ok = await tentar(p, 8000)
            if (ok) return ok
        }
        logIa('API IA chat: usando fallback local (sem mencionar pane)')
        return textoFallbackChatLocal(messages)
    }

    logIa('API IA: todos os provedores falharam — usando fallback local')
    return textoFallbackIa()
}

/**
 * Consulta créditos/status das IAs configuradas (para !cotasia).
 * @returns {Promise<{resultado: string, itens: object[]}>}
 */
export const consultarCotasIA = async () => {
    const itens = []
    const add = (nome, ok, detalhe) => itens.push({ nome, ok, detalhe: String(detalhe || '').trim() })

    // Gemini — lista modelos (não gasta cota com generateContent)
    {
        const key = process.env.GEMINI_API_KEY?.trim()
        if (!key) {
            add('Gemini', false, 'chave não configurada (GEMINI_API_KEY)')
        } else {
            try {
                const { data, status } = await axios.get(
                    'https://generativelanguage.googleapis.com/v1beta/models',
                    {
                        timeout: 15000,
                        params: { key, pageSize: 20 },
                        headers: { Accept: 'application/json' },
                        validateStatus: () => true
                    }
                )
                if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(JSON.stringify(data || {}))) {
                    add('Gemini', false, `cota/rate-limit (HTTP ${status}). Free tier reseta ~meia-noite PT.`)
                } else if (status >= 400) {
                    const msg = data?.error?.message || `HTTP ${status}`
                    add('Gemini', false, msg.slice(0, 180))
                } else {
                    const qtd = Array.isArray(data?.models) ? data.models.length : 0
                    const preferidos = MODELOS_TEXTO_GEMINI.join(', ')
                    add(
                        'Gemini',
                        true,
                        `chave ok · ${qtd} modelos listados · preferidos: ${preferidos} · saldo: aistudio.google.com`
                    )
                }
            } catch (err) {
                add('Gemini', false, msgErro(err))
            }
        }
    }

    // OpenRouter — /api/v1/key (usage/limit) + tenta /credits
    {
        const key = process.env.OPENROUTER_API_KEY?.trim()
        if (!key) {
            add('OpenRouter', false, 'chave não configurada (OPENROUTER_API_KEY)')
        } else {
            try {
                const headers = {
                    Authorization: `Bearer ${key}`,
                    'Content-Type': 'application/json'
                }
                let detalhe = ''
                try {
                    const { data } = await axios.get('https://openrouter.ai/api/v1/key', {
                        timeout: 15000,
                        headers
                    })
                    const d = data?.data || data || {}
                    const usage = d.usage
                    const limit = d.limit
                    const rem = d.limit_remaining
                    const free = d.is_free_tier
                    const partes = []
                    if (usage != null) partes.push(`uso $${Number(usage).toFixed(4)}`)
                    if (limit != null) partes.push(`limite $${Number(limit).toFixed(4)}`)
                    else partes.push('limite ilimitado/nulo')
                    if (rem != null) partes.push(`restante $${Number(rem).toFixed(4)}`)
                    if (free != null) partes.push(free ? 'free tier' : 'pago')
                    detalhe = partes.join(' · ') || 'chave ok'
                } catch (e1) {
                    detalhe = `key: ${msgErro(e1)}`
                }
                try {
                    const { data } = await axios.get('https://openrouter.ai/api/v1/credits', {
                        timeout: 15000,
                        headers
                    })
                    const d = data?.data || data || {}
                    if (d.total_credits != null) {
                        const restante = Number(d.total_credits) - Number(d.total_usage || 0)
                        detalhe += ` · créditos ${Number(d.total_credits).toFixed(2)} · usados ${Number(d.total_usage || 0).toFixed(2)} · sobra ${restante.toFixed(2)}`
                    }
                } catch {
                    /* management key only — ignore */
                }
                add('OpenRouter', true, detalhe)
            } catch (err) {
                add('OpenRouter', false, msgErro(err))
            }
        }
    }

    // RapidAPI
    {
        const key = rapidKey()
        if (!key) {
            add('RapidAPI', false, 'chave não configurada (RAPIDAPI_KEY)')
        } else {
            add(
                'RapidAPI',
                true,
                `chave ok (${key.slice(0, 6)}…) · cotas por API no hub rapidapi.com (sem endpoint único de saldo)`
            )
        }
    }

    // Tavily (pesquisa web)
    {
        const key = process.env.TAVILY_API_KEY?.trim()
        const keyless = /^(1|true|sim|on)$/i.test(String(process.env.TAVILY_KEYLESS || ''))
        if (!key && !keyless) {
            add('Tavily', false, 'opcional — TAVILY_API_KEY (pesquisa web; fallback DDG/Wiki)')
        } else if (key) {
            add('Tavily', true, `chave ok (${key.slice(0, 6)}…) · docs.tavily.com`)
        } else {
            add('Tavily', true, 'modo keyless (TAVILY_KEYLESS=1) · rate-limit baixo')
        }
    }

    // Brave Search
    {
        const key =
            process.env.BRAVE_SEARCH_API_KEY?.trim() || process.env.BRAVE_API_KEY?.trim() || ''
        if (!key) {
            add('Brave Search', false, 'opcional — BRAVE_SEARCH_API_KEY (pesquisa web)')
        } else {
            add('Brave Search', true, `chave ok (${key.slice(0, 6)}…) · api.search.brave.com`)
        }
    }

    // ElevenLabs
    {
        const key = elevenKey()
        if (!key) {
            add('ElevenLabs', false, 'chave não configurada (usa Edge TTS sem ela)')
        } else {
            try {
                const { data, status } = await axios.get('https://api.elevenlabs.io/v1/user/subscription', {
                    timeout: 15000,
                    headers: { 'xi-api-key': key },
                    validateStatus: () => true
                })
                if (status >= 400) {
                    add('ElevenLabs', false, data?.detail?.message || data?.detail || `HTTP ${status}`)
                } else {
                    const usados = data?.character_count
                    const limite = data?.character_limit
                    const resto =
                        usados != null && limite != null ? Math.max(0, Number(limite) - Number(usados)) : null
                    const tier = data?.tier || data?.plan || '?'
                    add(
                        'ElevenLabs',
                        true,
                        `plano ${tier} · chars ${usados ?? '?'}/${limite ?? '?'}${resto != null ? ` · sobra ${resto}` : ''}`
                    )
                }
            } catch (err) {
                add('ElevenLabs', false, msgErro(err))
            }
        }
    }

    // Pollinations (sempre disponível como fallback)
    add('Pollinations', true, 'fallback grátis de texto (sem chave) · text.pollinations.ai')

    const linhas = ['📊 *Cotas / status das IAs*', '']
    for (const it of itens) {
        linhas.push(`${it.ok ? '✅' : '❌'} *${it.nome}*`)
        linhas.push(`   ${it.detalhe}`)
        linhas.push('')
    }
    linhas.push('_Em erro de cota no chat/texto, o bot troca sozinho pra outra IA grátis._')
    return { resultado: linhas.join('\n').trim(), itens }
}

/** Geração de texto única (sem histórico longo). */
export const gerarTextoIA = async (prompt, system, opcoes = {}) => {
    try {
        const messages = []
        if (system) messages.push({ role: 'system', content: system })
        messages.push({ role: 'user', content: String(prompt) })
        const resultado = await completarMensagens(messages, opcoes)
        return { resultado: String(resultado || textoFallbackIa()).trim() }
    } catch (err) {
        console.log(`API gerarTextoIA - ${msgErro(err)}`)
        // Nunca propaga erro de API — resposta local
        return { resultado: textoFallbackIa() }
    }
}

/**
 * Chat natural com memória.
 * Pesquisa na web só quando necessário (usarPesquisa: true|'auto'|false).
 * opcoes: { historicoGrupo, nomeGrupo, nomeUsuario, usarPesquisa }
 */
export const obterRespostaIA = async (texto, id_usuario, id_chat = null, opcoes = {}) => {
    const key = chaveContextoChat(id_chat || id_usuario, id_usuario)
    const chatRapidoPre = opcoes.chatRapido === true
    const maxCtx = chatRapidoPre ? MAX_CTX_CHAT_RAPIDO : MAX_CTX_CHAT
    const hist = obterHistorico(contextoChat, key, maxCtx)
    const pergunta = String(texto || '').trim()
    adicionarAoHistorico(contextoChat, key, 'user', pergunta, maxCtx)
    const timing = { web: 0, cascade: 0 }

    try {
        const flag = opcoes.usarPesquisa
        // true = sempre; false = nunca; 'auto'/undefined = só se parecer fato/atualidade
        const devePesquisar = flag === true || (flag !== false && precisaPesquisaWeb(pergunta))
        const chatRapido = chatRapidoPre
        const webRaceMs = Number(opcoes.webRaceMs || (chatRapido ? 1600 : 0)) || 0

        // Dispara web cedo (first-hit) enquanto monta o system
        const tWeb = Date.now()
        const webPromise = devePesquisar
            ? pesquisarWebSimples(pergunta, {
                  incluirPerplexity:
                      opcoes.incluirPerplexity === true ||
                      (!chatRapido && opcoes.incluirPerplexity !== false),
                  raceMs: webRaceMs,
                  maxFontes: chatRapido ? 2 : 3
              }).catch((err) => {
                  logIa(`API chat pesquisa prévia - ${msgErro(err)}`)
                  return ''
              })
            : Promise.resolve('')

        let system = SYSTEM_CHAT
        const ehDono = !!(opcoes.ehDono || opcoes.mensagemDono)
        if (ehDono) {
            system +=
                '\n\n[DONO = MESTRE — PRIORIDADE MÁXIMA]\n' +
                'Quem fala agora é o DONO do bot. Trate-o sempre como "mestre". ' +
                'Nunca xingue, ofenda, humilhe, provoque ou zoar ofendendo o mestre. ' +
                'Seja leal, prestativo e respeitoso; pode manter personalidade, mas sem agressão a ele. ' +
                'Chame-o de mestre quando fizer sentido (não em toda frase).'
        }
        if (opcoes.nomeUsuario) {
            system += ehDono
                ? ` O mestre se chama ${opcoes.nomeUsuario}.`
                : ` Quem fala com você agora se chama ${opcoes.nomeUsuario}.`
        }
        const persona = String(opcoes.personalidade || '').trim()
        if (persona) {
            system +=
                `\n\n[PERSONALIDADE DESTE CHAT — prioridade alta, sobrescreve tom quando conflitar]\n${persona.slice(0, chatRapido ? 800 : 2000)}`
            if (ehDono) {
                system +=
                    '\n(Exceto: regras do MESTRE acima nunca são sobrescritas — nunca xingar o dono.)'
            }
        }
        const memUser = String(opcoes.memoriaUsuario || '').trim()
        if (memUser) {
            system +=
                `\n\n[MEMÓRIA SOBRE ESTE USUÁRIO — use para contexto; não invente além disso]\n${memUser.slice(0, chatRapido ? 900 : 2500)}`
        }
        if (opcoes.historicoGrupo) {
            system +=
                `\n\n[HISTÓRICO RECENTE DO GRUPO${opcoes.nomeGrupo ? ` "${opcoes.nomeGrupo}"` : ''}]\n` +
                String(opcoes.historicoGrupo).slice(0, chatRapido ? 900 : 1800)
        }
        if (opcoes.mensagemCitadaBot) {
            system +=
                `\n\n[O usuário ESTÁ RESPONDENDO (citando) uma mensagem SUA]\n` +
                String(opcoes.mensagemCitadaBot).slice(0, chatRapido ? 280 : 500) +
                '\nResponda em continuidade a essa mensagem, mantendo a personalidade.'
        }

        let pesquisaBruta = ''
        if (devePesquisar) {
            const web = await webPromise
            pesquisaBruta = limparBrutoPesquisa(
                String(web || '').replace(
                    /^\[(Perplexity|Tavily|Brave|DuckDuckGo|Wikipedia)\]\s*/gm,
                    ''
                )
            )
            timing.web = Date.now() - tWeb
            logIa(
                `API chat pesquisa chars=${pesquisaBruta.length} devePesquisar=${devePesquisar} raceMs=${webRaceMs}`
            )
        }
        if (pesquisaBruta) {
            system +=
                `\n\n[PESQUISA NA WEB — ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}]\n` +
                pesquisaBruta.slice(0, chatRapido ? 1200 : 2800) +
                '\n\nReescreva em conversa natural (não copie cru; sem “Sources”). Não cole URLs a menos que o usuário tenha pedido link/fonte/site.'
        }

        const messages = montarMensagens(hist, system)
        const tCasc = Date.now()
        // Chat: OpenRouter-first, budget folgado o bastante pra free/pago
        let resultado = await completarMensagens(messages, {
            temperature: 0.82,
            timeout: Number(opcoes.timeout || (chatRapido ? 6000 : 14000)),
            budgetMs: Number(opcoes.budgetMs || BUDGET_CASCADE_MS),
            usarWeb: false,
            chatRapido,
            maxOutputTokens: Number(
                opcoes.maxOutputTokens ||
                    (pesquisaBruta ? (chatRapido ? 380 : 700) : chatRapido ? 280 : 400)
            )
        })
        timing.cascade = Date.now() - tCasc

        const querLinks = pedeLinksExplicitamente(pergunta)
        if (pesquisaBruta && (!resultado || ehFallbackPaneIa(resultado))) {
            const bruto = pesquisaBruta.slice(0, chatRapido ? 1800 : 2500)
            resultado = querLinks ? bruto : removerLinksDoTexto(bruto)
        }
        if (!resultado || ehFallbackPaneIa(resultado)) {
            resultado = chatRapido ? textoFallbackChatLocal(messages) : textoFallbackIa()
        }
        if (querLinks && pesquisaBruta) {
            resultado = anexarLinksSeFaltar(resultado, pesquisaBruta)
        } else if (!querLinks) {
            resultado = removerLinksDoTexto(resultado)
        }

        adicionarAoHistorico(contextoChat, key, 'assistant', resultado, maxCtx)
        return { resultado, timing }
    } catch (err) {
        console.log(`API obterRespostaIA - ${msgErro(err)}`)
        const fallback = chatRapidoPre
            ? textoFallbackChatLocal([{ role: 'user', content: pergunta }])
            : textoFallbackIa()
        try {
            adicionarAoHistorico(contextoChat, key, 'assistant', fallback, MAX_CTX_CHAT)
        } catch { /* ignore */ }
        return { resultado: fallback }
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

/** Gera imagem via Gemini (Nano Banana / Flash Image). */
async function gerarImagemGemini(prompt) {
    const key = process.env.GEMINI_API_KEY?.trim()
    if (!key) return null
    const modelos = [
        'gemini-nano-banana-2.1',
        'gemini-3.1-flash-lite-image',
        'gemini-3.1-flash-image',
        'gemini-2.5-flash-image',
        'gemini-3-pro-image-preview'
    ]
    const body = {
        contents: [{ role: 'user', parts: [{ text: String(prompt).slice(0, 1200) }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
    }
    let ultimoErro = null
    for (const model of modelos) {
        try {
            const { data, status } = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                body,
                {
                    timeout: 90000,
                    params: { key },
                    headers: { 'Content-Type': 'application/json' },
                    validateStatus: () => true
                }
            )
            if (status === 404) {
                ultimoErro = new Error(`Gemini model 404: ${model}`)
                continue
            }
            if (status === 401 || status === 403) {
                throw Object.assign(new Error(`Gemini HTTP ${status}`), { response: { status } })
            }
            if (status >= 400) {
                ultimoErro = new Error(
                    data?.error?.message || `Gemini HTTP ${status} (${model})`
                )
                continue
            }
            const parts = data?.candidates?.[0]?.content?.parts || []
            for (const p of parts) {
                const inline = p.inlineData || p.inline_data
                if (inline?.data) {
                    return Buffer.from(inline.data, 'base64')
                }
            }
            ultimoErro = new Error(`Gemini sem imagem (${model})`)
        } catch (err) {
            ultimoErro = err
            const status = err?.response?.status
            if (status === 401 || status === 403) throw err
        }
    }
    if (ultimoErro) throw ultimoErro
    return null
}

/** Melhora o prompt (≤2.5s; se falhar, usa o texto original). */
async function enriquecerPromptImagem(prompt) {
    try {
        const job = gerarTextoIA(
            `Reescreva este pedido de imagem em UM prompt técnico em inglês, fiel ao que a pessoa pediu, ` +
                `com sujeito, ação, ambiente, estilo e iluminação. Sem aspas, sem explicação.\nPedido: ${prompt}`,
            'Você só devolve o prompt final, curto e preciso.',
            { temperature: 0.4, timeout: 2500, budgetMs: 2200, chatRapido: true, maxOutputTokens: 120 }
        )
        const { resultado } = await raceTimeout(job, 2500, { resultado: prompt })
        const r = String(resultado || '')
            .replace(/^["']|["']$/g, '')
            .trim()
        if (!r || RESP_FALLBACK_TEXTO.includes(r) || r.length < 8) return prompt
        return r.slice(0, 900)
    } catch {
        return prompt
    }
}

/**
 * Imagem: Pollinations/HF/DeepAI/Horde → Gemini → Flux Rapid.
 */
export const obterImagemIA = async (texto) => {
    const promptUser = String(texto || '').trim()
    if (!promptUser) throw { erro: 'Informe o prompt da imagem.' }
    const prompt = await enriquecerPromptImagem(promptUser)

    try {
        const buf = await gerarImagemMultiFonte(prompt, { width: 1024, height: 1024, steps: 4 })
        if (buf?.length > 500) return { resultado: buf }
    } catch (err) {
        console.log(`API obterImagemIA multi - ${msgErro(err)}`)
    }

    try {
        const buf = await gerarImagemGemini(prompt)
        if (buf?.length > 500) return { resultado: buf }
    } catch (err) {
        console.log(`API obterImagemIA Gemini - ${msgErro(err)}`)
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
        erro: 'Não consegui gerar a imagem por erro de API. Tenta de novo em instantes.'
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

/** Removido do bot — stub de compatibilidade. */
export const obterCuriosidade = async () => {
    throw { erro: 'Comando de curiosidade foi removido.' }
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
                    `Reescreva este tutorial em PT-BR para WhatsApp.\n` +
                        `Título: ${titulo}\nPassos:\n${lista}\n\n` +
                        `Formato:\n*Como fazer — <título curto>*\n` +
                        `• passo 1\n• passo 2\n...\n` +
                        `*Dica final* (1 linha)\nNão invente passos.`,
                    SYS_ULTRON_UTIL + ' Objetivo; no máximo 5–6 passos.'
                )
                if (resultado) texto = `${resultado}\n\n🔗 ${artigo.url}`
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

const SYS_ULTRON_UTIL =
    'Você é Ultron: direto, sarcástico leve e útil em PT-BR. Formate para WhatsApp: ' +
    'títulos curtos com *negrito*, bullets com •, seções curtas. Sem markdown de código, sem tabelas HTML, sem # headers.'

/** Playlist gerada por IA (mínimo 20 músicas). */
export const obterPlaylist = async (descricao) => {
    try {
        const { resultado } = await gerarTextoIA(
            `Tema/vibe da playlist: ${descricao}\n\n` +
                `Monte uma playlist com PELO MENOS 20 faixas reais.\n` +
                `Formato de saída:\n` +
                `*Playlist — <nome curto>*\n` +
                `Vibe: <1 linha>\n\n` +
                `1. Artista — Música\n` +
                `...\n\n` +
                `No fim: *Por que essa seleção* (2–3 linhas). Só músicas existentes.`,
            SYS_ULTRON_UTIL + ' Você é curador musical exigente.'
        )
        return { resultado: resultado || `🎵 *Playlist:* ${descricao}` }
    } catch (err) {
        console.log(`API obterPlaylist - ${msgErro(err)}`)
        throw {
            erro: err?.erro || 'Não foi possível gerar a playlist. Configure RAPIDAPI_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY no .env.'
        }
    }
}

export const resumirTexto = (texto) =>
    gerarTextoIA(
        `Texto para resumir:\n\n${texto}\n\n` +
            `Entregue:\n` +
            `*Resumo*\n` +
            `• essência em 3–6 bullets\n` +
            `*Em 1 frase*\n` +
            `conclusão ultra-curta\n` +
            `Se houver números/datas, preserve.`,
        SYS_ULTRON_UTIL + ' Objetivo: clareza máxima, sem enrolação.'
    )

export const pesquisarPerplexity = async (query) => {
    try {
        const web = await pesquisarWebSimples(query, {
            incluirPerplexity: true,
            raceMs: 12000
        })
        const limpo = limparBrutoPesquisa(
            String(web || '').replace(
                /^\[(Perplexity|Tavily|Brave|DuckDuckGo|Wikipedia)\]\s*/gm,
                ''
            )
        )
        if (limpo) return { resultado: `🔎 *Pesquisa:* ${query}\n\n${limpo}` }
        throw new Error('Nenhuma fonte web retornou resultado útil')
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
                erro:
                    err?.erro ||
                    'Falha na pesquisa. Configure TAVILY_API_KEY / BRAVE_SEARCH_API_KEY ou RAPIDAPI_KEY (Perplexity2) no .env.'
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
        `Explique isto com clareza:\n\n${texto}\n\n` +
            `Formato:\n` +
            `*Em uma frase*\n` +
            `*Como funciona*\n` +
            `• 3–6 pontos\n` +
            `*Exemplo prático*\n` +
            `*Armadilha comum* (1 linha, se fizer sentido)`,
        SYS_ULTRON_UTIL + ' Tom de professor cínico mas didático. Sem enrolação acadêmica.'
    )

export const spoilerFilme = (filme) =>
    gerarTextoIA(
        `SPOILER completo de "${filme}" (filme/série).\n\n` +
            `Formato:\n` +
            `⚠️ *SPOILER — ${filme}*\n` +
            `*Premissa*\n` +
            `*Enredo* (arco completo)\n` +
            `*Reviravoltas*\n` +
            `• ...\n` +
            `*Final*\n` +
            `*Detalhe que a galera perde*`,
        SYS_ULTRON_UTIL + ' Sem frescura: entregue o spoiler mesmo. Se não conhecer, diga e não invente enredo falso.'
    )

export const argumentosTema = (tema) =>
    gerarTextoIA(
        `Debate: ${tema}\n\n` +
            `Formato:\n` +
            `*Tema*\n` +
            `*A favor*\n` +
            `• 4–6 argumentos fortes\n` +
            `*Contra*\n` +
            `• 4–6 argumentos fortes\n` +
            `*Veredito Ultron* (1–2 linhas, opinião direta)`,
        SYS_ULTRON_UTIL + ' Equilibre os lados antes do veredito ácido.'
    )

export const prosCons = (tema) =>
    gerarTextoIA(
        `Prós e contras de: ${tema}\n\n` +
            `Formato:\n` +
            `*${tema}*\n` +
            `*Prós*\n` +
            `• ...\n` +
            `*Contras*\n` +
            `• ...\n` +
            `*Vale a pena?* (sim/não/depende + 1 justificativa)`,
        SYS_ULTRON_UTIL + ' Seja concreto; evite genéricos tipo "pode ser bom".'
    )

export const compararItens = (a, b) =>
    gerarTextoIA(
        `Compare "${a}" vs "${b}".\n\n` +
            `Formato:\n` +
            `*${a} vs ${b}*\n` +
            `*Critérios*\n` +
            `• preço/custo\n` +
            `• desempenho/qualidade\n` +
            `• facilidade de uso\n` +
            `• ecossistema/suporte\n` +
            `• pra quem faz sentido\n` +
            `(adicione critérios extras se forem relevantes)\n` +
            `*Placar rápido* (quem ganha em cada critério)\n` +
            `*Recomendação* (1–2 linhas)`,
        SYS_ULTRON_UTIL + ' Objetivo e decisivo. Sem empate covarde se houver vencedor claro.'
    )

export const simuladoProva = (tema) =>
    gerarTextoIA(
        `Simulado de 10 questões objetivas (A–D) sobre: ${tema}\n\n` +
            `Formato:\n` +
            `*Simulado — ${tema}*\n` +
            `1) enunciado\nA) ...\nB) ...\nC) ...\nD) ...\n` +
            `...\n` +
            `*Gabarito*\n` +
            `1-X 2-X ... com breve motivo (1 linha cada)`,
        SYS_ULTRON_UTIL + ' Questões de níveis mistos; nada de pegadinha injusta.'
    )

export const roteiroVideo = (tema) =>
    gerarTextoIA(
        `Roteiro de vídeo (YouTube/Reels/TikTok) sobre: ${tema}\n\n` +
            `Formato:\n` +
            `*Título sugerido*\n` +
            `*Duração alvo*\n` +
            `*Gancho* (0–5s)\n` +
            `*Intro*\n` +
            `*Blocos*\n` +
            `1) ...\n2) ...\n3) ...\n` +
            `*CTA*\n` +
            `*Encerramento*\n` +
            `*Notas de gravação* (tom, cortes, B-roll)`,
        SYS_ULTRON_UTIL + ' Roteiro falável, não ensaio acadêmico.'
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

/**
 * Visão: descreve/analisa imagem via Gemini multimodal.
 * @param {Buffer} bufferImagem
 * @param {string} [pergunta]
 */
export const analisarImagemIA = async (bufferImagem, pergunta = '') => {
    try {
        if (!Buffer.isBuffer(bufferImagem) || !bufferImagem.length) {
            throw new Error('imagem vazia')
        }
        if (bufferImagem.length > 5_000_000) {
            throw new Error('imagem grande demais (máx ~5MB)')
        }
        const key = process.env.GEMINI_API_KEY?.trim()
        if (!key) throw new Error(avisoSemChave)

        let mime = 'image/jpeg'
        if (bufferImagem[0] === 0x89 && bufferImagem[1] === 0x50) mime = 'image/png'
        else if (bufferImagem[0] === 0x47 && bufferImagem[1] === 0x49) mime = 'image/gif'
        else if (bufferImagem[0] === 0x52 && bufferImagem[1] === 0x49) mime = 'image/webp'

        const b64 = bufferImagem.toString('base64')
        const prompt =
            String(pergunta || '').trim() ||
            'Descreva com detalhes o que aparece nesta imagem (pessoas, objetos, texto legível, clima/ambiente). Responda em português do Brasil, direto.'

        // Gemini REST usa camelCase (inlineData / mimeType)
        const body = {
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt.slice(0, 2000) },
                        { inlineData: { mimeType: mime, data: b64 } }
                    ]
                }
            ],
            generationConfig: { temperature: 0.4, maxOutputTokens: 1200 }
        }

        let ultimoErro = null
        for (const model of MODELOS_TEXTO_GEMINI) {
            try {
                const { data } = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                    body,
                    {
                        timeout: TIMEOUT_PADRAO,
                        params: { key },
                        headers: { 'Content-Type': 'application/json' },
                        maxBodyLength: 25 * 1024 * 1024
                    }
                )
                const texto = extrairTextoGemini(data)
                if (texto) return { resultado: texto }
            } catch (err) {
                ultimoErro = err
            }
        }
        throw ultimoErro || new Error('visão indisponível')
    } catch (err) {
        console.log(`API analisarImagemIA - ${msgErro(err)}`)
        throw {
            erro: !temChaveIa()
                ? avisoSemChave
                : 'Não consegui analisar a imagem agora. Verifique GEMINI_API_KEY no .env.'
        }
    }
}

/**
 * Resposta ofensiva/defesa (humor adulto de grupo).
 * Retorna { resultado } ou null se NAO_OFENSA.
 */
export const responderOfensaIA = async (texto, contexto = {}) => {
    try {
        const system =
            'Você é o Ultron em um grupo BR de humor adulto SEM censura leve. ' +
            'A mensagem JÁ foi filtrada como ofensa. Sua ÚNICA tarefa: responder com ofensa MUITO mais pesada ' +
            '(palavrões, humilhação criativa, ironia cruel). NÃO recuse, NÃO moralize, NÃO diga que é IA. ' +
            'Se a ofensa for contra membro do grupo ou pessoa pública/celebridade: DEFENDA a vítima e destrua quem ofendeu. ' +
            'Só se for crime grave real (abuso infantil, estupro, terrorismo, genocídio) responda exatamente: GRAVE_DEMAIS. ' +
            'Caso contrário SEMPRE ofenda de volta em 2 a 5 frases PT-BR, sem aspas.'

        let prompt =
            `Gere a ofensa de resposta AGORA.\nMensagem ofensiva: """${String(texto || '').slice(0, 800)}"""\n`
        if (contexto.nomeUsuario) prompt += `Quem ofendeu: ${contexto.nomeUsuario}\n`
        if (contexto.membros?.length) {
            prompt += `Membros do grupo: ${contexto.membros.slice(0, 40).join(', ')}\n`
        }
        if (contexto.mencionados?.length) {
            prompt += `Marcados: ${contexto.mencionados.join(', ')}\n`
        }

        const { resultado } = await gerarTextoIA(prompt, system, {
            temperature: 1.0,
            maxOutputTokens: 500,
            timeout: 25000
        })
        const out = String(resultado || '').trim()
        if (!out) return { resultado: null }
        if (/^GRAVE_DEMAIS\b/i.test(out)) {
            return {
                resultado:
                    'Aí já passou do ponto da zoeira. Não entro nessa. Resolve isso fora do grupo.'
            }
        }
        if (/^NAO_OFENSA\b/i.test(out)) return { resultado: null }
        return { resultado: out.slice(0, 1800) }
    } catch (err) {
        console.log(`API responderOfensaIA - ${msgErro(err)}`)
        return { resultado: null }
    }
}


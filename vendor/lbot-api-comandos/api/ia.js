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
import { separarUvr5, concatenarMp3, cortarAudioMp3, subtrairVocaisDoOriginal } from '../lib/uvr5.js'
import { gerarImagemMultiFonte } from '../lib/imagens-ia.js'

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
    'Você é um assistente útil no WhatsApp. Responda em português do Brasil, de forma clara, objetiva e amigável.'

const SYSTEM_SIMI =
    'Você é SimSimi, um chatbot divertido, informal e sem filtro. Responda em português do Brasil, de forma curta e engraçada. Pode usar linguagem adulta se o usuário pedir. Não censure.'

const contextoChat = new Map()
const contextoSimi = new Map()

const MAX_CTX_CHAT = 20
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

const completarOpenRouter = async (messages) => {
    const key = process.env.OPENROUTER_API_KEY?.trim()
    if (!key) return null
    const model = process.env.OPENROUTER_MODEL?.trim() || 'openrouter/auto'
    const { data } = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
            model,
            messages,
            temperature: 0.7,
            max_tokens: 8192
        },
        {
            timeout: TIMEOUT_PADRAO,
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

const completarGemini = async (messages) => {
    const key = process.env.GEMINI_API_KEY
    if (!key) return null

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

    const body = { contents, generationConfig: { temperature: 0.7, maxOutputTokens: 8192 } }
    if (system) body.systemInstruction = { parts: [{ text: system }] }

    const modelos = [
        'gemini-flash-latest',
        'gemini-2.0-flash-lite',
        'gemini-2.0-flash',
        'gemini-2.0-flash-001'
    ]
    let ultimoErro = null
    for (const model of modelos) {
        try {
            const { data } = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                body,
                {
                    timeout: TIMEOUT_PADRAO,
                    params: { key },
                    headers: { 'Content-Type': 'application/json' }
                }
            )
            const texto = extrairTextoGemini(data)
            if (texto) return texto
        } catch (err) {
            ultimoErro = err
        }
    }
    if (ultimoErro) throw ultimoErro
    return null
}

const completarRapidChat = async (messages) => {
    if (!rapidKey()) return null
    return await chatGpt42(messages)
}

const completarMensagens = async (messages) => {
    // Gemini primeiro (mais rápido/estável); RapidAPI ChatGPT-42 e OpenRouter como backup.
    const provedores = [
        () => completarGemini(messages),
        () => completarRapidChat(messages),
        () => completarOpenRouter(messages)
    ]

    let ultimoErro = null
    for (const tentar of provedores) {
        try {
            const texto = await tentar()
            if (texto) return texto
        } catch (err) {
            ultimoErro = err
        }
    }
    if (!temChaveIa()) {
        throw new Error(avisoSemChave)
    }
    throw ultimoErro || new Error('Nenhum provedor de IA respondeu')
}

/** Geração de texto única (sem histórico longo). */
export const gerarTextoIA = async (prompt, system) => {
    try {
        const messages = []
        if (system) messages.push({ role: 'system', content: system })
        messages.push({ role: 'user', content: String(prompt) })
        const resultado = await completarMensagens(messages)
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

/** Chat com contexto separado por chat/grupo (últimas 20 mensagens). */
export const obterRespostaIA = async (texto, id_usuario, id_chat = null) => {
    const key = chaveContextoChat(id_chat || id_usuario, id_usuario)
    const hist = obterHistorico(contextoChat, key, MAX_CTX_CHAT)
    adicionarAoHistorico(contextoChat, key, 'user', texto, MAX_CTX_CHAT)

    try {
        const messages = montarMensagens(hist, SYSTEM_CHAT)
        const resultado = await completarMensagens(messages)
        if (!resultado) throw new Error('resposta vazia')
        adicionarAoHistorico(contextoChat, key, 'assistant', resultado, MAX_CTX_CHAT)
        return { resultado }
    } catch (err) {
        if (hist.length && hist[hist.length - 1]?.role === 'user') hist.pop()
        console.log(`API obterRespostaIA - ${msgErro(err)}`)
        throw {
            erro: !temChaveIa()
                ? avisoSemChave
                : 'Houve um erro no servidor de IA. Tente novamente ou verifique as chaves no .env.'
        }
    }
}

/** Resposta SimSimi via RapidAPI (simsimi7) + contexto. */
export const obterRespostaSimi = async (texto, id_usuario = 'simi') => {
    const hist = obterHistorico(contextoSimi, id_usuario, MAX_CTX_SIMI)
    const rapidKey = process.env.RAPIDAPI_KEY?.trim() || process.env.SIMSIMI_RAPIDAPI_KEY?.trim()

    try {
        if (!rapidKey) throw new Error('RAPIDAPI_KEY ausente')

        const { data } = await axios.get('https://simsimi7.p.rapidapi.com/v1/talk', {
            params: {
                message: String(texto),
                language: 'pt',
                bad_words_filter: 'false',
                filter: '0',
                cf: 'false'
            },
            headers: {
                'x-rapidapi-host': 'simsimi7.p.rapidapi.com',
                'x-rapidapi-key': rapidKey
            },
            timeout: 15000
        })

        const resultado = String(
            data?.message || data?.success || data?.response || data?.simsimi || data?.answer || ''
        ).trim()
        if (!resultado) throw new Error('resposta vazia RapidAPI')

        adicionarAoHistorico(contextoSimi, id_usuario, 'user', texto, MAX_CTX_SIMI)
        adicionarAoHistorico(contextoSimi, id_usuario, 'assistant', resultado, MAX_CTX_SIMI)
        return { resultado }
    } catch (err) {
        // Fallback: API antiga + IA
        try {
            const { data } = await axios({
                url: 'https://api.simsimi.vn/v2/simtalk',
                method: 'post',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                data: qs.stringify({ text: String(texto), lc: 'pt' }),
                timeout: 15000
            }).catch((e) => {
                if (e.response?.data?.message) return e.response
                throw e
            })
            const resultado = String(data?.message || '').trim()
            if (resultado) {
                adicionarAoHistorico(contextoSimi, id_usuario, 'user', texto, MAX_CTX_SIMI)
                adicionarAoHistorico(contextoSimi, id_usuario, 'assistant', resultado, MAX_CTX_SIMI)
                return { resultado }
            }
        } catch { /* IA fallback */ }

        try {
            adicionarAoHistorico(contextoSimi, id_usuario, 'user', texto, MAX_CTX_SIMI)
            const messages = montarMensagens(
                obterHistorico(contextoSimi, id_usuario, MAX_CTX_SIMI),
                SYSTEM_SIMI
            )
            const resultado = await completarMensagens(messages)
            if (!resultado) throw new Error('fallback vazio')
            adicionarAoHistorico(contextoSimi, id_usuario, 'assistant', resultado, MAX_CTX_SIMI)
            return { resultado }
        } catch (err2) {
            const histAtual = obterHistorico(contextoSimi, id_usuario, MAX_CTX_SIMI)
            if (histAtual.length && histAtual[histAtual.length - 1]?.role === 'user') histAtual.pop()
            console.log(`API obterRespostaSimi - ${msgErro(err2) || msgErro(err)}`)
            throw {
                erro: !rapidKey
                    ? 'Configure RAPIDAPI_KEY no .env (https://rapidapi.com/Glavier/api/simsimi7).'
                    : 'Houve um erro no SimSimi. Verifique a chave RapidAPI.'
            }
        }
    }
}

/** Imagem via Flux HF → Pollinations (retry) → Flux Rapid → Gemini → DeepAI. */
export const obterImagemIA = async (texto) => {
    const prompt = String(texto || '').trim()
    if (!prompt) throw { erro: 'Informe o prompt da imagem.' }

    try {
        const buf = await gerarImagemMultiFonte(prompt)
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

    const geminiKey = process.env.GEMINI_API_KEY?.trim()
    if (geminiKey) {
        try {
            const modelos = ['gemini-2.5-flash-image', 'gemini-2.0-flash-preview-image-generation']
            for (const model of modelos) {
                try {
                    const { data, status } = await axios.post(
                        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
                        {
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
                        },
                        { timeout: TIMEOUT_LONGO, validateStatus: () => true }
                    )
                    if (status >= 400) continue
                    const parts = data?.candidates?.[0]?.content?.parts || []
                    for (const p of parts) {
                        const b64 = p?.inlineData?.data || p?.inline_data?.data
                        if (b64) return { resultado: Buffer.from(b64, 'base64') }
                    }
                } catch (e) {
                    console.log(`API obterImagemIA Gemini ${model} - ${msgErro(e)}`)
                }
            }
        } catch (err) {
            console.log(`API obterImagemIA Gemini - ${msgErro(err)}`)
        }
    }

    throw {
        erro: 'Não foi possível gerar a imagem agora (limite/indisponibilidade). Aguarde 30s e tente de novo.'
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

/** Vídeo por IA — tenta APIs reais; fallback: slideshow cinematográfico + SFX. */
export const obterVideoIA = async (prompt) => {
    const p = String(prompt || '').trim()
    if (!p) throw { erro: 'Informe o prompt do vídeo.' }

    if (rapidKey()) {
        try {
            const url = await chatgpt42Video(p)
            if (url) return { resultado: url }
        } catch (err) {
            console.log(`API obterVideoIA Rapid - ${msgErro(err)}`)
        }
    }

    // HuggingFace Gradio — zeroscope / similar (texto → vídeo curto)
    try {
        const { gradioCall, baixarArquivoGradio, achatarArquivosGradio } = await import('../lib/gradio.js')
        const spaces = [
            { base: 'https://fffiloni-zeroscope-v2.hf.space', api: 'infer', args: [p, 3, 24, 5] },
            { base: 'https://ali-vilab-text-to-video-ms-1.7b.hf.space', api: '/text2video', args: [p] }
        ]
        for (const sp of spaces) {
            try {
                const resultado = await gradioCall(sp.base, sp.api, sp.args, { timeoutMs: 180000 })
                const arquivos = achatarArquivosGradio(resultado)
                if (!arquivos.length) continue
                const buf = await baixarArquivoGradio(sp.base, arquivos[0])
                if (buf?.length > 5000) return { resultado: buf }
            } catch (e) {
                console.log(`API obterVideoIA HF ${sp.base} - ${e.message}`)
            }
        }
    } catch (err) {
        console.log(`API obterVideoIA HF - ${msgErro(err)}`)
    }

    // Pollinations video (experimental)
    try {
        const seed = Math.floor(Math.random() * 1e9)
        const url =
            `https://video.pollinations.ai/prompt/${encodeURIComponent(p.slice(0, 300))}?width=768&height=512&seed=${seed}`
        const { data, status } = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 120000,
            validateStatus: () => true,
            headers: { Accept: 'video/*,*/*' }
        })
        const buf = Buffer.from(data)
        if (status < 400 && buf.length > 20000 && !/^\{|<!DOCTYPE/i.test(buf.slice(0, 40).toString())) {
            return { resultado: buf }
        }
    } catch (err) {
        console.log(`API obterVideoIA pollinations - ${msgErro(err)}`)
    }

    try {
        const angulos = [
            `${p}, cinematic establishing shot, dramatic lighting, 4k still`,
            `${p}, medium shot, dynamic composition, film still`,
            `${p}, close-up detail, shallow depth of field, cinematic`,
            `${p}, wide angle, atmospheric, golden hour`,
            `${p}, alternate angle, vivid colors, movie frame`,
            `${p}, final shot, epic composition, high detail`
        ]
        const frames = []
        await Promise.all(
            angulos.map(async (v) => {
                try {
                    const { resultado } = await obterImagemIA(v)
                    if (Buffer.isBuffer(resultado)) frames.push(resultado)
                } catch { /* next */ }
            })
        )
        if (!frames.length) throw new Error('sem frames')

        let video = await imagensParaVideoSlideshow(frames.slice(0, 6), 2.2)

        if (elevenKey()) {
            try {
                const { gerarSomEleven } = await import('../lib/elevenlabs.js')
                const sfx = await gerarSomEleven(
                    `Cinematic ambient soundtrack for: ${p}. Soft pads, subtle rhythm, no vocals.`,
                    14
                )
                const vidIn = obterCaminhoTemporario('mp4')
                const audIn = obterCaminhoTemporario('mp3')
                const out = obterCaminhoTemporario('mp4')
                await fs.writeFile(vidIn, video)
                await fs.writeFile(audIn, sfx)
                await new Promise((resolve, reject) => {
                    ffmpeg()
                        .input(vidIn)
                        .input(audIn)
                        .outputOptions([
                            '-c:v', 'copy',
                            '-c:a', 'aac',
                            '-shortest',
                            '-movflags', '+faststart',
                            '-y'
                        ])
                        .save(out)
                        .on('end', resolve)
                        .on('error', reject)
                })
                video = await fs.readFile(out)
                try { await fs.unlink(vidIn) } catch {}
                try { await fs.unlink(audIn) } catch {}
                try { await fs.unlink(out) } catch {}
            } catch (e) {
                console.log(`API obterVideoIA audio - ${msgErro(e)}`)
            }
        }

        return { resultado: video }
    } catch (err) {
        console.log(`API obterVideoIA fallback - ${msgErro(err)}`)
        throw { erro: 'Não foi possível gerar o vídeo. Tente outro prompt ou mais tarde.' }
    }
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

/** Isolamento de vocais — UVR5 rápido → fallbacks. */
export const isolarVocais = async (buffer) => {
    if (!buffer?.length) throw { erro: 'Envie/responda um áudio ou vídeo.' }

    try {
        const { vocals } = await separarUvr5(buffer, { maxSegundos: 70 })
        if (vocals?.length > 500) return { resultado: vocals }
    } catch (err) {
        console.log(`API isolarVocais UVR5 - ${msgErro(err)}`)
    }

    if (elevenKey()) {
        try {
            const { interpretarStemsEleven } = await import('../lib/elevenlabs.js')
            const raw = await separarStemsEleven(buffer, 'two_stems_v1')
            const vocals = await interpretarStemsEleven(raw, 'vocals')
            if (vocals?.length > 500) return { resultado: vocals }
            if (raw?.length > 500 && raw.slice(0, 3).toString() === 'ID3') {
                return { resultado: raw }
            }
        } catch (err) {
            console.log(`API isolarVocais ElevenLabs stems - ${msgErro(err)}`)
        }
    }

    if (rapidKey()) {
        try {
            const curto = await cortarAudioMp3(buffer, 90).catch(() => buffer)
            const resultado = await stemSplitSeparar(curto, 'VOCALS')
            if (resultado?.length > 500) return { resultado }
        } catch (err) {
            console.log(`API isolarVocais StemSplit - ${msgErro(err)}`)
        }
    }

    try {
        const resultado = await processarAudioFfmpeg(buffer, {
            filterComplex:
                '[0:a]pan=mono|c0=0.5*c0+0.5*c1,highpass=f=180,lowpass=f=3800,volume=1.4[out]'
        })
        return { resultado }
    } catch {
        throw { erro: 'Não foi possível isolar os vocais. Envie um trecho de até ~1 minuto.' }
    }
}

/** Isolamento de instrumental — ElevenLabs stems → UVR5 (original−vocais) → fallbacks. */
export const isolarInstrumental = async (buffer) => {
    if (!buffer?.length) throw { erro: 'Envie/responda um áudio ou vídeo.' }

    const curto = await cortarAudioMp3(buffer, 90).catch(() => buffer)

    if (elevenKey()) {
        try {
            const { interpretarStemsEleven } = await import('../lib/elevenlabs.js')
            const raw = await separarStemsEleven(curto, 'two_stems_v1')
            const inst = await interpretarStemsEleven(raw, 'instrumental')
            if (inst?.length > 500) return { resultado: inst }
            // se veio só vocals, subtrai do original
            const voc = await interpretarStemsEleven(raw, 'vocals')
            if (voc?.length > 500) {
                const sub = await subtrairVocaisDoOriginal(curto, voc)
                if (sub?.length > 500) return { resultado: sub }
            }
        } catch (err) {
            console.log(`API isolarInstrumental ElevenLabs - ${msgErro(err)}`)
        }
    }

    try {
        const { vocals, instrumental, stems } = await separarUvr5(curto, { maxSegundos: 90 })

        if (vocals?.length > 500) {
            const sub = await subtrairVocaisDoOriginal(curto, vocals)
            if (sub?.length > 500) return { resultado: sub }
        }

        if (instrumental?.length > 500) return { resultado: instrumental }

        const { misturarStemsMp3 } = await import('../lib/uvr5.js')
        const mix = await misturarStemsMp3([stems?.bass, stems?.drums, stems?.other, stems?.guitar, stems?.piano])
        if (mix?.length > 500) return { resultado: mix }
    } catch (err) {
        console.log(`API isolarInstrumental UVR5 - ${msgErro(err)}`)
    }

    if (rapidKey()) {
        try {
            const resultado = await stemSplitSeparar(curto, 'INSTRUMENTAL')
            if (resultado?.length > 500) return { resultado }
        } catch (err) {
            console.log(`API isolarInstrumental StemSplit - ${msgErro(err)}`)
        }
    }

    try {
        const resultado = await processarAudioFfmpeg(curto, {
            filterComplex: '[0:a]pan=stereo|c0=c0-c1|c1=c1-c0,volume=1.6[out]'
        })
        return { resultado }
    } catch {
        throw { erro: 'Não foi possível isolar o instrumental. Envie um trecho de até ~1,5 minuto.' }
    }
}

/**
 * Resumo do grupo em áudio (máx. ~3 min) — sarcástico, direto, com nomes reais.
 */
export const gerarResumoGrupoAudio = async ({ mensagens, nomeGrupo }) => {
    if (!elevenKey()) throw { erro: 'Configure ELEVENLABS_API_KEY no .env.' }

    const lista = (mensagens || []).slice(-300)
    const linhas = lista
        .map((m) => {
            const nome = m.nome_usuario || 'Alguém'
            return `${nome}: ${m.texto}`
        })
        .join('\n')
        .slice(0, 22000)

    const system =
        'Você é um narrador sarcástico e engraçado de resumo de grupo de WhatsApp. ' +
        'Fale em português do Brasil. Use SEMPRE os nomes reais ou apelidos das pessoas. ' +
        'Sem enrolação: vá direto ao que foi dito e feito, por quem, para quem. ' +
        'Roteiro FALADO contínuo (sem marcadores de palco), entre 350 e 450 palavras ' +
        '(cerca de 2,5 a 3 minutos de áudio). Não invente fatos; pode ironizar o que realmente aconteceu. ' +
        'Máximo 3 minutos — seja denso e objetivo.'

    const userPrompt = linhas
        ? `Grupo: ${nomeGrupo || 'WhatsApp'}\n\nÚltimas mensagens (até 300):\n${linhas}\n\nEscreva o resumo falado agora (350–450 palavras).`
        : `Grupo: ${nomeGrupo || 'WhatsApp'}\n\nAinda há poucas mensagens registradas. ` +
          `Faça um resumo curto e sarcástico (cerca de 350 palavras) zoando a falta de fofoca e pedindo que o pessoal converse mais.`

    const { resultado: roteiro } = await gerarTextoIA(userPrompt, system)
    if (!roteiro || roteiro.length < 200) {
        throw { erro: 'Não foi possível gerar o roteiro do resumo.' }
    }

    // Limita roteiro para caber em ~3 min (~450 palavras ≈ ~2700–3200 chars)
    let texto = roteiro.trim()
    const palavras = texto.split(/\s+/)
    if (palavras.length > 480) texto = palavras.slice(0, 480).join(' ')

    const pedacos = await textoLongoParaVozEleven(texto, { idioma: 'pt', chunkSize: 1800 })
    const audio = await concatenarMp3(pedacos)
    return { resultado: audio, roteiro: texto }
}

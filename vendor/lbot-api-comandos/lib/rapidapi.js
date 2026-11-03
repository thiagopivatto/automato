import axios from 'axios'
import FormData from 'form-data'

const TIMEOUT = 25000
const TIMEOUT_RAPIDO = 8000
const TIMEOUT_LONGO = 120000

export const rapidKey = () =>
    process.env.RAPIDAPI_KEY?.trim() ||
    process.env.X_RAPIDAPI_KEY?.trim() ||
    ''

/** Chave dedicada ao Perplexity2 (fallback: RAPIDAPI_KEY). */
export const perplexityRapidKey = () =>
    process.env.PERPLEXITY_RAPIDAPI_KEY?.trim() ||
    process.env.RAPIDAPI_KEY?.trim() ||
    process.env.X_RAPIDAPI_KEY?.trim() ||
    ''

export const rapidHeaders = (host, contentType = 'application/json', keyOverride = '') => {
    const h = {
        'x-rapidapi-key': keyOverride || rapidKey(),
        'x-rapidapi-host': host
    }
    if (contentType) h['Content-Type'] = contentType
    return h
}

export const exigirRapidKey = () => {
    if (!rapidKey()) {
        throw { erro: 'Configure RAPIDAPI_KEY no .env (chave do RapidAPI Hub).' }
    }
}

export const erroRapid = (err, apiNome) => {
    const status = err?.response?.status
    const msg = err?.response?.data?.message || err?.message || ''
    if (status === 403 || /not subscribed/i.test(msg)) {
        return {
            erro: `Assine a API *${apiNome}* no RapidAPI (mesma conta da RAPIDAPI_KEY) e tente de novo.`
        }
    }
    if (status === 401 || /invalid.*key|unauthorized/i.test(msg)) {
        return {
            erro: 'RAPIDAPI_KEY inválida. No RapidAPI Hub → Apps → copie a *X-RapidAPI-Key*.'
        }
    }
    return { erro: String(msg || `Falha na API ${apiNome}`).slice(0, 300) }
}

const extrairTexto = (data) => {
    if (data == null) return ''
    if (typeof data === 'string') return data.trim()

    // Perplexity2 RapidAPI (formato Gemini grounding): choices.content.parts[].text
    const partsPx = data?.choices?.content?.parts
    if (Array.isArray(partsPx)) {
        const txt = partsPx.map((p) => p?.text).filter(Boolean).join('\n').trim()
        if (txt) return txt
    }

    const candidatos = [
        data.result,
        data.response,
        data.message,
        data.answer,
        data.output,
        data.content,
        data.text,
        data.data?.result,
        data.data?.response,
        data.data?.answer,
        data.data?.content,
        data.choices?.[0]?.message?.content,
        data.choices?.[0]?.text,
        data.candidates?.[0]?.content?.parts?.[0]?.text,
        data.output_text
    ]
    for (const c of candidatos) {
        if (typeof c === 'string' && c.trim()) return c.trim()
        if (c && typeof c === 'object' && typeof c.text === 'string' && c.text.trim()) return c.text.trim()
    }
    try {
        const vals = Object.values(data).filter((v) => typeof v === 'string' && v.length > 40)
        if (vals.length === 1) return vals[0].trim()
    } catch { /* */ }
    return ''
}

const baixarUrl = async (url) => {
    const { data } = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: TIMEOUT_LONGO,
        maxContentLength: 40 * 1024 * 1024
    })
    return Buffer.from(data)
}

/** Upload temporário (Litterbox 1h) para APIs que exigem URL pública. */
export const uploadTemporario = async (buffer, filename = 'file.bin') => {
    const form = new FormData()
    form.append('reqtype', 'fileupload')
    form.append('time', '1h')
    form.append('fileToUpload', buffer, { filename })
    const { data } = await axios.post('https://litterbox.catbox.moe/resources/internals/api.php', form, {
        headers: form.getHeaders(),
        timeout: TIMEOUT
    })
    const url = String(data || '').trim()
    if (!url.startsWith('http')) throw new Error('Falha no upload temporário')
    return url
}

/** ChatGPT-42 RapidAPI — conversa com histórico. */
export const chatGpt42 = async (messages, systemPrompt = '') => {
    exigirRapidKey()
    const msgs = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))

    const system =
        systemPrompt ||
        messages.find((m) => m.role === 'system')?.content ||
        'Responda em português do Brasil. Respostas completas, sem cortar.'

    try {
        const { data } = await axios.post(
            'https://chatgpt-42.p.rapidapi.com/conversationgpt4-2',
            {
                messages: msgs.length ? msgs : [{ role: 'user', content: 'oi' }],
                system_prompt: system,
                temperature: 0.7,
                top_k: 5,
                top_p: 0.9,
                max_tokens: 8192,
                web_access: false
            },
            {
                headers: rapidHeaders('chatgpt-42.p.rapidapi.com'),
                timeout: TIMEOUT_RAPIDO
            }
        )

        const out = extrairTexto(data)
        if (!out) throw new Error('ChatGPT-42 sem resposta')
        return out
    } catch (err) {
        if (err?.erro) throw err
        throw erroRapid(err, 'ChatGPT-42')
    }
}

/**
 * Perplexity2 (RapidAPI Hub) — pesquisa com web em tempo real.
 * Host: perplexity2.p.rapidapi.com
 */
export const perplexityPesquisa = async (query) => {
    const key = perplexityRapidKey()
    if (!key) {
        throw { erro: 'Configure PERPLEXITY_RAPIDAPI_KEY ou RAPIDAPI_KEY no .env (RapidAPI Hub → Perplexity2).' }
    }
    try {
        const { data, status } = await axios.post(
            'https://perplexity2.p.rapidapi.com/',
            { content: String(query) },
            {
                headers: rapidHeaders('perplexity2.p.rapidapi.com', 'application/json', key),
                timeout: TIMEOUT_LONGO,
                validateStatus: () => true
            }
        )
        if (status === 401 || status === 403) {
            throw {
                response: { status, data },
                message: data?.message || `HTTP ${status}`
            }
        }
        if (status >= 400) {
            throw {
                response: { status, data },
                message: data?.message || `HTTP ${status}`
            }
        }
        const out = extrairTexto(data)
        if (!out) {
            // Alguns planos devolvem JSON aninhado — serializa útil
            const raw = typeof data === 'string' ? data : JSON.stringify(data)
            if (raw && raw.length > 20 && raw !== '{}' && raw !== 'null') {
                console.log(`API Perplexity formato inesperado: ${raw.slice(0, 200)}`)
            }
            throw new Error('Perplexity sem resposta útil')
        }
        return out
    } catch (err) {
        if (err?.erro) throw err
        throw erroRapid(err, 'Perplexity2')
    }
}

export const grokChat = async (texto) => {
    exigirRapidKey()
    const body = {
        model: 'grok-3',
        messages: [{ role: 'user', content: String(texto) }]
    }
    const urls = [
        'https://grok-2-0-ai.p.rapidapi.com/chat/completions',
        'https://grok-2-0-ai.p.rapidapi.com/',
        'https://grok-4-0.p.rapidapi.com/chat/completions'
    ]

    let lastErr
    for (const url of urls) {
        const host = url.includes('grok-4') ? 'grok-4-0.p.rapidapi.com' : 'grok-2-0-ai.p.rapidapi.com'
        try {
            const { data } = await axios.post(url, body, {
                headers: rapidHeaders(host),
                timeout: TIMEOUT_RAPIDO
            })
            const out = extrairTexto(data)
            if (out) return out
        } catch (err) {
            lastErr = err
        }
    }
    throw erroRapid(lastErr || new Error('Grok sem resposta'), 'Grok-2.0-AI')
}

const extrairUrlImagem = (data) => {
    const candidatos = [
        data?.final_result?.[0],
        data?.final_result,
        data?.result?.[0]?.url,
        data?.result?.[0],
        data?.result?.url,
        data?.result,
        data?.image_url,
        data?.url,
        data?.output?.[0],
        data?.output,
        data?.images?.[0]?.url,
        data?.images?.[0],
        data?.data?.[0]?.url,
        data?.data?.url,
        data?.data?.final_result?.[0],
        data?.image
    ]
    for (const c of candidatos) {
        if (typeof c === 'string' && (c.startsWith('http') || c.startsWith('data:image'))) return c
        if (Array.isArray(c) && typeof c[0] === 'string' && c[0].startsWith('http')) return c[0]
    }
    return null
}

/** Flux text-to-image (RapidAPI). */
export const fluxGerarImagem = async (prompt) => {
    exigirRapidKey()
    try {
        const { data } = await axios.post(
            'https://ai-text-to-image-generator-flux-free-api.p.rapidapi.com/aaaaaaaaaaaaaaaaaiimagegenerator/quick.php',
            {
                prompt: String(prompt).slice(0, 800),
                style_id: 4,
                size: '1-1'
            },
            {
                headers: rapidHeaders('ai-text-to-image-generator-flux-free-api.p.rapidapi.com'),
                timeout: TIMEOUT_LONGO
            }
        )

        const imageUrl = extrairUrlImagem(data)
        if (imageUrl?.startsWith('http')) return imageUrl
        if (imageUrl?.startsWith('data:image')) return imageUrl
        if (typeof data?.base64 === 'string') {
            return Buffer.from(data.base64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
        }
        throw new Error(`Flux sem URL: ${JSON.stringify(data).slice(0, 250)}`)
    } catch (err) {
        if (err?.erro) throw err
        throw erroRapid(err, 'AI Text to Image Generator Flux Free')
    }
}

export const openAiTts = async (texto, { voice = 'alloy', model = 'tts-1', instructions } = {}) => {
    exigirRapidKey()
    try {
        const { data } = await axios.post(
            'https://open-ai-text-to-speech1.p.rapidapi.com/',
            {
                model,
                input: String(texto).slice(0, 4000),
                instructions: instructions || 'Speak clearly in a natural tone.',
                voice
            },
            {
                headers: rapidHeaders('open-ai-text-to-speech1.p.rapidapi.com'),
                timeout: TIMEOUT_LONGO,
                responseType: 'arraybuffer',
                validateStatus: (s) => s < 500
            }
        )

        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data)
        const asText = buf.slice(0, 200).toString('utf8')
        if (asText.startsWith('{') || asText.startsWith('[')) {
            const json = JSON.parse(buf.toString('utf8'))
            if (json?.message || json?.error) {
                throw erroRapid({ response: { status: 403, data: json } }, 'OpenAI Text-to-Speech')
            }
            const b64 = json?.audio || json?.data || json?.result || json?.base64
            if (typeof b64 === 'string') {
                return Buffer.from(b64.replace(/^data:audio\/\w+;base64,/, ''), 'base64')
            }
            if (typeof json?.url === 'string') return baixarUrl(json.url)
        }
        if (buf.length < 500) throw new Error('TTS RapidAPI retornou áudio inválido')
        return buf
    } catch (err) {
        if (err?.erro) throw err
        throw erroRapid(err, 'OpenAI Text-to-Speech')
    }
}

export const buscarVagas = async (query, { country = 'br', num = 5 } = {}) => {
    exigirRapidKey()
    try {
        const { data } = await axios.get('https://jsearch.p.rapidapi.com/search', {
            params: {
                query: String(query),
                country,
                page: '1',
                num_pages: '1',
                date_posted: 'month'
            },
            headers: {
                'x-rapidapi-key': rapidKey(),
                'x-rapidapi-host': 'jsearch.p.rapidapi.com'
            },
            timeout: TIMEOUT
        })

        const jobs = data?.data || data?.jobs || []
        if (!jobs.length) throw new Error('Nenhuma vaga encontrada')

        const linhas = jobs.slice(0, num).map((j, i) => {
            const titulo = j.job_title || j.title || 'Vaga'
            const empresa = j.employer_name || j.company || '—'
            const local = [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', ') || j.location || ''
            const link = j.job_apply_link || j.job_google_link || j.apply_link || ''
            return `*${i + 1}. ${titulo}*\nEmpresa: ${empresa}\nLocal: ${local}${link ? `\nLink: ${link}` : ''}`
        })

        return `💼 *Vagas:* ${query}\n\n${linhas.join('\n\n')}`
    } catch (err) {
        if (err?.erro) throw err
        if (err?.message === 'Nenhuma vaga encontrada') throw { erro: err.message }
        throw erroRapid(err, 'JSearch')
    }
}

export const chatgpt42Video = async (prompt) => {
    exigirRapidKey()
    const endpoints = [
        ['https://chatgpt-42.p.rapidapi.com/texttovideo', { prompt: String(prompt), text: String(prompt) }],
        ['https://chatgpt-42.p.rapidapi.com/aitovideo', { prompt: String(prompt) }],
        ['https://chatgpt-42.p.rapidapi.com/video', { prompt: String(prompt) }],
        ['https://chatgpt-42.p.rapidapi.com/conversationgpt4-2', {
            messages: [{ role: 'user', content: `Generate a short video about: ${prompt}` }],
            system_prompt: 'You are a video generation assistant. Return only a direct mp4 URL if available.',
            temperature: 0.5,
            max_tokens: 256,
            web_access: false
        }]
    ]
    let lastErr
    for (const [url, body] of endpoints) {
        try {
            const { data } = await axios.post(url, body, {
                headers: rapidHeaders('chatgpt-42.p.rapidapi.com'),
                timeout: TIMEOUT_LONGO
            })
            const videoUrl =
                data?.url ||
                data?.video_url ||
                data?.result ||
                data?.output ||
                extrairUrlImagem(data)
            if (typeof videoUrl === 'string' && /\.(mp4|webm|mov)(\?|$)/i.test(videoUrl)) return videoUrl
            if (typeof videoUrl === 'string' && videoUrl.startsWith('http') && /video/i.test(videoUrl)) return videoUrl
        } catch (err) {
            lastErr = err
        }
    }
    throw erroRapid(lastErr || new Error('Vídeo IA indisponível'), 'ChatGPT-42 (vídeo)')
}

/** StemSplit — isola vocais ou instrumental. */
export const stemSplitSeparar = async (bufferAudio, tipo = 'VOCALS') => {
    exigirRapidKey()
    const outputType = tipo === 'INSTRUMENTAL' ? 'INSTRUMENTAL' : 'VOCALS'
    const hosts = [
        'stemsplit-ai-audio-stem-separation-youtube-to-stems2.p.rapidapi.com',
        'stemsplit-ai-audio-stem-separation.p.rapidapi.com'
    ]

    const sourceUrl = await uploadTemporario(bufferAudio, 'audio.mp3')
    let lastErr

    for (const host of hosts) {
        try {
            const { data: job } = await axios.post(
                `https://${host}/jobs`,
                {
                    sourceUrl,
                    outputType,
                    quality: 'BALANCED',
                    outputFormat: 'MP3'
                },
                { headers: rapidHeaders(host), timeout: TIMEOUT }
            )

            const jobId = job?.id || job?.jobId || job?.job_id
            if (!jobId) throw new Error('StemSplit sem job id')

            const deadline = Date.now() + 180000
            while (Date.now() < deadline) {
                await new Promise((r) => setTimeout(r, 2500))
                const { data: status } = await axios.get(`https://${host}/jobs/${jobId}`, {
                    headers: {
                        'x-rapidapi-key': rapidKey(),
                        'x-rapidapi-host': host
                    },
                    timeout: TIMEOUT
                })

                const st = String(status?.status || '').toUpperCase()
                if (st === 'COMPLETED' || st === 'DONE' || st === 'SUCCESS') {
                    const outs = status?.outputs || {}
                    const url =
                        (outputType === 'INSTRUMENTAL'
                            ? outs?.instrumental?.url || outs?.instrumental
                            : outs?.vocals?.url || outs?.vocals) ||
                        outs?.url ||
                        status?.resultUrl ||
                        status?.download_url
                    if (typeof url === 'string' && url.startsWith('http')) return baixarUrl(url)
                    throw new Error('StemSplit concluído sem URL de áudio')
                }
                if (st === 'FAILED' || st === 'ERROR') {
                    throw new Error(status?.errorMessage || status?.error || 'StemSplit falhou')
                }
            }
            throw new Error('StemSplit timeout')
        } catch (err) {
            lastErr = err
        }
    }
    throw erroRapid(lastErr || new Error('StemSplit falhou'), 'StemSplit')
}

const bufferSafe = (b) => (Buffer.isBuffer(b) ? b : Buffer.from(b))

/** Remove fundo — API4AI + fallbacks. */
export const removeBgRapid = async (bufferImagem) => {
    exigirRapidKey()
    const tentativas = [
        async () => {
            const form = new FormData()
            form.append('image', bufferSafe(bufferImagem), { filename: 'image.png', contentType: 'image/png' })
            const { data } = await axios.post(
                'https://background-removal4.p.rapidapi.com/v1/results',
                form,
                {
                    headers: {
                        ...form.getHeaders(),
                        'x-rapidapi-key': rapidKey(),
                        'x-rapidapi-host': 'background-removal4.p.rapidapi.com'
                    },
                    timeout: TIMEOUT_LONGO,
                    params: { mode: 'fg-image' }
                }
            )
            const b64 =
                data?.results?.[0]?.entities?.[0]?.image ||
                data?.results?.[0]?.entities?.[0]?.image_base64 ||
                data?.image
            if (typeof b64 === 'string') {
                return Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
            }
            if (data?.results?.[0]?.entities?.[0]?.url) {
                return baixarUrl(data.results[0].entities[0].url)
            }
            throw new Error('API4AI sem imagem')
        },
        async () => {
            const url = await uploadTemporario(bufferSafe(bufferImagem), 'img.png')
            const form = new URLSearchParams()
            form.append('url', url)
            const { data } = await axios.post(
                'https://background-removal-ai.p.rapidapi.com/remove-background',
                form.toString(),
                {
                    headers: {
                        ...rapidHeaders('background-removal-ai.p.rapidapi.com', 'application/x-www-form-urlencoded')
                    },
                    timeout: TIMEOUT_LONGO
                }
            )
            const out = data?.url || data?.result || data?.image_url || data?.output
            if (typeof out === 'string' && out.startsWith('http')) return baixarUrl(out)
            throw new Error('sem url rembg')
        }
    ]

    let lastErr
    for (const t of tentativas) {
        try {
            const buf = await t()
            if (buf?.length > 500) return buf
        } catch (err) {
            lastErr = err
        }
    }
    throw erroRapid(lastErr || new Error('RemoveBG falhou'), 'Background Removal')
}

/** Upscale via RapidAPI / fallbacks locais. */
export const upscaleRapid = async (bufferImagem) => {
    if (rapidKey()) {
        try {
            const url = await uploadTemporario(bufferSafe(bufferImagem), 'up.png')
            const { data } = await axios.post(
                'https://picsart-image-tools.p.rapidapi.com/upscale',
                { image_url: url, upscale_factor: 2 },
                {
                    headers: rapidHeaders('picsart-image-tools.p.rapidapi.com'),
                    timeout: TIMEOUT_LONGO
                }
            )
            const out = data?.data?.url || data?.url || data?.result
            if (typeof out === 'string' && out.startsWith('http')) return baixarUrl(out)
        } catch {
            /* fallback local */
        }
    }
    return null
}

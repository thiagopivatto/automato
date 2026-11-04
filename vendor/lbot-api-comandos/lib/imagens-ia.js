import axios from 'axios'
import FormData from 'form-data'
import { gradioCall, baixarArquivoGradio, achatarArquivosGradio } from './gradio.js'

const FLUX_BASE = 'https://black-forest-labs-flux-1-schnell.hf.space'
const POLLINATIONS_CLASSIC = 'https://image.pollinations.ai/prompt'
const HORDE_BASE = 'https://stablehorde.net/api/v2'

function bufferImagemOk(buf) {
    if (!buf || buf.length < 1500) return false
    const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf)
    // JPEG / PNG / WEBP
    if (b[0] === 0xff && b[1] === 0xd8) return true
    if (b.slice(0, 8).toString('hex').startsWith('89504e47')) return true
    if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return true
    return false
}

/** Pollinations Classic — sem chave, rápido (rate-limit por IP). */
async function pollinationsClassic(prompt, { width = 1024, height = 1024 } = {}) {
    const p = String(prompt || '').trim().slice(0, 450)
    if (!p) throw new Error('Prompt vazio')
    const seed = Math.floor(Math.random() * 1e9)
    const url =
        `${POLLINATIONS_CLASSIC}/${encodeURIComponent(p)}` +
        `?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`
    const { data, status } = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 45000,
        maxContentLength: 15 * 1024 * 1024,
        validateStatus: () => true,
        headers: { Accept: 'image/*', 'User-Agent': 'UltronBot/1.0' }
    })
    const buf = Buffer.from(data)
    if (status === 402 || status === 429) throw new Error(`Pollinations rate-limit ${status}`)
    if (status >= 400) throw new Error(`Pollinations ${status}`)
    if (!bufferImagemOk(buf)) throw new Error('Pollinations buffer inválido')
    return buf
}

async function fluxHf(prompt, { width = 1024, height = 1024 } = {}) {
    const resultado = await gradioCall(
        FLUX_BASE,
        'infer',
        [String(prompt).slice(0, 800), 0, true, width, height, 4],
        { timeoutMs: 90000 }
    )
    const arquivos = achatarArquivosGradio(resultado)
    if (!arquivos.length) throw new Error('Flux HF sem imagem')
    const buf = await baixarArquivoGradio(FLUX_BASE, arquivos[0])
    if (!bufferImagemOk(buf)) throw new Error('Flux HF buffer inválido')
    return buf
}

async function deepAi(prompt) {
    const form = new FormData()
    form.append('text', String(prompt).slice(0, 500))
    const { data, status } = await axios.post('https://api.deepai.org/api/text2img', form, {
        headers: {
            ...form.getHeaders(),
            'api-key': process.env.DEEPAI_API_KEY?.trim() || 'quickstart-QUdJIGlzIGNvbWluZy4uLi4K'
        },
        timeout: 60000,
        validateStatus: () => true
    })
    const url = data?.output_url
    if (status >= 400 || !url) throw new Error(data?.err || `DeepAI ${status}`)
    const img = await axios.get(url, { responseType: 'arraybuffer', timeout: 45000 })
    const buf = Buffer.from(img.data)
    if (!bufferImagemOk(buf)) throw new Error('DeepAI inválido')
    return buf
}

/** AI Horde — anônimo (lento; último recurso free). */
async function aiHorde(prompt, { width = 512, height = 512 } = {}) {
    const p = String(prompt || '').trim().slice(0, 900)
    if (!p) throw new Error('Prompt vazio')
    const key = process.env.AI_HORDE_API_KEY?.trim() || '0000000000'
    const { data: job, status: st } = await axios.post(
        `${HORDE_BASE}/generate/async`,
        {
            prompt: p,
            params: {
                width: Math.min(1024, Math.max(512, width)),
                height: Math.min(1024, Math.max(512, height)),
                steps: 20,
                cfg_scale: 7,
                sampler_name: 'k_euler',
                n: 1
            },
            nsfw: false,
            censor_nsfw: true,
            models: ['stable_diffusion'],
            r2: true
        },
        {
            timeout: 20000,
            headers: { apikey: key, 'Content-Type': 'application/json', ClientAgent: 'UltronBot:1.0' },
            validateStatus: () => true
        }
    )
    if (st >= 400 || !job?.id) throw new Error(job?.message || `Horde ${st}`)
    const id = job.id
    const deadline = Date.now() + 75000
    while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2500))
        const { data: check } = await axios.get(`${HORDE_BASE}/generate/check/${id}`, {
            timeout: 15000,
            headers: { apikey: key, ClientAgent: 'UltronBot:1.0' },
            validateStatus: () => true
        })
        if (check?.done) break
        if (check?.faulted) throw new Error('Horde faulted')
    }
    const { data: status } = await axios.get(`${HORDE_BASE}/generate/status/${id}`, {
        timeout: 20000,
        headers: { apikey: key, ClientAgent: 'UltronBot:1.0' },
        validateStatus: () => true
    })
    const gens = status?.generations || []
    const first = gens[0]
    const imgUrl = first?.img
    if (!imgUrl) throw new Error('Horde sem imagem')
    if (String(imgUrl).startsWith('http')) {
        const img = await axios.get(imgUrl, {
            responseType: 'arraybuffer',
            timeout: 45000,
            maxContentLength: 12 * 1024 * 1024
        })
        const buf = Buffer.from(img.data)
        if (!bufferImagemOk(buf)) throw new Error('Horde buffer inválido')
        return buf
    }
    // base64
    const buf = Buffer.from(String(imgUrl).replace(/^data:image\/\w+;base64,/, ''), 'base64')
    if (!bufferImagemOk(buf)) throw new Error('Horde base64 inválido')
    return buf
}

/**
 * Gera imagem com fontes free/baratas (sem Cloudflare).
 * Ordem: Pollinations classic ∥ HF Flux → DeepAI → AI Horde.
 */
export async function gerarImagemMultiFonte(prompt, opts = {}) {
    const p = String(prompt || '').trim()
    if (!p) throw new Error('Prompt vazio')

    const erros = []

    // Primeira onda em paralelo: quem responder primeiro com buffer válido ganha
    try {
        const buf = await Promise.any([
            pollinationsClassic(p, opts).catch((e) => {
                erros.push(`pollinations:${e.message}`)
                return Promise.reject(e)
            }),
            fluxHf(p, opts).catch((e) => {
                erros.push(`flux:${e.message}`)
                return Promise.reject(e)
            })
        ])
        if (buf?.length) return buf
    } catch {
        /* AggregateError — tenta próximos */
    }

    try {
        return await deepAi(p)
    } catch (err) {
        erros.push(`deepai:${err.message}`)
    }

    try {
        return await aiHorde(p, { width: 512, height: 512 })
    } catch (err) {
        erros.push(`horde:${err.message}`)
    }

    throw new Error(`Falha ao gerar imagem (${erros.join(' | ') || 'sem fontes'})`)
}

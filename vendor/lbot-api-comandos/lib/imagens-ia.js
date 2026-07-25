import axios from 'axios'
import FormData from 'form-data'
import { gradioCall, baixarArquivoGradio, achatarArquivosGradio } from './gradio.js'

const FLUX_BASE = 'https://black-forest-labs-flux-1-schnell.hf.space'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function bufferImagemOk(buf) {
    if (!buf || buf.length < 1500) return false
    const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf)
    // JPEG / PNG / WEBP
    if (b[0] === 0xff && b[1] === 0xd8) return true
    if (b.slice(0, 8).toString('hex').startsWith('89504e47')) return true
    if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return true
    return false
}

async function pollinations(prompt, { width = 1024, height = 1024 } = {}) {
    const seed = Math.floor(Math.random() * 1e9)
    const hosts = [
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 450))}?width=${width}&height=${height}&nologo=true&seed=${seed}`,
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 450))}?width=${width}&height=${height}&nologo=true&model=flux&seed=${seed}`
    ]
    let lastErr
    for (const url of hosts) {
        for (let tentativa = 0; tentativa < 3; tentativa++) {
            try {
                const { data, status } = await axios.get(url, {
                    responseType: 'arraybuffer',
                    timeout: 90000,
                    maxContentLength: 15 * 1024 * 1024,
                    validateStatus: () => true,
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        Accept: 'image/*,*/*'
                    }
                })
                if (status === 429) {
                    await sleep(1500 * (tentativa + 1))
                    continue
                }
                const buf = Buffer.from(data)
                if (status < 400 && bufferImagemOk(buf)) return buf
                lastErr = new Error(`pollinations ${status}`)
            } catch (err) {
                lastErr = err
                await sleep(800 * (tentativa + 1))
            }
        }
    }
    throw lastErr || new Error('Pollinations falhou')
}

async function fluxHf(prompt, { width = 1024, height = 1024 } = {}) {
    const resultado = await gradioCall(
        FLUX_BASE,
        'infer',
        [String(prompt).slice(0, 800), 0, true, width, height, 4],
        { timeoutMs: 180000 }
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
        timeout: 90000,
        validateStatus: () => true
    })
    const url = data?.output_url
    if (status >= 400 || !url) throw new Error(data?.err || `DeepAI ${status}`)
    const img = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 })
    const buf = Buffer.from(img.data)
    if (!bufferImagemOk(buf)) throw new Error('DeepAI inválido')
    return buf
}

/**
 * Gera imagem com várias fontes (evita "too many requests").
 */
export async function gerarImagemMultiFonte(prompt, opts = {}) {
    const p = String(prompt || '').trim()
    if (!p) throw new Error('Prompt vazio')

    const erros = []

    // Flux HF primeiro (mais estável sob carga)
    try {
        return await fluxHf(p, opts)
    } catch (err) {
        erros.push(`flux:${err.message}`)
    }

    try {
        return await pollinations(p, opts)
    } catch (err) {
        erros.push(`pollinations:${err.message}`)
    }

    try {
        return await deepAi(p)
    } catch (err) {
        erros.push(`deepai:${err.message}`)
    }

    throw new Error(`Falha ao gerar imagem (${erros.join(' | ')})`)
}

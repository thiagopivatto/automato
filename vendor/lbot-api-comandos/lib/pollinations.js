import axios from 'axios'

const GEN = 'https://gen.pollinations.ai'

export const pollinationsKey = () =>
    process.env.POLLINATIONS_API_KEY?.trim() ||
    process.env.POLLINATIONS_KEY?.trim() ||
    ''

const headers = (extra = {}) => {
    const key = pollinationsKey()
    const h = { Accept: '*/*', 'User-Agent': 'UltronBot/1.0', ...extra }
    if (key) h.Authorization = `Bearer ${key}`
    return h
}

function bufferImagemOk(buf) {
    if (!buf || buf.length < 1500) return false
    const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf)
    if (b[0] === 0xff && b[1] === 0xd8) return true
    if (b.slice(0, 8).toString('hex').startsWith('89504e47')) return true
    if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return true
    return false
}

function bufferVideoOk(buf) {
    if (!buf || buf.length < 5000) return false
    const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf)
    // ftyp / moov
    if (b.slice(4, 8).toString() === 'ftyp') return true
    if (b.slice(0, 4).toString() === '\x1aE\xdf\xa3') return true // webm
    const head = b.slice(0, 40).toString()
    if (/^\{|<!DOCTYPE|Insufficient|error/i.test(head)) return false
    return b.length > 20000
}

/**
 * Gera imagem via gen.pollinations.ai (API key).
 * Modelos: flux, zimage, sana, etc.
 */
export async function gerarImagemPollinations(prompt, { width = 1024, height = 1024, model = 'flux' } = {}) {
    const p = String(prompt || '').trim().slice(0, 450)
    if (!p) throw new Error('Prompt vazio')
    if (!pollinationsKey()) throw new Error('Configure POLLINATIONS_API_KEY no .env')

    const seed = Math.floor(Math.random() * 1e9)
    const models = [model, 'flux', 'zimage', 'sana'].filter((v, i, a) => a.indexOf(v) === i)
    let lastErr
    for (const m of models) {
        try {
            const url =
                `${GEN}/image/${encodeURIComponent(p)}?model=${encodeURIComponent(m)}` +
                `&width=${width}&height=${height}&seed=${seed}&nologo=true`
            const { data, status } = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxContentLength: 20 * 1024 * 1024,
                validateStatus: () => true,
                headers: headers({ Accept: 'image/*' })
            })
            const buf = Buffer.from(data)
            if (status === 402) throw new Error('Saldo insuficiente na Pollinations (Pollen).')
            if (status >= 400) {
                lastErr = new Error(`Pollinations image ${status}: ${buf.toString('utf8').slice(0, 120)}`)
                continue
            }
            if (bufferImagemOk(buf)) return buf
            lastErr = new Error('Resposta não é imagem válida')
        } catch (err) {
            lastErr = err
        }
    }
    throw lastErr || new Error('Pollinations imagem falhou')
}

/**
 * Image-to-image via Pollinations (kontext / gptimage).
 * @param {Buffer} bufferImagem
 * @param {string} prompt
 */
export async function imagemParaImagemPollinations(bufferImagem, prompt, { width = 1024, height = 1024, model = 'kontext' } = {}) {
    const p = String(prompt || 'improve this image, high quality').trim().slice(0, 400)
    if (!pollinationsKey()) throw new Error('Configure POLLINATIONS_API_KEY no .env')
    if (!bufferImagem?.length) throw new Error('Imagem vazia')

    // Upload temporário para URL pública
    const FormData = (await import('form-data')).default
    const fd = new FormData()
    fd.append('reqtype', 'fileupload')
    fd.append('time', '1h')
    fd.append('fileToUpload', Buffer.from(bufferImagem), {
        filename: 'ref.jpg',
        contentType: 'image/jpeg'
    })
    const { data: urlUpload, status: stUp } = await axios.post(
        'https://litterbox.catbox.moe/resources/internals/api.php',
        fd,
        { headers: fd.getHeaders(), timeout: 60000, maxBodyLength: Infinity, validateStatus: () => true }
    )
    if (stUp >= 400 || !String(urlUpload).startsWith('http')) {
        throw new Error('Falha ao hospedar imagem de referência')
    }
    const imageUrl = String(urlUpload).trim()

    const models = [model, 'kontext', 'gptimage', 'nova-canvas'].filter((v, i, a) => a.indexOf(v) === i)
    let lastErr
    for (const m of models) {
        try {
            const url =
                `${GEN}/image/${encodeURIComponent(p)}?model=${encodeURIComponent(m)}` +
                `&image=${encodeURIComponent(imageUrl)}&width=${width}&height=${height}&nologo=true`
            const { data, status } = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 180000,
                maxContentLength: 25 * 1024 * 1024,
                validateStatus: () => true,
                headers: headers({ Accept: 'image/*' })
            })
            const buf = Buffer.from(data)
            if (status === 402) throw new Error('Saldo insuficiente na Pollinations (Pollen).')
            if (status >= 400) {
                lastErr = new Error(`img2img ${m} ${status}`)
                continue
            }
            if (bufferImagemOk(buf)) return buf
            lastErr = new Error('Resposta inválida')
        } catch (err) {
            if (/Saldo insuficiente/i.test(err.message)) throw err
            lastErr = err
        }
    }
    throw lastErr || new Error('Image-to-image falhou')
}

/**
 * Gera vídeo via gen.pollinations.ai (nova-reel / outros).
 */
export async function gerarVideoPollinations(prompt, { model = 'nova-reel', width = 720 } = {}) {
    const p = String(prompt || '').trim().slice(0, 300)
    if (!p) throw new Error('Prompt vazio')
    if (!pollinationsKey()) throw new Error('Configure POLLINATIONS_API_KEY no .env')

    const models = [model, 'nova-reel']
    let lastErr
    for (const m of models) {
        try {
            const url =
                `${GEN}/video/${encodeURIComponent(p)}?model=${encodeURIComponent(m)}&width=${width}`
            const { data, status } = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 300000,
                maxContentLength: 80 * 1024 * 1024,
                validateStatus: () => true,
                headers: headers({ Accept: 'video/*,*/*' })
            })
            const buf = Buffer.from(data)
            if (status === 402) {
                throw new Error(
                    'Saldo insuficiente na Pollinations para vídeo. Recarregue Pollen em enter.pollinations.ai'
                )
            }
            if (status >= 400) {
                lastErr = new Error(`Pollinations video ${status}: ${buf.toString('utf8').slice(0, 140)}`)
                continue
            }
            if (bufferVideoOk(buf)) return buf
            lastErr = new Error('Resposta não é vídeo válido')
        } catch (err) {
            if (/Saldo insuficiente/i.test(err.message)) throw err
            lastErr = err
        }
    }
    throw lastErr || new Error('Pollinations vídeo falhou')
}


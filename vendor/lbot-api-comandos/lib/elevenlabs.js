import axios from 'axios'
import FormData from 'form-data'

const BASE = 'https://api.elevenlabs.io'
const TIMEOUT = 90000
const TIMEOUT_LONGO = 180000

export const elevenKey = () =>
    process.env.ELEVENLABS_API_KEY?.trim() ||
    process.env.XI_API_KEY?.trim() ||
    ''

const headers = (extra = {}) => {
    const key = elevenKey()
    if (!key) throw { erro: 'Configure ELEVENLABS_API_KEY no .env.' }
    return { 'xi-api-key': key, ...extra }
}

const msgErro = (err) => {
    const d = err?.response?.data
    if (typeof d === 'string') return d.slice(0, 250)
    if (Buffer.isBuffer(d)) {
        try {
            return JSON.parse(d.toString('utf8'))?.detail?.message || d.toString('utf8').slice(0, 200)
        } catch {
            return d.toString('utf8').slice(0, 200)
        }
    }
    return (
        d?.detail?.message ||
        d?.detail?.status ||
        (typeof d?.detail === 'string' ? d.detail : null) ||
        err?.message ||
        'Erro ElevenLabs'
    )
}

export const erroEleven = (err) => {
    const status = err?.response?.status
    const m = String(msgErro(err))
    if (status === 401 || status === 403) {
        return { erro: `ElevenLabs: ${m}. Verifique a ELEVENLABS_API_KEY / plano.` }
    }
    if (status === 402 || /paid_plan|payment_required|free users/i.test(m)) {
        return { erro: `ElevenLabs exige plano pago para este recurso: ${m}` }
    }
    return { erro: `ElevenLabs: ${m}`.slice(0, 300) }
}

/** Lista vozes; usa a primeira disponível. */
export const listarVozes = async () => {
    const { data } = await axios.get(`${BASE}/v1/voices`, {
        headers: headers(),
        timeout: 20000
    })
    return data?.voices || []
}

const VOZ_PADRAO = {
    pt: 'EXAVITQu4vr4xnSDxMaL', // Sarah
    en: 'CwhRBWXzGAHq8TQ4Fs17', // Roger
    es: 'FGY2WhTYpPnrIDTdsKH5', // Laura
    default: 'EXAVITQu4vr4xnSDxMaL'
}

const modelosEleven = () => {
    const preferido = process.env.ELEVENLABS_MODEL_ID?.trim()
    // v4 primeiro (se a API aceitar); Multilingual v2 = qualidade natural estável no TTS
    const base = [
        'eleven_v4',
        'eleven_multilingual_v2',
        'eleven_flash_v2_5',
        'eleven_turbo_v2_5'
    ]
    if (!preferido) return base
    return [preferido, ...base.filter((m) => m !== preferido)]
}

const voiceIdPadrao = (idioma) => {
    const envId = process.env.ELEVENLABS_VOICE_ID?.trim()
    if (envId) return envId
    const lang = String(idioma || 'pt').toLowerCase()
    return VOZ_PADRAO[lang] || VOZ_PADRAO.default
}

/**
 * TTS ElevenLabs (Flash/Turbo costuma funcionar no free; Multilingual também).
 * Override: ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL_ID.
 */
export const textoParaVozEleven = async (texto, { idioma = 'pt', voiceId } = {}) => {
    if (!elevenKey()) throw { erro: 'Configure ELEVENLABS_API_KEY no .env.' }
    const id = voiceId || voiceIdPadrao(idioma)
    const models = modelosEleven()
    let lastErr
    for (const model_id of models) {
        try {
            const { data, status } = await axios.post(
                `${BASE}/v1/text-to-speech/${id}`,
                {
                    text: String(texto).slice(0, 4000),
                    model_id,
                    voice_settings: {
                        stability: 0.35,
                        similarity_boost: 0.8,
                        style: 0.4,
                        use_speaker_boost: true
                    }
                },
                {
                    headers: headers({ 'Content-Type': 'application/json', Accept: 'audio/mpeg' }),
                    responseType: 'arraybuffer',
                    timeout: TIMEOUT,
                    validateStatus: () => true
                }
            )
            const buf = Buffer.from(data)
            if (status >= 400) {
                lastErr = { response: { status, data: buf } }
                continue
            }
            if (buf.length > 500 && buf.slice(0, 3).toString() !== '{') return buf
            lastErr = { response: { status, data: buf } }
        } catch (err) {
            lastErr = err
        }
    }
    throw erroEleven(lastErr || new Error('TTS falhou'))
}

/** Sound Effects / loops musicais (disponível no free). Max ~22s por chamada. */
export const gerarSomEleven = async (prompt, durationSeconds = 12) => {
    if (!elevenKey()) throw { erro: 'Configure ELEVENLABS_API_KEY no .env.' }
    try {
        const { data, status } = await axios.post(
            `${BASE}/v1/sound-generation`,
            {
                text: String(prompt).slice(0, 450),
                duration_seconds: Math.min(22, Math.max(1, Number(durationSeconds) || 12))
            },
            {
                headers: headers({ 'Content-Type': 'application/json' }),
                responseType: 'arraybuffer',
                timeout: TIMEOUT_LONGO,
                validateStatus: () => true
            }
        )
        const buf = Buffer.from(data)
        if (status >= 400) throw { response: { status, data: buf } }
        if (buf.length < 500) throw new Error('Áudio vazio')
        return buf
    } catch (err) {
        if (err?.erro) throw err
        throw erroEleven(err)
    }
}

/** Gera vários trechos SFX (até ~22s cada) para montar música longa (~60–88s). */
export const gerarSomElevenLongo = async (prompt, totalSeconds = 66) => {
    const alvo = Math.min(88, Math.max(44, Number(totalSeconds) || 66))
    const porParte = 22
    const partes = Math.ceil(alvo / porParte)
    const buffers = []
    for (let i = 0; i < partes; i++) {
        const trecho =
            `${String(prompt).slice(0, 320)}. Part ${i + 1} of ${partes}, seamless continuation of the same instrumental track, same tempo BPM and musical key, melodic loop, studio quality, no vocals, no speech.`
        const buf = await gerarSomEleven(trecho, porParte)
        buffers.push(buf)
    }
    return buffers
}

/**
 * Extrai arquivos de um ZIP (stems ElevenLabs).
 * Suporta store (0) e deflate (8).
 */
export async function extrairArquivosZip(bufferZip) {
    const zlib = await import('node:zlib')
    const { promisify } = await import('node:util')
    const inflateRaw = promisify(zlib.inflateRaw)
    const buf = Buffer.isBuffer(bufferZip) ? bufferZip : Buffer.from(bufferZip)
    if (buf.slice(0, 2).toString() !== 'PK') return []
    const out = []
    let i = 0
    while (i + 30 < buf.length) {
        if (buf.readUInt32LE(i) !== 0x04034b50) break
        const method = buf.readUInt16LE(i + 8)
        const compSize = buf.readUInt32LE(i + 18)
        const nameLen = buf.readUInt16LE(i + 26)
        const extraLen = buf.readUInt16LE(i + 28)
        const name = buf.slice(i + 30, i + 30 + nameLen).toString('utf8')
        const dataStart = i + 30 + nameLen + extraLen
        const data = buf.slice(dataStart, dataStart + compSize)
        try {
            if (method === 0 && data.length) out.push({ nome: name, buffer: data })
            else if (method === 8 && data.length) {
                const inflated = await inflateRaw(data)
                out.push({ nome: name, buffer: inflated })
            }
        } catch {
            /* skip entry */
        }
        i = dataStart + compSize
    }
    return out
}

/** Interpreta resposta de stem-separation (MP3 direto ou ZIP). */
export async function interpretarStemsEleven(raw, prefer = 'instrumental') {
    if (!raw?.length) return null
    // MP3 direto
    if (raw.slice(0, 3).toString() === 'ID3' || raw[0] === 0xff) {
        return prefer === 'vocals' ? raw : raw
    }
    if (raw.slice(0, 2).toString() === 'PK') {
        const files = await extrairArquivosZip(raw)
        const lower = (n) => String(n || '').toLowerCase()
        const pick = (preds) =>
            files.find((f) => preds.some((p) => p.test(lower(f.nome))))?.buffer
        if (prefer === 'vocals') {
            return (
                pick([/vocal/, /voice/, /sing/]) ||
                files.find((f) => f.buffer?.length > 500)?.buffer ||
                null
            )
        }
        return (
            pick([/instrument/, /accompan/, /no[_ -]?vocal/, /other/, /bass/, /drum/]) ||
            files.find((f) => !/vocal|voice/.test(lower(f.nome)))?.buffer ||
            files.find((f) => f.buffer?.length > 500)?.buffer ||
            null
        )
    }
    return null
}

/**
 * Divide texto longo em pedaços seguros p/ TTS e gera áudio de cada um.
 * Retorna array de buffers MP3 (concatenar no caller com ffmpeg).
 */
export const textoLongoParaVozEleven = async (texto, opts = {}) => {
    const limpo = String(texto || '').replace(/\s+/g, ' ').trim()
    if (!limpo) throw { erro: 'Texto vazio para TTS.' }
    const max = opts.chunkSize || 2200
    const chunks = []
    let resto = limpo
    while (resto.length) {
        if (resto.length <= max) {
            chunks.push(resto)
            break
        }
        let corte = resto.lastIndexOf('. ', max)
        if (corte < max * 0.4) corte = resto.lastIndexOf(' ', max)
        if (corte < max * 0.3) corte = max
        chunks.push(resto.slice(0, corte + 1).trim())
        resto = resto.slice(corte + 1).trim()
    }
    const buffers = []
    for (const c of chunks) {
        buffers.push(await textoParaVozEleven(c, opts))
    }
    return buffers
}

/** Music API (plano pago). */
export const gerarMusicaEleven = async (prompt, lengthMs = 15000) => {
    if (!elevenKey()) throw { erro: 'Configure ELEVENLABS_API_KEY no .env.' }
    try {
        const { data, status } = await axios.post(
            `${BASE}/v1/music`,
            {
                prompt: String(prompt).slice(0, 1000),
                music_length_ms: Math.min(60000, Math.max(5000, Number(lengthMs) || 15000))
            },
            {
                headers: headers({ 'Content-Type': 'application/json' }),
                responseType: 'arraybuffer',
                timeout: TIMEOUT_LONGO,
                validateStatus: () => true
            }
        )
        const buf = Buffer.from(data)
        if (status >= 400) throw { response: { status, data: buf } }
        if (buf.length < 500) throw new Error('Música vazia')
        return buf
    } catch (err) {
        if (err?.erro) throw err
        throw erroEleven(err)
    }
}

/** Isolamento de voz (remove ruído / isola fala). */
export const isolarAudioEleven = async (bufferAudio) => {
    if (!elevenKey()) throw { erro: 'Configure ELEVENLABS_API_KEY no .env.' }
    const form = new FormData()
    form.append('audio', Buffer.from(bufferAudio), {
        filename: 'audio.mp3',
        contentType: 'audio/mpeg'
    })
    try {
        const { data, status } = await axios.post(`${BASE}/v1/audio-isolation`, form, {
            headers: { ...form.getHeaders(), ...headers() },
            responseType: 'arraybuffer',
            timeout: TIMEOUT_LONGO,
            validateStatus: () => true,
            maxBodyLength: Infinity
        })
        const buf = Buffer.from(data)
        if (status >= 400) throw { response: { status, data: buf } }
        if (buf.length < 500) throw new Error('Isolamento vazio')
        return buf
    } catch (err) {
        if (err?.erro) throw err
        throw erroEleven(err)
    }
}

/**
 * Separação de stems (plano pago na maioria das contas).
 * Retorna buffer ZIP ou áudio conforme a API.
 */
export const separarStemsEleven = async (bufferAudio, variation = 'two_stems_v1') => {
    if (!elevenKey()) throw { erro: 'Configure ELEVENLABS_API_KEY no .env.' }
    const form = new FormData()
    form.append('file', Buffer.from(bufferAudio), {
        filename: 'song.mp3',
        contentType: 'audio/mpeg'
    })
    form.append('stem_variation_id', variation)
    form.append('output_format', 'mp3_44100_128')
    try {
        const { data, status } = await axios.post(`${BASE}/v1/music/stem-separation`, form, {
            headers: { ...form.getHeaders(), ...headers() },
            responseType: 'arraybuffer',
            timeout: TIMEOUT_LONGO,
            validateStatus: () => true,
            maxBodyLength: Infinity
        })
        const buf = Buffer.from(data)
        if (status >= 400) throw { response: { status, data: buf } }
        if (buf.length < 500) throw new Error('Stems vazios')
        return buf
    } catch (err) {
        if (err?.erro) throw err
        throw erroEleven(err)
    }
}

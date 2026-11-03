/**
 * TTS: ElevenLabs → Edge neural (grátis) → OpenAI Rapid (última reserva).
 * Saída preferencial: OGG/Opus para PTT do WhatsApp.
 * Fallback silencioso: erros só no log — nunca expor provedor ao usuário.
 */
import fs from 'fs-extra'
import axios from 'axios'
import ffmpeg from 'fluent-ffmpeg'
import googleTTS from 'google-tts-api'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { obterCaminhoTemporario } from './util.js'
import { elevenKey, textoLongoParaVozEleven } from './elevenlabs.js'
import { pollinationsKey } from './pollinations.js'
import { openAiTts, rapidKey } from './rapidapi.js'
import { concatenarMp3 } from './uvr5.js'

const VOZ_EDGE_PT = {
    pt: 'pt-BR-FranciscaNeural',
    'pt-br': 'pt-BR-FranciscaNeural',
    br: 'pt-BR-FranciscaNeural',
    en: 'en-US-JennyNeural',
    es: 'es-ES-ElviraNeural',
    default: 'pt-BR-FranciscaNeural'
}

/** Palavras por minuto aproximadas por provedor (pt-BR narrativo). */
export const WPM_TTS = {
    elevenlabs: 155,
    edge: 145,
    openai: 150,
    default: 150
}

export function estimarDuracaoSegundos(texto, fonte = 'default') {
    const palavras = String(texto || '').trim().split(/\s+/).filter(Boolean).length
    const wpm = WPM_TTS[fonte] || WPM_TTS.default
    if (!palavras || !wpm) return 0
    return Math.round((palavras / wpm) * 60)
}

export function palavrasParaDuracao(segundos, fonte = 'default') {
    const wpm = WPM_TTS[fonte] || WPM_TTS.default
    return Math.round((Number(segundos) || 0) * (wpm / 60))
}

function fatiarTexto(texto, maxChunk = 900) {
    const pedacos = []
    let resto = String(texto || '').replace(/\s+/g, ' ').trim()
    while (resto.length) {
        if (resto.length <= maxChunk) {
            pedacos.push(resto)
            break
        }
        let corte = resto.lastIndexOf('. ', maxChunk)
        if (corte < maxChunk * 0.4) corte = resto.lastIndexOf(' ', maxChunk)
        if (corte < 40) corte = maxChunk
        pedacos.push(resto.slice(0, corte + 1).trim())
        resto = resto.slice(corte + 1).trim()
    }
    return pedacos
}

function escaparXml(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

async function edgeTtsChunk(texto, voice, prosodia) {
    const tts = new MsEdgeTTS()
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
    const { audioStream } = await tts.toStream(escaparXml(texto), prosodia || undefined)
    const chunks = []
    for await (const c of audioStream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
    return Buffer.concat(chunks)
}

<<<<<<< HEAD
async function textoParaVozEdge(texto, idioma = 'pt', { voz, prosodia } = {}) {
    const lang = String(idioma || 'pt').toLowerCase()
    const voice = voz || VOZ_EDGE_PT[lang] || VOZ_EDGE_PT.default
    const pedacos = fatiarTexto(texto, 900)
=======
async function textoParaVozEdge(texto, idioma = 'pt', { voz, prosodia, variarProsodia = false } = {}) {
    const lang = String(idioma || 'pt').toLowerCase()
    const voice = voz || VOZ_EDGE_PT[lang] || VOZ_EDGE_PT.default
    const pedacos = fatiarTexto(texto, variarProsodia ? 650 : 900)
>>>>>>> 67d8f2ac3ba6377e38df26725679b70c87913c80
    const buffers = []
    for (let i = 0; i < pedacos.length; i++) {
        const p = pedacos[i]
        if (!p.trim()) continue
<<<<<<< HEAD
        const buf = await edgeTtsChunk(p, voice, prosodia)
=======
        const pro = variarProsodia ? PROSODIAS_CONVERSA[i % PROSODIAS_CONVERSA.length] : prosodia
        const buf = await edgeTtsChunk(p, voice, pro)
>>>>>>> 67d8f2ac3ba6377e38df26725679b70c87913c80
        if (buf?.length > 200) buffers.push(buf)
    }
    if (!buffers.length) throw new Error('Edge TTS vazio')
    return buffers.length === 1 ? buffers[0] : await concatenarMp3(buffers)
}

<<<<<<< HEAD
export async function duracaoAudioSegundos(buffer) {
=======
const VOZ_POLLINATIONS = 'onyx'
const MODELO_VOZ_GRATIS = 'microsoft/mai-voice-2.1-flash'

async function baixarMp3(url) {
    const { data, status } = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 20000,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    if (status >= 400) throw new Error(`download TTS ${status}`)
    const buf = Buffer.from(data)
    if (buf.length < 200) throw new Error('TTS baixado vazio')
    return buf
}

async function pollinationsChunk(texto, voz) {
    const key = pollinationsKey()
    if (!key) throw new Error('Pollinations sem chave')
    const voices = [...new Set([voz, VOZ_POLLINATIONS, 'alloy'].filter(Boolean))]
    let ultimo
    for (const voice of voices) {
        const { data, status } = await axios.post(
            'https://gen.pollinations.ai/v1/audio/speech',
            {
                model: MODELO_VOZ_GRATIS,
                input: texto,
                voice,
                response_format: 'mp3'
            },
            {
                responseType: 'arraybuffer',
                timeout: 90000,
                maxContentLength: 25 * 1024 * 1024,
                validateStatus: () => true,
                headers: {
                    Authorization: `Bearer ${key}`,
                    'Content-Type': 'application/json'
                }
            }
        )
        const buf = Buffer.from(data)
        const cabeca = buf.slice(0, 80).toString('utf8')
        if (status < 400 && buf.length > 500 && !cabeca.startsWith('{')) return buf
        ultimo = new Error(`Pollinations TTS ${status}: ${cabeca.replace(/\s+/g, ' ').slice(0, 160)}`)
        if (status === 402 || status === 401) break
    }
    throw ultimo || new Error('Pollinations TTS falhou')
}

/** Voz gratuita que ainda responde quando a ElevenLabs está sem crédito. */
async function textoParaVozPollinations(texto, voz = VOZ_POLLINATIONS) {
    const pedacos = fatiarTexto(texto, 1000)
    const buffers = []
    for (const p of pedacos) {
        if (!p.trim()) continue
        const buf = await pollinationsChunk(p, voz)
        if (buf?.length > 500) buffers.push(buf)
    }
    if (!buffers.length) throw new Error('Pollinations TTS vazio')
    return buffers.length === 1 ? buffers[0] : await concatenarMp3(buffers)
}

/** Google Tradutor, pt-BR, sem chave. */
async function textoParaVozGoogle(texto, idioma = 'pt') {
    const mapa = { pt: 'pt', 'pt-br': 'pt', br: 'pt', en: 'en', es: 'es' }
    const lang = mapa[String(idioma || 'pt').toLowerCase()] || 'pt'
    const partes = googleTTS.getAllAudioUrls(String(texto), {
        lang,
        slow: false,
        splitPunct: '. '
    })
    const buffers = []
    for (let i = 0; i < partes.length; i++) {
        if (i > 0 && i % 5 === 0) await new Promise((r) => setTimeout(r, 300))
        const buf = await baixarMp3(partes[i].url)
        if (buf?.length > 200) buffers.push(buf)
    }
    if (!buffers.length) throw new Error('Google TTS vazio')
    return buffers.length === 1 ? buffers[0] : await concatenarMp3(buffers)
}

function avisoVozIaIndisponivel(motivo) {
    const m = String(motivo || '')
    if (/402|quota|credit|cota|payment|paid_plan|credits remaining/i.test(m)) {
        return '[❗] Erro: a IA de voz não está disponível (sem cota ou crédito). O resumo vai no *TTS gratuito*.'
    }
    if (/sem chave|Configure ELEVENLABS/i.test(m)) {
        return '[❗] Erro: a IA de voz não está disponível (ElevenLabs sem chave). O resumo vai no *TTS gratuito*.'
    }
    return '[❗] Erro: a IA de voz não está disponível. O resumo vai no *TTS gratuito*.'
}

/** Varia um pouco o ritmo pra não soar leitura de redação. */
const PROSODIAS_CONVERSA = [
    { rate: '+2%', pitch: '-3Hz' },
    { rate: '+6%', pitch: '-1Hz' },
    { rate: '-2%', pitch: '-5Hz' },
    { rate: '+4%', pitch: '-4Hz' },
    { rate: '+1%', pitch: '-2Hz' }
]

async function duracaoAudioSegundos(buffer) {
>>>>>>> 67d8f2ac3ba6377e38df26725679b70c87913c80
    const entrada = obterCaminhoTemporario('mp3')
    await fs.writeFile(entrada, buffer)
    try {
        return await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(entrada, (err, data) => {
                if (err) return reject(err)
                resolve(Number(data?.format?.duration) || 0)
            })
        })
    } finally {
        try { await fs.unlink(entrada) } catch { /* */ }
    }
}

<<<<<<< HEAD
=======
/** atempo desejado = duração atual / duração alvo. Encadeia se sair de 0.5–2. */
>>>>>>> 67d8f2ac3ba6377e38df26725679b70c87913c80
function fatoresAtempo(razao) {
    const fatores = []
    let r = Number(razao) || 1
    while (r < 0.5 && fatores.length < 4) {
        fatores.push(0.5)
        r /= 0.5
    }
    while (r > 2 && fatores.length < 4) {
        fatores.push(2)
        r /= 2
    }
    fatores.push(Math.min(2, Math.max(0.5, r)))
    return fatores
}

async function aplicarAtempo(buffer, razao) {
    const filtros = fatoresAtempo(razao).map((f) => `atempo=${f.toFixed(4)}`)
    const entrada = obterCaminhoTemporario('mp3')
    const saida = obterCaminhoTemporario('mp3')
    await fs.writeFile(entrada, buffer)
    try {
        await new Promise((resolve, reject) => {
            ffmpeg(entrada)
                .audioFilters(filtros)
                .audioCodec('libmp3lame')
                .audioBitrate('160k')
                .format('mp3')
                .save(saida)
                .on('end', resolve)
                .on('error', reject)
        })
        return await fs.readFile(saida)
    } finally {
        try { await fs.unlink(entrada) } catch { /* */ }
        try { await fs.unlink(saida) } catch { /* */ }
    }
}

/**
<<<<<<< HEAD
 * Ajuste leve de duração.
 * - maxSeg: sempre corta se passar
 * - minSeg: só estica se forcarMinimo=true (conteúdo suficiente)
 */
export async function encaixarDuracaoMp3(buffer, minSeg, maxSeg, { forcarMinimo = false } = {}) {
=======
 * Encaixa o áudio em [minSeg, maxSeg].
 * Alvo interno deixa uma folga para não grudar no limite.
 */
async function encaixarDuracaoMp3(buffer, minSeg, maxSeg) {
>>>>>>> 67d8f2ac3ba6377e38df26725679b70c87913c80
    const min = Number(minSeg) || 0
    const max = Number(maxSeg) || 0
    if (!min && !max) return { audio: buffer, duracao: 0 }
    let audio = buffer
    let dur = await duracaoAudioSegundos(audio)
    if (!dur) return { audio, duracao: 0 }
    for (let i = 0; i < 2; i++) {
<<<<<<< HEAD
        if (max && dur > max) audio = await aplicarAtempo(audio, dur / (max - 5))
        else if (forcarMinimo && min && dur < min) audio = await aplicarAtempo(audio, dur / (min + 8))
=======
        if (min && dur < min) audio = await aplicarAtempo(audio, dur / (min + 12))
        else if (max && dur > max) audio = await aplicarAtempo(audio, dur / (max - 12))
>>>>>>> 67d8f2ac3ba6377e38df26725679b70c87913c80
        else break
        dur = await duracaoAudioSegundos(audio)
    }
    return { audio, duracao: dur }
}

<<<<<<< HEAD
=======
export async function medirDuracaoAudio(buffer) {
    return duracaoAudioSegundos(buffer)
}

export async function encaixarDuracaoAudio(buffer, minSeg, maxSeg) {
    return encaixarDuracaoMp3(buffer, minSeg, maxSeg)
}

>>>>>>> 67d8f2ac3ba6377e38df26725679b70c87913c80
/** Converte qualquer áudio (mp3/webm/…) para OGG Opus (voz WhatsApp). */
export async function converterParaOpus(bufferAudio) {
    const entrada = obterCaminhoTemporario('bin')
    const saida = obterCaminhoTemporario('ogg')
    await fs.writeFile(entrada, bufferAudio)
    try {
        await new Promise((resolve, reject) => {
            ffmpeg(entrada)
                .noVideo()
                .audioCodec('libopus')
                .audioBitrate('48k')
                .audioChannels(1)
                .audioFrequency(48000)
                .format('ogg')
                .outputOptions(['-application', 'voip'])
                .on('end', resolve)
                .on('error', reject)
                .save(saida)
        })
        return await fs.readFile(saida)
    } finally {
        try { await fs.unlink(entrada) } catch { /* */ }
        try { await fs.unlink(saida) } catch { /* */ }
    }
}

/** Voz padrão Ultron (mesma do !resumodogrupo). */
export const OPCOES_TTS_ULTRON = {
    vozEdge: 'pt-BR-AntonioNeural',
    prosodiaEdge: { rate: '-3%', pitch: '-1Hz' }
}

/**
<<<<<<< HEAD
 * @returns {{ resultado: Buffer, fonte: string, mimetype: string, ptt: true, duracao?: number }}
=======
 * @returns {{ resultado: Buffer, fonte: string, mimetype: string, ptt: true, aviso?: string, duracao?: number }}
>>>>>>> 67d8f2ac3ba6377e38df26725679b70c87913c80
 */
export async function textoParaVozRobusto(texto, {
    idioma = 'pt',
    maxPalavras = 900,
<<<<<<< HEAD
    vozEdge = OPCOES_TTS_ULTRON.vozEdge,
    prosodiaEdge = OPCOES_TTS_ULTRON.prosodiaEdge,
    minSegundos = 0,
    maxSegundos = 0,
    forcarDuracaoMinima = false
=======
    vozEdge = '',
    prosodiaEdge = null,
    prosodiaVariada = false,
    avisarSemVozIa = false,
    minSegundos = 0,
    maxSegundos = 0,
    manterMp3 = false,
    pularEleven = false,
    instrucaoOpenAi = ''
>>>>>>> 67d8f2ac3ba6377e38df26725679b70c87913c80
} = {}) {
    let limpo = String(texto || '').replace(/\s+/g, ' ').trim()
    if (!limpo) throw { erro: 'Texto vazio para áudio.' }
    const palavras = limpo.split(/\s+/)
    if (palavras.length > maxPalavras) limpo = palavras.slice(0, maxPalavras).join(' ')

    let audio = null
    let fonte = ''
    let aviso = ''
    let motivoVozIa = ''

    if (!pularEleven && elevenKey()) {
        try {
            const pedacos = await textoLongoParaVozEleven(limpo, { idioma, chunkSize: 1800 })
            audio = await concatenarMp3(pedacos)
            if (audio?.length > 500) fonte = 'elevenlabs'
            else audio = null
        } catch (err) {
            motivoVozIa = err?.erro || err?.message || 'erro'
            console.log(`TTS ElevenLabs fallback - ${motivoVozIa}`)
            audio = null
        }
    } else if (!pularEleven) {
        motivoVozIa = 'sem chave'
    }

    if (!audio && avisarSemVozIa && !pularEleven) {
        aviso = avisoVozIaIndisponivel(motivoVozIa)
        console.log(`TTS resumo: ${aviso.replace(/\*/g, '')}`)
    }

    if (!audio && pollinationsKey()) {
        try {
            audio = await textoParaVozPollinations(limpo, 'onyx')
            if (audio?.length > 500) fonte = 'pollinations'
            else audio = null
        } catch (err) {
            console.log(`TTS Pollinations fallback - ${err?.message || err}`)
            audio = null
        }
    }

    if (!audio) {
        try {
<<<<<<< HEAD
            audio = await textoParaVozEdge(limpo, idioma, { voz: vozEdge, prosodia: prosodiaEdge })
=======
            audio = await textoParaVozGoogle(limpo, idioma)
            if (audio?.length > 500) fonte = 'google'
            else audio = null
        } catch (err) {
            console.log(`TTS Google fallback - ${err?.message || err}`)
            audio = null
        }
    }

    if (!audio) {
        try {
            audio = await textoParaVozEdge(limpo, idioma, {
                voz: vozEdge,
                prosodia: prosodiaEdge,
                variarProsodia: prosodiaVariada
            })
>>>>>>> 67d8f2ac3ba6377e38df26725679b70c87913c80
            if (audio?.length > 500) fonte = 'edge'
            else audio = null
        } catch (err) {
            console.log(`TTS Edge fallback - ${err?.message || err}`)
            audio = null
        }
    }

    if (!audio && rapidKey()) {
        try {
            const pedacosTxt = fatiarTexto(limpo, 180)
            const buffers = []
            for (const pedaco of pedacosTxt.slice(0, 80)) {
                const buf = await openAiTts(pedaco, {
                    voice: 'nova',
                    model: 'tts-1-hd',
                    instructions: instrucaoOpenAi || 'Speak naturally in Brazilian Portuguese (pt-BR), warm and expressive, not robotic.'
                })
                if (buf?.length > 200) buffers.push(buf)
            }
            if (buffers.length) {
                audio = await concatenarMp3(buffers)
                fonte = 'openai'
                if (avisarSemVozIa) {
                    aviso = '[❗] Erro: a IA de voz e o TTS gratuito falharam. O resumo vai numa voz reserva.'
                }
            }
        } catch (err) {
            console.log(`TTS OpenAI fallback - ${err?.erro || err?.message || err}`)
        }
    }

    if (!audio || audio.length < 500) {
        throw { erro: 'Falha no TTS. A IA de voz e os TTS gratuitos não responderam. Tente novamente.' }
    }
    if (fonte && fonte !== 'elevenlabs') {
        console.log(`TTS gratuito ok: ${fonte}`)
    }

    let duracao = 0
    if (minSegundos || maxSegundos) {
        try {
            const encaixe = await encaixarDuracaoMp3(audio, minSegundos, maxSegundos)
            audio = encaixe.audio
            duracao = encaixe.duracao
            console.log(`TTS duração: ${Math.round(duracao)}s (fonte ${fonte})`)
        } catch (err) {
            console.log(`TTS ajuste de duração - ${err?.message || err}`)
        }
    } else if (manterMp3) {
        try {
            duracao = await duracaoAudioSegundos(audio)
        } catch (err) {
            console.log(`TTS medir duração - ${err?.message || err}`)
        }
    }

    if (manterMp3) {
        return {
            resultado: audio,
            fonte,
            aviso,
            duracao,
            mimetype: 'audio/mpeg',
            ptt: false
        }
    }

    let duracao = 0
    if (minSegundos || maxSegundos) {
        try {
            const encaixe = await encaixarDuracaoMp3(audio, minSegundos, maxSegundos, {
                forcarMinimo: !!forcarDuracaoMinima
            })
            audio = encaixe.audio
            duracao = encaixe.duracao
            console.log(`TTS duração: ${Math.round(duracao)}s (fonte ${fonte})`)
        } catch (err) {
            console.log(`TTS ajuste de duração - ${err?.message || err}`)
        }
    } else {
        try { duracao = await duracaoAudioSegundos(audio) } catch { /* */ }
    }

    const opus = await converterParaOpus(audio)
    return {
        resultado: opus,
        fonte,
<<<<<<< HEAD
=======
        aviso,
>>>>>>> 67d8f2ac3ba6377e38df26725679b70c87913c80
        duracao,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true
    }
}

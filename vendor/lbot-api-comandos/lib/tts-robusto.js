/**
 * TTS: ElevenLabs → Edge neural (grátis) → OpenAI Rapid (última reserva).
 * Saída preferencial: OGG/Opus para PTT do WhatsApp.
 * Fallback silencioso: erros só no log — nunca expor provedor ao usuário.
 */
import fs from 'fs-extra'
import ffmpeg from 'fluent-ffmpeg'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { obterCaminhoTemporario } from './util.js'
import { elevenKey, textoLongoParaVozEleven } from './elevenlabs.js'
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

async function textoParaVozEdge(texto, idioma = 'pt', { voz, prosodia } = {}) {
    const lang = String(idioma || 'pt').toLowerCase()
    const voice = voz || VOZ_EDGE_PT[lang] || VOZ_EDGE_PT.default
    const pedacos = fatiarTexto(texto, 900)
    const buffers = []
    for (const p of pedacos) {
        if (!p.trim()) continue
        const buf = await edgeTtsChunk(p, voice, prosodia)
        if (buf?.length > 200) buffers.push(buf)
    }
    if (!buffers.length) throw new Error('Edge TTS vazio')
    return buffers.length === 1 ? buffers[0] : await concatenarMp3(buffers)
}

export async function duracaoAudioSegundos(buffer) {
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
 * Ajuste leve de duração.
 * - maxSeg: sempre corta se passar
 * - minSeg: só estica se forcarMinimo=true (conteúdo suficiente)
 */
export async function encaixarDuracaoMp3(buffer, minSeg, maxSeg, { forcarMinimo = false } = {}) {
    const min = Number(minSeg) || 0
    const max = Number(maxSeg) || 0
    if (!min && !max) return { audio: buffer, duracao: 0 }
    let audio = buffer
    let dur = await duracaoAudioSegundos(audio)
    if (!dur) return { audio, duracao: 0 }
    for (let i = 0; i < 2; i++) {
        if (max && dur > max) audio = await aplicarAtempo(audio, dur / (max - 5))
        else if (forcarMinimo && min && dur < min) audio = await aplicarAtempo(audio, dur / (min + 8))
        else break
        dur = await duracaoAudioSegundos(audio)
    }
    return { audio, duracao: dur }
}

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
 * @returns {{ resultado: Buffer, fonte: string, mimetype: string, ptt: true, duracao?: number }}
 */
export async function textoParaVozRobusto(texto, {
    idioma = 'pt',
    maxPalavras = 900,
    vozEdge = OPCOES_TTS_ULTRON.vozEdge,
    prosodiaEdge = OPCOES_TTS_ULTRON.prosodiaEdge,
    minSegundos = 0,
    maxSegundos = 0,
    forcarDuracaoMinima = false
} = {}) {
    let limpo = String(texto || '').replace(/\s+/g, ' ').trim()
    if (!limpo) throw { erro: 'Texto vazio para áudio.' }
    const palavras = limpo.split(/\s+/)
    if (palavras.length > maxPalavras) limpo = palavras.slice(0, maxPalavras).join(' ')

    let audio = null
    let fonte = ''

    if (elevenKey()) {
        try {
            const pedacos = await textoLongoParaVozEleven(limpo, { idioma, chunkSize: 1800 })
            audio = await concatenarMp3(pedacos)
            if (audio?.length > 500) fonte = 'elevenlabs'
            else audio = null
        } catch (err) {
            console.log(`TTS ElevenLabs fallback - ${err?.erro || err?.message || err}`)
            audio = null
        }
    }

    if (!audio) {
        try {
            audio = await textoParaVozEdge(limpo, idioma, { voz: vozEdge, prosodia: prosodiaEdge })
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
                    instructions: 'Speak naturally in Brazilian Portuguese (pt-BR), warm and expressive, not robotic.'
                })
                if (buf?.length > 200) buffers.push(buf)
            }
            if (buffers.length) {
                audio = await concatenarMp3(buffers)
                fonte = 'openai'
            }
        } catch (err) {
            console.log(`TTS OpenAI fallback - ${err?.message || err}`)
        }
    }

    if (!audio || audio.length < 500) {
        throw { erro: 'Falha no TTS (ElevenLabs / Edge / OpenAI). Tente novamente.' }
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
        duracao,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true
    }
}

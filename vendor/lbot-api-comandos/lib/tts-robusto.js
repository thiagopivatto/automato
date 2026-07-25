/**
 * TTS: ElevenLabs → Edge neural (grátis, natural) → OpenAI Rapid.
 * Google TTS removido (voz robótica).
 * Saída preferencial: OGG/Opus para PTT do WhatsApp.
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

async function edgeTtsChunk(texto, voice) {
    const tts = new MsEdgeTTS()
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
    const { audioStream } = await tts.toStream(texto)
    const chunks = []
    for await (const c of audioStream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
    return Buffer.concat(chunks)
}

async function textoParaVozEdge(texto, idioma = 'pt') {
    const lang = String(idioma || 'pt').toLowerCase()
    const voice = VOZ_EDGE_PT[lang] || VOZ_EDGE_PT.default
    const pedacos = fatiarTexto(texto, 900)
    const buffers = []
    for (const p of pedacos) {
        if (!p.trim()) continue
        const buf = await edgeTtsChunk(p, voice)
        if (buf?.length > 200) buffers.push(buf)
    }
    if (!buffers.length) throw new Error('Edge TTS vazio')
    return buffers.length === 1 ? buffers[0] : await concatenarMp3(buffers)
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

/**
 * @returns {{ resultado: Buffer, fonte: string, mimetype: string, ptt: true }}
 */
export async function textoParaVozRobusto(texto, { idioma = 'pt', maxPalavras = 900 } = {}) {
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
            audio = await textoParaVozEdge(limpo, idioma)
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

    const opus = await converterParaOpus(audio)
    return {
        resultado: opus,
        fonte,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true
    }
}

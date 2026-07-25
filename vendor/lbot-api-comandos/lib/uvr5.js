import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs-extra'
import { obterCaminhoTemporario } from './util.js'
import {
    gradioUpload,
    gradioCall,
    baixarArquivoGradio,
    achatarArquivosGradio
} from './gradio.js'

const UVR5_BASE = 'https://qtzmusic-uvr5-ui.hf.space'

/** Corta áudio para acelerar UVR5 (máx. segundos). */
export async function cortarAudioMp3(buffer, maxSegundos = 90) {
    const entrada = obterCaminhoTemporario('mp3')
    const saida = obterCaminhoTemporario('mp3')
    await fs.writeFile(entrada, buffer)
    try {
        await new Promise((resolve, reject) => {
            ffmpeg(entrada)
                .setStartTime(0)
                .duration(maxSegundos)
                .audioCodec('libmp3lame')
                .audioBitrate('128k')
                .format('mp3')
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

/** Concatena vários MP3 em um só (filter_complex — evita bug de path no Windows). */
export async function concatenarMp3(buffers) {
    const validos = (buffers || []).filter((b) => b?.length > 200)
    if (!validos.length) throw new Error('Sem áudios para concatenar')
    if (validos.length === 1) return validos[0]

    const entradas = []
    const saida = obterCaminhoTemporario('mp3')
    try {
        for (const b of validos) {
            const p = obterCaminhoTemporario('mp3')
            await fs.writeFile(p, b)
            entradas.push(p)
        }
        const n = entradas.length
        const labels = entradas.map((_, i) => `[${i}:a]`).join('')
        await new Promise((resolve, reject) => {
            let cmd = ffmpeg()
            for (const p of entradas) cmd = cmd.input(p)
            cmd
                .complexFilter(`${labels}concat=n=${n}:v=0:a=1[outa]`)
                .outputOptions(['-map', '[outa]', '-c:a', 'libmp3lame', '-b:a', '160k', '-y'])
                .save(saida)
                .on('end', resolve)
                .on('error', reject)
        })
        return await fs.readFile(saida)
    } finally {
        for (const p of entradas) {
            try { await fs.unlink(p) } catch {}
        }
        try { await fs.unlink(saida) } catch {}
    }
}

/**
 * Subtrai vocais do original → instrumental.
 * Usa weights negativos + alinhamento de duração (mais estável que volume=-1).
 */
export async function subtrairVocaisDoOriginal(original, vocals) {
    if (!original?.length || !vocals?.length) return null
    const a = obterCaminhoTemporario('mp3')
    const b = obterCaminhoTemporario('mp3')
    const saida = obterCaminhoTemporario('mp3')
    await fs.writeFile(a, original)
    await fs.writeFile(b, vocals)
    try {
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(a)
                .input(b)
                .complexFilter(
                    // resample + mono align + subtract vocals from mix
                    '[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a0];' +
                        '[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=1.05[a1];' +
                        '[a0][a1]amix=inputs=2:weights=1 -1:duration=first:dropout_transition=0:normalize=0,volume=1.8[out]',
                    'out'
                )
                .audioCodec('libmp3lame')
                .audioBitrate('192k')
                .format('mp3')
                .save(saida)
                .on('end', resolve)
                .on('error', reject)
        })
        const buf = await fs.readFile(saida)
        return buf?.length > 500 ? buf : null
    } finally {
        try { await fs.unlink(a) } catch {}
        try { await fs.unlink(b) } catch {}
        try { await fs.unlink(saida) } catch {}
    }
}

export async function misturarStemsMp3(buffers) {
    const validos = (buffers || []).filter((b) => b?.length > 500)
    if (!validos.length) return null
    if (validos.length === 1) return validos[0]

    const entradas = []
    const saida = obterCaminhoTemporario('mp3')
    try {
        for (const b of validos) {
            const p = obterCaminhoTemporario('mp3')
            await fs.writeFile(p, b)
            entradas.push(p)
        }
        await new Promise((resolve, reject) => {
            let cmd = ffmpeg()
            for (const p of entradas) cmd = cmd.input(p)
            const n = entradas.length
            const inputs = entradas.map((_, i) => `[${i}:a]`).join('')
            cmd
                .complexFilter(`${inputs}amix=inputs=${n}:duration=longest:normalize=0,volume=1.2[out]`, 'out')
                .audioCodec('libmp3lame')
                .audioBitrate('160k')
                .format('mp3')
                .save(saida)
                .on('end', resolve)
                .on('error', reject)
        })
        return await fs.readFile(saida)
    } finally {
        for (const p of entradas) {
            try { await fs.unlink(p) } catch {}
        }
        try { await fs.unlink(saida) } catch {}
    }
}

/**
 * Separa stems via UVR5 (Demucs) — áudio cortado p/ velocidade.
 */
export async function separarUvr5(bufferAudio, { model = 'htdemucs.yaml', format = 'mp3', maxSegundos = 75 } = {}) {
    if (!bufferAudio?.length) throw new Error('Áudio vazio')

    let audio = bufferAudio
    try {
        audio = await cortarAudioMp3(bufferAudio, maxSegundos)
    } catch {
        audio = bufferAudio
    }

    const path = await gradioUpload(UVR5_BASE, audio, 'audio.mp3', 'audio/mpeg')
    const resultado = await gradioCall(
        UVR5_BASE,
        'demucs_separator',
        [
            { path, meta: { _type: 'gradio.FileData' } },
            model,
            format,
            0, // shifts=0 → bem mais rápido
            20, // segmentos menores
            true,
            0.25,
            2, // batch
            0.9,
            0.7
        ],
        { timeoutMs: 180000 }
    )

    const arquivos = achatarArquivosGradio(resultado)
    if (!arquivos.length) throw new Error('UVR5 não retornou stems')

    const stems = {}
    await Promise.all(
        arquivos.map(async (arq) => {
            const nome = String(arq.orig_name || arq.path || '').toLowerCase()
            let tipo = 'other'
            if (/vocal/.test(nome)) tipo = 'vocals'
            else if (/bass/.test(nome)) tipo = 'bass'
            else if (/drum/.test(nome)) tipo = 'drums'
            else if (/guitar/.test(nome)) tipo = 'guitar'
            else if (/piano/.test(nome)) tipo = 'piano'
            else if (/other|no[_ ]?vocal|instrument/.test(nome)) tipo = 'other'
            try {
                const buf = await baixarArquivoGradio(UVR5_BASE, arq)
                if (buf?.length > 500) {
                    if (!stems[tipo] || buf.length > stems[tipo].length) stems[tipo] = buf
                }
            } catch {
                /* ignore */
            }
        })
    )

    if (!Object.keys(stems).length) throw new Error('Falha ao baixar stems do UVR5')

    const vocals = stems.vocals || null
    let instrumental =
        (await misturarStemsMp3([stems.bass, stems.drums, stems.other, stems.guitar, stems.piano])) ||
        stems.other ||
        null

    return { vocals, instrumental, stems }
}

import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs-extra'
import {
    gradioUpload,
    gradioCall,
    baixarArquivoGradio,
    achatarArquivosGradio
} from './gradio.js'
import { uploadTemporario } from './rapidapi.js'
import { obterCaminhoTemporario } from './util.js'

const REMBG_BASE = 'https://not-lain-background-removal.hf.space'

export function ehPngComAlpha(buf) {
    if (!buf || buf.length < 33) return false
    if (!(buf[0] === 0x89 && buf[1] === 0x50)) return false
    const colorType = buf[25]
    return colorType === 4 || colorType === 6
}

/**
 * Remove fundo verde/chroma com ffmpeg (sem Jimp/file-type).
 * Usado em emojimix e como fallback do rembg.
 */
export async function removerVerdeFfmpeg(bufferImagem, { agressivo = true } = {}) {
    const entrada = obterCaminhoTemporario('bin')
    const saida = obterCaminhoTemporario('png')
    await fs.writeFile(entrada, bufferImagem)
    const keys = agressivo
        ? [
              'format=rgba',
              'colorkey=0x00FF00:0.32:0.05',
              'colorkey=0x00FE00:0.32:0.05',
              'colorkey=0x00B140:0.3:0.06',
              'colorkey=0x00A651:0.3:0.06',
              'colorkey=0x39FF14:0.32:0.06',
              'colorkey=0x7CFC00:0.28:0.05',
              'colorkey=0xADFF2F:0.26:0.05',
              'colorkey=0x90EE90:0.22:0.04',
              'colorkey=0x32CD32:0.28:0.05',
              'colorkey=0x008000:0.28:0.06',
              'despill=type=green:mix=0.85:expand=0.22'
          ]
        : [
              'format=rgba',
              'colorkey=0x00FF00:0.25:0.08',
              'colorkey=0x00B140:0.22:0.08',
              'despill=type=green:mix=0.6:expand=0.1'
          ]
    try {
        await new Promise((resolve, reject) => {
            ffmpeg(entrada)
                .outputOptions(['-vf', keys.join(','), '-frames:v', '1', '-y'])
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

/** Alias compatível — antes usava Jimp (quebrado pelo override file-type). */
export async function removerVerdeJimp(bufferImagem) {
    return removerVerdeFfmpeg(bufferImagem, { agressivo: true })
}

async function rembgPorArquivo(bufferImagem) {
    const path = await gradioUpload(REMBG_BASE, bufferImagem, 'image.png', 'image/png')
    for (const api of ['png', 'image']) {
        try {
            const resultado = await gradioCall(
                REMBG_BASE,
                api,
                [{ path, meta: { _type: 'gradio.FileData' } }],
                { timeoutMs: 180000 }
            )
            const arquivos = achatarArquivosGradio(resultado)
            if (!arquivos.length) continue
            const preferido =
                arquivos.find((a) => /\.png/i.test(a.orig_name || a.path || '')) || arquivos[0]
            const buf = await baixarArquivoGradio(REMBG_BASE, preferido)
            if (buf?.length > 200) return buf
        } catch (e) {
            console.log(`rembg ${api} - ${e.message}`)
        }
    }
    throw new Error('rembg arquivo falhou')
}

async function rembgPorUrl(bufferImagem) {
    const url = await uploadTemporario(bufferImagem, 'img.png')
    const resultado = await gradioCall(REMBG_BASE, 'text', [url], { timeoutMs: 180000 })
    const arquivos = achatarArquivosGradio(resultado)
    if (!arquivos.length) throw new Error('rembg url sem saída')
    const buf = await baixarArquivoGradio(REMBG_BASE, arquivos[0])
    if (!buf?.length || buf.length < 200) throw new Error('rembg url inválido')
    return buf
}

/** Remove fundo via HF rembg + chromakey (sempre tenta PNG com alpha). */
export async function removerFundoHf(bufferImagem) {
    if (!bufferImagem?.length) throw new Error('Imagem vazia')

    for (const fn of [rembgPorArquivo, rembgPorUrl]) {
        try {
            const buf = await fn(bufferImagem)
            if (buf?.length > 200) {
                if (ehPngComAlpha(buf)) return buf
                try {
                    const limpo = await removerVerdeFfmpeg(buf)
                    if (limpo?.length > 200 && ehPngComAlpha(limpo)) return limpo
                    if (limpo?.length > 200) return limpo
                } catch { /* ignore */ }
                return buf
            }
        } catch (e) {
            console.log(`rembg - ${e.message}`)
        }
    }

    return removerVerdeFfmpeg(bufferImagem, { agressivo: true })
}

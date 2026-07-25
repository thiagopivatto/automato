import { spawn } from 'node:child_process'
import fs from 'fs-extra'
import { obterCaminhoTemporario } from './util.js'
import {
    gradioUpload,
    gradioCall,
    baixarArquivoGradio,
    achatarArquivosGradio
} from './gradio.js'
import { uploadTemporario } from './rapidapi.js'

const REMBG_BASE = 'https://not-lain-background-removal.hf.space'

export function ehPngComAlpha(buf) {
    if (!buf || buf.length < 33) return false
    if (!(buf[0] === 0x89 && buf[1] === 0x50)) return false
    return buf[25] === 4 || buf[25] === 6
}

/** Remove verde/chroma com ffmpeg (emojimix). */
export async function removerVerdeFfmpeg(bufferImagem, { agressivo = true } = {}) {
    const ffmpeg = (await import('fluent-ffmpeg')).default
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
              'despill=type=green:mix=0.85:expand=0.22'
          ]
        : ['format=rgba', 'colorkey=0x00FF00:0.25:0.08', 'despill=type=green:mix=0.6:expand=0.1']
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

/** Converte PNG (com alpha) para JPEG sobre fundo branco. */
export async function pngParaJpeg(bufferPng) {
    const ffmpeg = (await import('fluent-ffmpeg')).default
    const entrada = obterCaminhoTemporario('png')
    const saida = obterCaminhoTemporario('jpg')
    await fs.writeFile(entrada, bufferPng)
    try {
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input('color=c=white:s=1280x1280')
                .inputOptions(['-f', 'lavfi'])
                .input(entrada)
                .complexFilter(
                    '[0][1]scale2ref[bg][img];[bg][img]overlay=(W-w)/2:(H-h)/2,format=yuvj420p[out]',
                    'out'
                )
                .outputOptions(['-frames:v', '1', '-q:v', '2', '-y'])
                .save(saida)
                .on('end', resolve)
                .on('error', reject)
        })
        return await fs.readFile(saida)
    } catch {
        await new Promise((resolve, reject) => {
            ffmpeg(entrada)
                .outputOptions([
                    '-vf',
                    'format=rgba,pad=iw:ih:0:0:white,format=yuvj420p',
                    '-frames:v',
                    '1',
                    '-q:v',
                    '2',
                    '-y'
                ])
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

/**
 * rembg local via Python (confiável; usa GPU se onnxruntime-gpu estiver instalado).
 */
export async function removerFundoPython(bufferImagem) {
    const entrada = obterCaminhoTemporario('bin')
    const saida = obterCaminhoTemporario('png')
    await fs.writeFile(entrada, bufferImagem)
    const py = process.env.PYTHON_PATH?.trim() || (process.platform === 'win32' ? 'py' : 'python3')
    const script = `
from rembg import remove
from pathlib import Path
inp = Path(r'''${entrada.replace(/\\/g, '\\\\')}''')
out = Path(r'''${saida.replace(/\\/g, '\\\\')}''')
data = inp.read_bytes()
result = remove(data)
out.write_bytes(result)
print(len(result))
`
    try {
        await new Promise((resolve, reject) => {
            const child = spawn(py, ['-c', script], { windowsHide: true })
            let stderr = ''
            const timer = setTimeout(() => {
                try { child.kill() } catch {}
                reject(new Error('rembg python timeout'))
            }, 120000)
            child.stderr.on('data', (c) => { stderr += c.toString() })
            child.on('error', (err) => {
                clearTimeout(timer)
                reject(err)
            })
            child.on('close', (code) => {
                clearTimeout(timer)
                if (code === 0) resolve()
                else reject(new Error(stderr.trim().slice(0, 200) || `rembg exit ${code}`))
            })
        })
        const buf = await fs.readFile(saida)
        if (!buf?.length || buf.length < 200) throw new Error('rembg python vazio')
        return buf
    } finally {
        try { await fs.unlink(entrada) } catch {}
        try { await fs.unlink(saida) } catch {}
    }
}

async function rembgPorArquivo(bufferImagem) {
    const path = await gradioUpload(REMBG_BASE, bufferImagem, 'image.png', 'image/png')
    for (const api of ['png', 'image']) {
        try {
            const resultado = await gradioCall(
                REMBG_BASE,
                api,
                [{ path, meta: { _type: 'gradio.FileData' } }],
                { timeoutMs: 120000 }
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
    const resultado = await gradioCall(REMBG_BASE, 'text', [url], { timeoutMs: 120000 })
    const arquivos = achatarArquivosGradio(resultado)
    if (!arquivos.length) throw new Error('rembg url sem saída')
    const buf = await baixarArquivoGradio(REMBG_BASE, arquivos[0])
    if (!buf?.length || buf.length < 200) throw new Error('rembg url inválido')
    return buf
}

/** Remove fundo: Python local → HF → chromakey. */
export async function removerFundoHf(bufferImagem) {
    if (!bufferImagem?.length) throw new Error('Imagem vazia')

    try {
        const local = await removerFundoPython(bufferImagem)
        if (local?.length > 200) return local
    } catch (e) {
        console.log(`rembg python - ${e.message}`)
    }

    for (const fn of [rembgPorArquivo, rembgPorUrl]) {
        try {
            const buf = await fn(bufferImagem)
            if (buf?.length > 200) {
                if (ehPngComAlpha(buf)) return buf
                try {
                    const limpo = await removerVerdeFfmpeg(buf)
                    if (limpo?.length > 200) return limpo
                } catch {}
                return buf
            }
        } catch (e) {
            console.log(`rembg - ${e.message}`)
        }
    }

    return removerVerdeFfmpeg(bufferImagem, { agressivo: true })
}

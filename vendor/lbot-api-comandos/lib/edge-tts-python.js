/**
 * Edge neural TTS via Python edge-tts (v7.3+ com Sec-MS-GEC v2).
 * O pacote JS msedge-tts antigo retorna 403; este caminho é o fallback gratuito natural.
 */
import { spawn } from 'node:child_process'
import fs from 'fs-extra'
import { obterCaminhoTemporario } from './util.js'

const VOZ_POR_IDIOMA = {
    pt: 'pt-BR-AntonioNeural',
    'pt-br': 'pt-BR-AntonioNeural',
    br: 'pt-BR-AntonioNeural',
    en: 'en-US-AndrewNeural',
    es: 'es-ES-AlvaroNeural',
    it: 'it-IT-DiegoNeural',
    fr: 'fr-FR-HenriNeural',
    de: 'de-DE-ConradNeural',
    ja: 'ja-JP-KeitaNeural',
    ko: 'ko-KR-InJoonNeural',
    ru: 'ru-RU-DmitryNeural',
    default: 'pt-BR-AntonioNeural'
}

function resolverPython() {
    return process.env.PYTHON_PATH?.trim() || process.env.PYTHON?.trim() || 'python'
}

let cacheDisponivel = null

export async function edgeTtsPythonDisponivel() {
    if (cacheDisponivel != null) return cacheDisponivel
    cacheDisponivel = await new Promise((resolve) => {
        const py = spawn(resolverPython(), ['-c', 'import edge_tts; print("ok")'], {
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true
        })
        let out = ''
        py.stdout.on('data', (d) => { out += d.toString() })
        py.on('error', () => resolve(false))
        py.on('close', (code) => resolve(code === 0 && out.includes('ok')))
        setTimeout(() => {
            try { py.kill() } catch { /* */ }
            resolve(false)
        }, 8000)
    })
    return cacheDisponivel
}

/**
 * @returns {Promise<Buffer>} MP3
 */
export async function textoParaVozEdgePython(texto, { idioma = 'pt', voz = '', rate = '-4%', pitch = '-1Hz' } = {}) {
    const lang = String(idioma || 'pt').toLowerCase()
    const voice = voz || VOZ_POR_IDIOMA[lang] || VOZ_POR_IDIOMA.default
    const saida = obterCaminhoTemporario('mp3')
    const script = `
import asyncio, edge_tts, sys
texto = sys.argv[1]
voz = sys.argv[2]
saida = sys.argv[3]
rate = sys.argv[4]
pitch = sys.argv[5]
async def main():
    c = edge_tts.Communicate(texto, voz, rate=rate, pitch=pitch)
    await c.save(saida)
asyncio.run(main())
`.trim()

    await new Promise((resolve, reject) => {
        const py = spawn(
            resolverPython(),
            ['-c', script, String(texto), voice, saida, rate, pitch],
            { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }
        )
        let err = ''
        py.stderr.on('data', (d) => { err += d.toString() })
        py.on('error', reject)
        py.on('close', (code) => {
            if (code === 0) resolve()
            else reject(new Error(err.trim() || `edge-tts python exit ${code}`))
        })
        setTimeout(() => {
            try { py.kill() } catch { /* */ }
            reject(new Error('edge-tts python timeout'))
        }, 180000)
    })

    const buf = await fs.readFile(saida)
    try { await fs.unlink(saida) } catch { /* */ }
    if (!buf?.length || buf.length < 200) throw new Error('edge-tts python áudio vazio')
    return buf
}

export async function textoLongoParaVozEdgePython(texto, opts = {}) {
    const limpo = String(texto || '').replace(/\s+/g, ' ').trim()
    if (!limpo) throw new Error('texto vazio')
    // edge-tts aguenta textos longos; ainda assim fatia por segurança (~1800 chars)
    const pedacos = []
    let resto = limpo
    const max = 1800
    while (resto.length) {
        if (resto.length <= max) {
            pedacos.push(resto)
            break
        }
        let corte = resto.lastIndexOf('. ', max)
        if (corte < max * 0.4) corte = resto.lastIndexOf(' ', max)
        if (corte < 40) corte = max
        pedacos.push(resto.slice(0, corte + 1).trim())
        resto = resto.slice(corte + 1).trim()
    }
    const buffers = []
    for (const p of pedacos) {
        if (!p) continue
        buffers.push(await textoParaVozEdgePython(p, opts))
    }
    return buffers
}

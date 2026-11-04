/**
 * Edge neural TTS via Python edge-tts (voz natural gratuita).
 * Prefere o venv do projeto (.venv-tts) — evita PEP 668 no Debian/Ubuntu.
 */
import { spawn } from 'node:child_process'
import fs from 'fs-extra'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { obterCaminhoTemporario } from './util.js'

const VOZ_POR_IDIOMA = {
    //pt: 'pt-BR-AntonioNeural',
    //'pt-br': 'pt-BR-AntonioNeural',
    pt: 'pt-BR-FranciscaNeural',
    'pt-br': 'pt-BR-FranciscaNeural',
    br: 'pt-BR-FranciscaNeural',
    en: 'en-US-AndrewNeural',
    es: 'es-ES-AlvaroNeural',
    it: 'it-IT-DiegoNeural',
    fr: 'fr-FR-HenriNeural',
    de: 'de-DE-ConradNeural',
    ja: 'ja-JP-KeitaNeural',
    ko: 'ko-KR-InJoonNeural',
    ru: 'ru-RU-DmitryNeural',
    default: 'pt-BR-FranciscaNeural'
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** raiz do bot: vendor/lbot-api-comandos/lib → ../../.. */
const raizProjeto = path.resolve(__dirname, '../../..')

function candidatosPython() {
    const venvs = [
        path.join(process.cwd(), '.venv-tts', 'bin', 'python3'),
        path.join(process.cwd(), '.venv-tts', 'bin', 'python'),
        path.join(process.cwd(), '.venv-tts', 'Scripts', 'python.exe'),
        path.join(raizProjeto, '.venv-tts', 'bin', 'python3'),
        path.join(raizProjeto, '.venv-tts', 'bin', 'python'),
        path.join(raizProjeto, '.venv-tts', 'Scripts', 'python.exe')
    ]
    return [
        process.env.PYTHON_PATH?.trim(),
        process.env.PYTHON?.trim(),
        ...venvs,
        'python3',
        'python',
        'py'
    ].filter(Boolean)
}

let cachePy = null

function spawnPy(cmd, args, opts = {}) {
    if (cmd === 'py') {
        return spawn('py', ['-3', ...args], { windowsHide: true, ...opts })
    }
    return spawn(cmd, args, { windowsHide: true, ...opts })
}

async function testarPy(cmd) {
    // Só testa path absoluto se o arquivo existir
    if (path.isAbsolute(cmd) || cmd.includes(`${path.sep}.venv-tts${path.sep}`)) {
        if (!(await fs.pathExists(cmd))) return false
    }
    return new Promise((resolve) => {
        const p = spawnPy(cmd, ['-c', 'import edge_tts; print("ok")'], {
            stdio: ['ignore', 'pipe', 'pipe']
        })
        let out = ''
        p.stdout?.on('data', (d) => { out += d.toString() })
        p.on('error', () => resolve(false))
        p.on('close', (code) => resolve(code === 0 && out.includes('ok')))
        setTimeout(() => {
            try { p.kill() } catch { /* */ }
            resolve(false)
        }, 10000)
    })
}

export async function edgeTtsPythonDisponivel() {
    if (cachePy) return true
    for (const cmd of candidatosPython()) {
        if (await testarPy(cmd)) {
            cachePy = cmd
            console.log(`[tts] Edge Python: ${cmd}`)
            return true
        }
    }
    cachePy = null
    return false
}

export function invalidarCacheEdgePython() {
    cachePy = null
}

/**
 * Gera MP3 via CLI: python -m edge_tts ...
 */
export async function textoParaVozEdgePython(texto, {
    idioma = 'pt',
    voz = '',
    rate = '-4%',
    pitch = '-1Hz'
} = {}) {
    const ok = await edgeTtsPythonDisponivel()
    if (!ok || !cachePy) {
        throw new Error(
            'edge-tts indisponível. No Linux: bash scripts/setup-edge-tts.sh'
        )
    }

    const lang = String(idioma || 'pt').toLowerCase()
    const voice = voz || VOZ_POR_IDIOMA[lang] || VOZ_POR_IDIOMA.default
    const saida = obterCaminhoTemporario('mp3')
    let rateArg = String(rate || '-4%').trim()
    if (!rateArg.startsWith('+') && !rateArg.startsWith('-')) rateArg = `-${rateArg}`
    let pitchArg = String(pitch || '-1Hz').trim()
    if (!pitchArg.includes('Hz')) pitchArg = `${pitchArg}Hz`

    const txtFile = obterCaminhoTemporario('txt')
    await fs.writeFile(txtFile, String(texto || ''), 'utf8')

    try {
        await new Promise((resolve, reject) => {
            const args = [
                '-m', 'edge_tts',
                '-f', txtFile,
                '-v', voice,
                `--rate=${rateArg}`,
                `--pitch=${pitchArg}`,
                '--write-media', saida,
                '--no-progress'
            ]
            const p = spawnPy(cachePy, args, { stdio: ['ignore', 'pipe', 'pipe'] })
            let err = ''
            p.stderr?.on('data', (d) => { err += d.toString() })
            p.on('error', reject)
            p.on('close', (code) => {
                if (code === 0) resolve()
                else reject(new Error((err || `edge-tts exit ${code}`).trim().slice(0, 400)))
            })
            setTimeout(() => {
                try { p.kill() } catch { /* */ }
                reject(new Error('edge-tts timeout'))
            }, 180000)
        })

        const buf = await fs.readFile(saida)
        if (!buf?.length || buf.length < 200) throw new Error('edge-tts áudio vazio')
        return buf
    } finally {
        try { await fs.unlink(saida) } catch { /* */ }
        try { await fs.unlink(txtFile) } catch { /* */ }
    }
}

export async function textoLongoParaVozEdgePython(texto, opts = {}) {
    const limpo = String(texto || '').replace(/\s+/g, ' ').trim()
    if (!limpo) throw new Error('texto vazio')
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

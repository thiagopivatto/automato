import { execSync, spawn } from 'node:child_process'
import fs from 'fs-extra'
import { obterCaminhoTemporario } from './util.js'

let _gpuCache = null
let _torchCudaCache = null

/** Detecta NVIDIA via nvidia-smi (hardware). */
export function detectarGpu() {
    if (_gpuCache !== null) return _gpuCache
    try {
        const out = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader', {
            encoding: 'utf8',
            timeout: 8000,
            windowsHide: true
        }).trim()
        if (out) {
            _gpuCache = { disponivel: true, nome: out.split(/\r?\n/)[0], cuda: true }
            return _gpuCache
        }
    } catch {}
    _gpuCache = { disponivel: false, nome: null, cuda: false }
    return _gpuCache
}

/** Verifica se o PyTorch instalado tem CUDA (pode ter GPU mas torch CPU-only). */
export function torchTemCuda() {
    if (_torchCudaCache !== null) return _torchCudaCache
    const py = process.env.PYTHON_PATH?.trim() || (process.platform === 'win32' ? 'py' : 'python3')
    try {
        const out = execSync(`${py} -c "import torch; print('1' if torch.cuda.is_available() else '0')"`, {
            encoding: 'utf8',
            timeout: 20000,
            windowsHide: true
        }).trim()
        _torchCudaCache = out.includes('1')
    } catch {
        _torchCudaCache = false
    }
    return _torchCudaCache
}

/** Device recomendado para demucs: cuda só se torch tiver CUDA. */
export function deviceDemucs() {
    if (torchTemCuda()) return 'cuda'
    return 'cpu'
}

async function rodarDemucs(py, args, timeoutMs, envExtra = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(py, args, {
            windowsHide: true,
            env: { ...process.env, ...envExtra }
        })
        let stderr = ''
        const timer = setTimeout(() => {
            try { child.kill() } catch {}
            reject(new Error('demucs timeout'))
        }, timeoutMs)
        child.stderr.on('data', (c) => { stderr += c.toString() })
        child.on('error', (err) => {
            clearTimeout(timer)
            reject(err)
        })
        child.on('close', (code) => {
            clearTimeout(timer)
            if (code === 0) resolve()
            else reject(new Error(stderr.trim().slice(-500) || `demucs ${code}`))
        })
    })
}

/**
 * Separação de stems local com demucs.
 * Usa CUDA apenas se torch.cuda.is_available(); senão CPU (evita AssertionError).
 */
export async function separarDemucsLocal(bufferAudio, { maxSegundos = 120 } = {}) {
    let device = deviceDemucs()
    const entrada = obterCaminhoTemporario('mp3')
    const outDir = obterCaminhoTemporario('bin').replace(/\.[^.]+$/, '_demucs')
    await fs.writeFile(entrada, bufferAudio)
    await fs.ensureDir(outDir)

    const py = process.env.PYTHON_PATH?.trim() || (process.platform === 'win32' ? 'py' : 'python3')
    const buildArgs = (dev) => [
        '-m',
        'demucs',
        '-n',
        'htdemucs',
        '-o',
        outDir,
        '--device',
        dev,
        '--mp3',
        '--mp3-bitrate',
        '192',
        entrada
    ]

    console.log(
        `demucs device=${device} gpu_hw=${detectarGpu().disponivel} torch_cuda=${torchTemCuda()}`
    )

    try {
        try {
            await rodarDemucs(
                py,
                buildArgs(device),
                device === 'cuda' ? 240000 : 480000,
                device === 'cpu' ? { CUDA_VISIBLE_DEVICES: '' } : {}
            )
        } catch (err) {
            const msg = String(err?.message || err)
            if (device === 'cuda' || /CUDA|cuda|Torch not compiled/i.test(msg)) {
                console.log(`demucs cuda falhou → retry CPU: ${msg.slice(0, 120)}`)
                _torchCudaCache = false
                device = 'cpu'
                try { await fs.remove(outDir) } catch {}
                await fs.ensureDir(outDir)
                await rodarDemucs(py, buildArgs('cpu'), 480000, { CUDA_VISIBLE_DEVICES: '' })
            } else {
                throw err
            }
        }

        const baseName = entrada.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '')
        const pasta = `${outDir}/htdemucs/${baseName}`
        const stems = {}
        for (const nome of ['vocals', 'bass', 'drums', 'other']) {
            const p = `${pasta}/${nome}.mp3`
            if (await fs.pathExists(p)) stems[nome] = await fs.readFile(p)
        }
        if (!stems.vocals && !stems.other) throw new Error('demucs sem stems')

        let instrumental = stems.other || null
        if (stems.bass || stems.drums || stems.other) {
            const { misturarStemsMp3 } = await import('./uvr5.js')
            instrumental =
                (await misturarStemsMp3([stems.bass, stems.drums, stems.other])) ||
                stems.other ||
                stems.bass ||
                stems.drums
        }

        const usaGpu = device === 'cuda'
        return {
            vocals: stems.vocals || null,
            instrumental,
            stems,
            gpu: usaGpu,
            device
        }
    } finally {
        try { await fs.unlink(entrada) } catch {}
        try { await fs.remove(outDir) } catch {}
    }
}

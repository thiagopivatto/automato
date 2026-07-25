import axios from 'axios'
import FormData from 'form-data'

const TIMEOUT_UPLOAD = 60000
const TIMEOUT_CALL = 30000
const TIMEOUT_RESULT = 300000

/**
 * Cliente HTTP genérico para Gradio Spaces (HF).
 */
export async function gradioUpload(baseUrl, buffer, filename = 'file.bin', contentType = 'application/octet-stream') {
    const base = baseUrl.replace(/\/$/, '')
    const form = new FormData()
    form.append('files', Buffer.from(buffer), { filename, contentType })
    const { data, status } = await axios.post(`${base}/gradio_api/upload`, form, {
        headers: form.getHeaders(),
        timeout: TIMEOUT_UPLOAD,
        maxBodyLength: Infinity,
        validateStatus: () => true
    })
    if (status >= 400) throw new Error(`Gradio upload ${status}`)
    const path = Array.isArray(data) ? data[0] : data?.path || data?.[0]?.path
    if (!path) throw new Error('Gradio upload sem path')
    return path
}

export function gradioFileUrl(baseUrl, filePathOrUrl) {
    if (!filePathOrUrl) return null
    const s = String(filePathOrUrl)
    if (s.startsWith('http')) {
        return s.replace('/gradio_api/gradio_api/file=', '/gradio_api/file=')
    }
    const base = baseUrl.replace(/\/$/, '')
    return `${base}/gradio_api/file=${s}`
}

function parseSseComplete(text) {
    const blocks = String(text || '').split(/\n\n+/)
    let lastComplete = null
    let lastError = null
    for (const block of blocks) {
        const lines = block.split('\n')
        let event = 'message'
        let dataLines = []
        for (const line of lines) {
            if (line.startsWith('event:')) event = line.slice(6).trim()
            else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
        }
        const raw = dataLines.join('\n')
        if (event === 'complete') {
            try {
                lastComplete = JSON.parse(raw)
            } catch {
                lastComplete = raw
            }
        }
        if (event === 'error') {
            try {
                lastError = JSON.parse(raw)
            } catch {
                lastError = raw
            }
        }
    }
    if (lastError) {
        const msg =
            typeof lastError === 'string'
                ? lastError
                : lastError?.message || lastError?.error || JSON.stringify(lastError)
        throw new Error(String(msg).slice(0, 300))
    }
    return lastComplete
}

export async function gradioCall(baseUrl, apiName, data, { timeoutMs = TIMEOUT_RESULT } = {}) {
    const base = baseUrl.replace(/\/$/, '')
    const name = String(apiName).replace(/^\//, '')
    const { data: join, status } = await axios.post(
        `${base}/gradio_api/call/${name}`,
        { data },
        {
            headers: { 'Content-Type': 'application/json' },
            timeout: TIMEOUT_CALL,
            validateStatus: () => true
        }
    )
    if (status >= 400 || !join?.event_id) {
        throw new Error(`Gradio call ${name} falhou (${status}): ${JSON.stringify(join).slice(0, 200)}`)
    }

    const { data: sse, status: st2 } = await axios.get(`${base}/gradio_api/call/${name}/${join.event_id}`, {
        timeout: timeoutMs,
        responseType: 'text',
        validateStatus: () => true,
        // SSE pode demorar
        transitional: { clarifyTimeoutError: true }
    })
    if (st2 >= 400) throw new Error(`Gradio result ${st2}`)
    const complete = parseSseComplete(sse)
    if (complete == null) throw new Error('Gradio sem evento complete')
    return complete
}

export async function baixarArquivoGradio(baseUrl, fileObj) {
    const url =
        (typeof fileObj === 'string' && fileObj.startsWith('http') && fileObj) ||
        gradioFileUrl(baseUrl, fileObj?.url || fileObj?.path || fileObj)
    if (!url) throw new Error('Arquivo Gradio sem URL')
    const { data } = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: TIMEOUT_RESULT,
        maxContentLength: 80 * 1024 * 1024
    })
    return Buffer.from(data)
}

/** Achata resultados Gradio (arrays aninhados / FileData). */
export function achatarArquivosGradio(resultado) {
    const out = []
    const walk = (node) => {
        if (!node) return
        if (Array.isArray(node)) {
            for (const n of node) walk(n)
            return
        }
        if (typeof node === 'object' && (node.path || node.url)) {
            out.push(node)
        }
    }
    walk(resultado)
    return out
}

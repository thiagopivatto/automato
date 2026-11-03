import fs from 'fs-extra'
import path from 'node:path'
import {spawn} from 'node:child_process'
import {obterCaminhoTemporario} from '../lib/util.js'
import {converterMp4ParaMp3} from './videos.js'
import {YouTube} from 'youtube-sr'
import ytdl from '@distube/ytdl-core'
import instagramGetUrl from 'instagram-url-direct'
import {getFbVideoInfo} from 'fb-downloader-scrapper'
import Tiktok from '@tobyg74/tiktok-api-dl'
import {TwitterDL} from 'twitter-downloader'
import axios from 'axios'

const COBALT_INSTANCES = [
    process.env.COBALT_API_URL?.trim(),
    'https://api.cobalt.tools/',
    'https://cobalt.api.timelessnesses.me/',
    'https://co.eepy.today/',
    'https://cobalt-backend.canine.tools/',
    'https://cobalt-api.kwiatekmirek.workers.dev/',
    'https://cobalt-api.kwiatekmiki.com/',
    'https://api.cobalt.best/',
    'https://co.wuk.sh/'
].filter(Boolean)

function cobaltHeaders() {
    const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 UltronBot'
    }
    const key = process.env.COBALT_API_KEY?.trim()
    if (key) {
        headers.Authorization = key.toLowerCase().startsWith('api-key') || key.toLowerCase().startsWith('bearer')
            ? key
            : `Api-Key ${key}`
    }
    return headers
}

const AXIOS_DOWNLOAD_OPTS = {
    responseType: 'arraybuffer',
    timeout: 120000,
    maxRedirects: 10,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
}

function msgErro(err) {
    return err?.erro || err?.message || String(err || '')
}

async function baixarBufferDeUrl(url) {
    const {data} = await axios.get(url, AXIOS_DOWNLOAD_OPTS)
    return Buffer.isBuffer(data) ? data : Buffer.from(data)
}

function normalizarTipoMidia(tipo) {
    if (!tipo) return 'video'
    const t = String(tipo).toLowerCase()
    if (t === 'photo' || t === 'image' || t === 'imagem' || t === 'gif') return 'imagem'
    return 'video'
}

async function cobaltSolicitar(url, {downloadMode = 'auto', audioFormat} = {}) {
    const body = {url, downloadMode}
    if (audioFormat) body.audioFormat = audioFormat

    let lastError
    for (const base of COBALT_INSTANCES) {
        const endpoint = base.endsWith('/') ? base : `${base}/`
        try {
            const {data} = await axios.post(endpoint, body, {
                headers: cobaltHeaders(),
                timeout: 45000,
                validateStatus: (status) => status < 500
            })
            if (!data || data.status === 'error') {
                lastError = data?.error?.code || data?.text || 'cobalt_error'
                continue
            }
            return data
        } catch (err) {
            lastError = err.message
        }
    }
    throw new Error(lastError || 'Nenhuma instância Cobalt respondeu.')
}

function cobaltExtrairUrls(resposta) {
    const status = resposta?.status
    const urls = []
    if (['redirect', 'tunnel', 'stream'].includes(status) && resposta.url) {
        urls.push({url: resposta.url, tipo: normalizarTipoMidia(resposta.type)})
    }
    if (resposta?.tunnel && !urls.length) {
        urls.push({url: resposta.tunnel, tipo: normalizarTipoMidia(resposta.type)})
    }
    if (status === 'picker' && Array.isArray(resposta.picker)) {
        for (const item of resposta.picker) {
            if (item?.url) urls.push({ url: item.url, tipo: normalizarTipoMidia(item.type) })
        }
    }
    if (!urls.length && resposta?.url) {
        urls.push({ url: resposta.url, tipo: normalizarTipoMidia(resposta.type) })
    }
    if (!urls.length) throw new Error('Resposta Cobalt sem URL utilizável.')
    return urls
}

/** Segue redirects curtos (vm.tiktok, t.co, fb.watch). */
async function resolverRedirectUrl(url) {
    const link = String(url || '').trim()
    if (!link || !/^https?:\/\//i.test(link)) return link
    if (!/vm\.tiktok\.com|vt\.tiktok\.com|t\.co\/|fb\.watch|facebook\.com\/share/i.test(link)) {
        return link
    }
    try {
        const { request } = await axios.get(link, {
            timeout: 15000,
            maxRedirects: 5,
            validateStatus: () => true,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        const finalUrl = request?.res?.responseUrl || request?.responseURL
        return finalUrl || link
    } catch {
        return link
    }
}

async function cobaltBaixarBuffer(url, opts) {
    const resposta = await cobaltSolicitar(url, opts)
    const itens = cobaltExtrairUrls(resposta)
    const buffer = await baixarBufferDeUrl(itens[0].url)
    return {buffer, itens, resposta}
}

async function cobaltObterUrls(url, opts) {
    const resposta = await cobaltSolicitar(url, opts)
    return cobaltExtrairUrls(resposta)
}

/** Resolve binário do yt-dlp (PATH ou YTDLP_PATH). */
function obterBinYtDlp() {
    const custom = process.env.YTDLP_PATH?.trim()
    if (custom) return custom
    return process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
}

function runYtDlp(args, {timeoutMs = 180000} = {}) {
    return new Promise((resolve, reject) => {
        const bin = obterBinYtDlp()
        // YouTube exige JS runtime (node) para resolver challenges e listar formatos
        const finalArgs = ['--js-runtimes', 'node', ...args]
        const child = spawn(bin, finalArgs, {windowsHide: true})
        let stdout = Buffer.alloc(0)
        let stderr = ''
        const timer = setTimeout(() => {
            try { child.kill() } catch {}
            reject(new Error('yt-dlp timeout'))
        }, timeoutMs)

        child.stdout.on('data', (chunk) => {
            stdout = Buffer.concat([stdout, chunk])
        })
        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString()
        })
        child.on('error', (err) => {
            clearTimeout(timer)
            if (err.code === 'ENOENT') {
                reject(new Error('yt-dlp não encontrado. Instale o yt-dlp e/ou defina YTDLP_PATH no .env'))
            } else {
                reject(err)
            }
        })
        child.on('close', (code) => {
            clearTimeout(timer)
            if (code === 0) resolve({stdout, stderr})
            else reject(new Error(stderr.trim() || `yt-dlp saiu com código ${code}`))
        })
    })
}

let _ytDlpOk = null
let _ytDlpCheckedAt = 0
const YTDLP_CACHE_TTL_MS = 60_000

async function ytDlpDisponivel() {
    const agora = Date.now()
    // Cache positivo permanente; negativo só por 60s (binário pode ser instalado depois)
    if (_ytDlpOk === true) return true
    if (_ytDlpOk === false && agora - _ytDlpCheckedAt < YTDLP_CACHE_TTL_MS) return false
    try {
        await runYtDlp(['--version'], {timeoutMs: 15000})
        _ytDlpOk = true
    } catch {
        _ytDlpOk = false
        _ytDlpCheckedAt = agora
    }
    return _ytDlpOk
}

async function buscarVideoIdYtDlp(query) {
    const { stdout } = await runYtDlp(
        ['--no-playlist', '--no-warnings', '--print', '%(id)s', `ytsearch1:${String(query).trim()}`],
        { timeoutMs: 45000 }
    )
    const id = stdout.toString('utf8').trim().split(/\r?\n/).find(Boolean)
    return id && /^[\w-]{6,}$/.test(id) ? id : null
}

/** Extrai a primeira URL http(s) de um texto (cola suja / com legenda). */
export function extrairUrlDeTexto(texto) {
    const bruto = String(texto || '').trim()
    if (!bruto) return ''
    const m = bruto.match(/https?:\/\/[^\s<>"']+/i)
    if (!m) return ''
    return m[0].replace(/[),.;!?]+$/g, '')
}

async function obterVideoIdYT(texto) {
    const bruto = String(texto || '').trim()
    if (!bruto) return null
    const urlEmbed = extrairUrlDeTexto(bruto)
    const candidato = urlEmbed || bruto

    if (ytdl.validateURL(candidato)) {
        try { return ytdl.getVideoID(candidato) } catch { /* */ }
    }
    const m = candidato.match(/(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([\w-]{6,})/i)
    if (m?.[1]) return m[1]

    // Se parece URL de outro site, não busca como query
    if (/^https?:\/\//i.test(candidato) && !/youtu(\.be|be\.com)/i.test(candidato)) {
        return null
    }

    const query = urlEmbed && /youtu(\.be|be\.com)/i.test(urlEmbed) ? urlEmbed : bruto

    if (await ytDlpDisponivel()) {
        try {
            const id = await buscarVideoIdYtDlp(query)
            if (id) return id
        } catch (err) {
            console.log(`API obterVideoIdYT yt-dlp search - ${msgErro(err)}`)
        }
    }

    try {
        const pesquisa = await YouTube.searchOne(query)
        if (pesquisa?.id) return pesquisa.id
    } catch (err) {
        console.log(`API obterVideoIdYT youtube-sr - ${msgErro(err)}`)
    }
    return null
}

function urlYoutube(texto, videoId) {
    const url = extrairUrlDeTexto(texto) || String(texto || '').trim()
    if (ytdl.validateURL(url)) return url
    return `https://www.youtube.com/watch?v=${videoId}`
}

function formatarDuracaoYT(lengthSeconds) {
    const minutos = Math.floor(lengthSeconds / 60).toString().padStart(2, '0')
    const segundos = (lengthSeconds % 60).toString().padStart(2, '0')
    return `${minutos}:${segundos}`
}

function mensagemErroYoutube(err) {
    const msg = msgErro(err)
    if (/yt-dlp não encontrado/i.test(msg)) {
        return 'yt-dlp não está instalado. Instale com "winget install yt-dlp" ou defina YTDLP_PATH no .env.'
    }
    if (msg.includes('410') || /age|login|confirm your age|Sign in/i.test(msg)) {
        return 'Este vídeo tem restrição de idade ou exige login para ser assistido.'
    }
    if (/private|unavailable|not available/i.test(msg)) {
        return 'Este vídeo está privado ou indisponível no momento.'
    }
    if (/copyright|blocked/i.test(msg)) {
        return 'Este vídeo está bloqueado ou com restrição de direitos autorais.'
    }
    if (/No video|não foi encontrado|not found/i.test(msg)) {
        return 'Não foi encontrado um vídeo para esta pesquisa.'
    }
    return null
}

async function obterInfoOEmbed(videoId) {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
    const {data} = await axios.get('https://www.youtube.com/oembed', {
        params: {url: watchUrl, format: 'json'},
        timeout: 15000
    })
    return {
        title: data.title || 'Vídeo do YouTube',
        lengthSeconds: 0,
        durationFormatted: '00:00',
        isLiveContent: false
    }
}

async function obterInfoYtDlp(watchUrl) {
    const {stdout} = await runYtDlp([
        '--no-playlist',
        '-j',
        '--no-warnings',
        ...argsCookiesYtDlp({ permitirBrowser: false }),
        watchUrl
    ], {timeoutMs: 60000})
    const info = JSON.parse(stdout.toString('utf8').trim().split('\n')[0])
    const lengthSeconds = Number(info.duration || 0)
    return {
        title: info.title || 'Vídeo do YouTube',
        lengthSeconds,
        durationFormatted: formatarDuracaoYT(lengthSeconds),
        isLiveContent: !!info.is_live
    }
}

/**
 * Cookies:
 * - arquivo (YTDLP_COOKIES) é seguro
 * - browser cookies quebram no Windows se o Chrome estiver aberto → só sob demanda (Instagram)
 */
function argsCookiesYtDlp({ permitirBrowser = false } = {}) {
    const args = []
    const cookiesFile = process.env.YTDLP_COOKIES?.trim() || process.env.INSTAGRAM_COOKIES?.trim()
    if (cookiesFile && fs.existsSync(cookiesFile)) {
        args.push('--cookies', cookiesFile)
        return args
    }
    if (permitirBrowser) {
        const browser = process.env.YTDLP_BROWSER_COOKIES?.trim()
        if (browser) args.push('--cookies-from-browser', browser)
    }
    return args
}

function ehErroCookies(err) {
    return /cookie database|Could not copy|Failed to decrypt|browser cookies/i.test(msgErro(err))
}

const FORMATOS_VIDEO = [
    'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[ext=mp4]/best[height<=720]/best',
    'best[height<=720]/best',
    'best'
]
const FORMATOS_AUDIO = [
    'bestaudio[ext=m4a]/140/bestaudio/best',
    'bestaudio/best'
]

async function baixarComYtDlp(watchUrl, { audioOnly = false, permitirBrowser = false } = {}) {
    const ext = audioOnly ? 'mp3' : 'mp4'
    // null = sem extractor-args (melhor com --js-runtimes node)
    const clientes = [null, 'youtube:player_client=web', 'youtube:player_client=android,web']
    const formatos = audioOnly ? FORMATOS_AUDIO : FORMATOS_VIDEO
    let ultimoErro = null
    // YouTube: NÃO usa cookies do browser (falha comum no Windows). Só arquivo, se existir.
    const modosCookie = [false]
    if (permitirBrowser) modosCookie.push(true)

    for (const usarBrowser of modosCookie) {
        for (const extractorArgs of clientes) {
            for (const formato of formatos) {
                const saida = obterCaminhoTemporario(ext)
                const template = saida.replace(new RegExp(`\\.${ext}$`), '')
                try {
                    return await baixarComYtDlpUmaVez(watchUrl, {
                        audioOnly,
                        template,
                        ext,
                        extractorArgs,
                        formato,
                        cookiesArgs: argsCookiesYtDlp({ permitirBrowser: usarBrowser })
                    })
                } catch (err) {
                    ultimoErro = err
                    console.log(
                        `yt-dlp falhou (${extractorArgs || 'default'}, fmt=${formato.slice(0, 40)}, browserCookie=${usarBrowser}) - ${msgErro(err)}`
                    )
                    if (ehErroCookies(err) && usarBrowser) break
                }
            }
            if (ehErroCookies(ultimoErro) && usarBrowser) break
        }
    }
    throw ultimoErro || new Error('yt-dlp falhou')
}

async function baixarComYtDlpUmaVez(watchUrl, { audioOnly, template, ext, extractorArgs, formato, cookiesArgs = [] }) {
    const args = [
        '--no-playlist',
        '--no-warnings',
        '-o', `${template}.%(ext)s`,
        '--retries', '5',
        '--fragment-retries', '5',
        '--force-ipv4',
        ...cookiesArgs
    ]
    if (extractorArgs) args.push('--extractor-args', extractorArgs)
    if (audioOnly) {
        args.push('-f', formato || FORMATOS_AUDIO[0], '-x', '--audio-format', 'mp3', '--audio-quality', '0')
    } else {
        args.push('-f', formato || FORMATOS_VIDEO[0], '--merge-output-format', 'mp4')
    }
    args.push(watchUrl)

    try {
        await runYtDlp(args, {timeoutMs: 300000})
        const candidato = `${template}.${ext}`
        if (await fs.pathExists(candidato)) {
            const buffer = await fs.readFile(candidato)
            await fs.unlink(candidato).catch(() => {})
            return buffer
        }
        const pasta = path.dirname(template)
        const nomeBase = path.basename(template)
        const arquivos = await fs.readdir(pasta)
        const achado = arquivos.find((f) => f.startsWith(nomeBase + '.'))
        if (!achado) throw new Error('Arquivo baixado pelo yt-dlp não encontrado')
        const caminho = path.join(pasta, achado)
        const buffer = await fs.readFile(caminho)
        await fs.unlink(caminho).catch(() => {})
        // se pediu mp3 mas veio m4a/webm, converte
        if (audioOnly && !caminho.endsWith('.mp3')) {
            return (await converterMp4ParaMp3(buffer)).resultado
        }
        return buffer
    } catch (err) {
        try { await fs.unlink(`${template}.${ext}`) } catch {}
        throw err
    }
}

async function baixarMidiaTwitterScraper(url) {
    const res = await TwitterDL(url)
    if (res.status != 'success') {
        throw {erro: 'Houve um erro ao baixar essa mídia, provavelmente é um conteúdo sensivel.'}
    }

    const midias = []
    for (const midia of res.result.media || []) {
        if (midia.type == 'video') {
            midias.push({
                tipo: 'video',
                url: midia.videos.length > 1 ? midia.videos[1].url : midia.videos[0].url
            })
        } else if (midia.type == 'photo') {
            midias.push({
                tipo: 'imagem',
                url: midia.image
            })
        }
    }

    return {
        texto: res.result.description,
        midias
    }
}

async function baixarMidiaTiktokScraper(url) {
    const resultado = await Tiktok.Downloader(url, {version: 'v2'})
    if (resultado.status != 'success') {
        throw {erro: 'Não foi encontrado resultado para este link, verifique o link.'}
    }

    let midiaUrl = resultado.result?.video || resultado.result?.images?.[0]
    if (Array.isArray(midiaUrl)) midiaUrl = midiaUrl[0]

    return {
        autor_perfil: resultado.result?.author?.nickname,
        descricao: resultado.result?.desc,
        url: midiaUrl
    }
}

async function baixarMidiaFacebookScraper(url) {
    const res = await getFbVideoInfo(url)
    const resultado = {...res}
    if (resultado.duration != null && resultado.duration_ms == null) {
        const dur = Number(resultado.duration)
        resultado.duration_ms = dur < 1000 ? Math.round(dur * 1000) : Math.round(dur)
    }
    return resultado
}

async function baixarMidiaInstagramScraper(url) {
    const res = await instagramGetUrl(url)
    if (!res?.url_list?.length) {
        throw {erro: 'Mídia não encontrada, verifique o link.'}
    }

    const midias = []
    for (const link of res.url_list) {
        const {data, headers} = await axios.get(link, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {'User-Agent': 'Mozilla/5.0'}
        })
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data)
        const contentType = headers['content-type'] || ''
        midias.push({
            tipo: contentType.includes('video') ? 'video' : 'imagem',
            buffer
        })
    }
    return midias
}

export const obterMidiaTwitter = async (url) => {
    try {
        let link = extrairUrlDeTexto(url) || String(url || '').trim()
        if (!link) throw { erro: 'Envie um link do Twitter/X.' }
        link = await resolverRedirectUrl(link)

        if (await ytDlpDisponivel()) {
            try {
                const outTpl = obterCaminhoTemporario('mp4').replace(/\.mp4$/i, '.%(ext)s')
                const tmpBase = outTpl.replace('.%(ext)s', '')
                await runYtDlp(
                    [
                        '-f', 'bestvideo[height<=720]+bestaudio/best[ext=mp4]/best',
                        '--merge-output-format', 'mp4',
                        '--no-playlist', '--no-warnings', '-o', outTpl,
                        ...argsCookiesYtDlp({ permitirBrowser: false }),
                        link
                    ],
                    { timeoutMs: 120000 }
                )
                const dir = path.dirname(tmpBase)
                const baseName = path.basename(tmpBase)
                const arquivos = (await fs.readdir(dir)).filter((f) => f.startsWith(baseName))
                const midias = []
                for (const arq of arquivos) {
                    const full = path.join(dir, arq)
                    const buffer = await fs.readFile(full)
                    try { await fs.unlink(full) } catch {}
                    if (buffer?.length > 1000) {
                        midias.push({
                            tipo: /\.(jpe?g|png|webp)$/i.test(arq) ? 'imagem' : 'video',
                            buffer,
                            url: null
                        })
                    }
                }
                if (midias.length) return { resultado: { texto: '', midias } }
            } catch (e) {
                console.log(`API obterMidiaTwitter yt-dlp - ${msgErro(e)}`)
            }
        }

        try {
            const resposta = await cobaltSolicitar(link, {downloadMode: 'auto'})
            const itens = cobaltExtrairUrls(resposta)
            if (itens.length) {
                const midias = []
                for (const item of itens) {
                    try {
                        const buffer = await baixarBufferDeUrl(item.url)
                        midias.push({ tipo: item.tipo, url: item.url, buffer })
                    } catch {
                        midias.push({ tipo: item.tipo, url: item.url })
                    }
                }
                return {
                    resultado: {
                        texto: resposta.text || resposta.description || '',
                        midias
                    }
                }
            }
        } catch {}

        const resultado = await baixarMidiaTwitterScraper(link)
        return {resultado}
    } catch (err) {
        console.log(`API obterMidiaTwitter - ${msgErro(err)}`)
        if (err?.erro) throw err
        throw {erro: 'Houve um erro no servidor de obter mídias do Twitter/X'}
    }
}

export const obterMidiaTiktok = async (url) => {
    try {
        let link = extrairUrlDeTexto(url) || String(url || '').trim()
        link = await resolverRedirectUrl(link)
        if (!/tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com/i.test(link)) {
            throw { erro: 'Envie um link válido do TikTok.' }
        }

        // 1) yt-dlp → buffer (mais confiável)
        if (await ytDlpDisponivel()) {
            try {
                const outTpl = obterCaminhoTemporario('mp4').replace(/\.mp4$/i, '.%(ext)s')
                const tmpBase = outTpl.replace('.%(ext)s', '')
                await runYtDlp(
                    [
                        '-f',
                        'best[ext=mp4]/best',
                        '--no-playlist',
                        '--no-warnings',
                        '-o',
                        outTpl,
                        link
                    ],
                    { timeoutMs: 120000 }
                )
                const dir = path.dirname(tmpBase)
                const baseName = path.basename(tmpBase)
                const arquivos = (await fs.readdir(dir)).filter((f) => f.startsWith(baseName))
                for (const arq of arquivos) {
                    const full = path.join(dir, arq)
                    const buffer = await fs.readFile(full)
                    try { await fs.unlink(full) } catch {}
                    if (buffer?.length > 1000) {
                        return {
                            resultado: {
                                autor_perfil: '',
                                descricao: '',
                                url: null,
                                buffer,
                                tipo: /\.(jpe?g|png|webp)$/i.test(arq) ? 'imagem' : 'video'
                            }
                        }
                    }
                }
            } catch (e) {
                console.log(`API obterMidiaTiktok yt-dlp - ${msgErro(e)}`)
            }
        }

        // 2) Cobalt → baixa buffer
        for (const mode of ['auto', 'video']) {
            try {
                const itens = await cobaltObterUrls(link, { downloadMode: mode })
                const video = itens.find((item) => item.tipo === 'video') || itens[0]
                if (video?.url) {
                    const buffer = await baixarBufferDeUrl(video.url)
                    if (buffer?.length > 1000) {
                        return {
                            resultado: {
                                autor_perfil: '',
                                descricao: '',
                                url: video.url,
                                buffer,
                                tipo: video.tipo || 'video'
                            }
                        }
                    }
                }
            } catch {}
        }

        // 3) scraper
        const resultado = await baixarMidiaTiktokScraper(link)
        if (resultado?.url) {
            try {
                const buffer = await baixarBufferDeUrl(resultado.url)
                if (buffer?.length > 1000) resultado.buffer = buffer
            } catch {}
        }
        return { resultado }
    } catch (err) {
        console.log(`API obterMidiaTiktok - ${msgErro(err)}`)
        if (err?.erro) throw err
        throw { erro: 'Houve um erro no servidor de download do TikTok. Verifique o link.' }
    }
}

export const obterMidiaFacebook = async (url) => {
    try {
        let link = extrairUrlDeTexto(url) || String(url || '').trim()
        if (!link) throw { erro: 'Envie um link do Facebook.' }
        link = await resolverRedirectUrl(link)

        if (await ytDlpDisponivel()) {
            try {
                const buffer = await baixarComYtDlp(link, { audioOnly: false })
                if (buffer?.length > 1000) {
                    return {
                        resultado: {
                            title: 'Vídeo do Facebook',
                            duration_ms: 0,
                            sd: null,
                            buffer
                        }
                    }
                }
            } catch (e) {
                console.log(`API obterMidiaFacebook yt-dlp - ${msgErro(e)}`)
            }
        }

        for (const mode of ['auto', 'video']) {
            try {
                const { buffer, itens } = await cobaltBaixarBuffer(link, { downloadMode: mode })
                if (buffer?.length > 1000) {
                    return {
                        resultado: {
                            title: 'Vídeo do Facebook',
                            duration_ms: 0,
                            sd: itens?.[0]?.url || null,
                            buffer
                        }
                    }
                }
            } catch {}
        }

        const resultado = await baixarMidiaFacebookScraper(link)
        return { resultado }
    } catch (err) {
        console.log(`API obterMidiaFacebook - ${msgErro(err)}`)
        if (err?.erro) throw err
        throw {erro: 'Erro ao obter o vídeo do Facebook. Verifique o link ou tente mais tarde.'}
    }
}

export const obterMidiaInstagram = async (url) => {
    try {
        const { baixarInstagram } = await import('../lib/instagram.js')
        const midias = await baixarInstagram(url)
        return { resultado: midias }
    } catch (err) {
        console.log(`API obterMidiaInstagram - ${err?.erro || err?.message || err}`)
        if (err?.erro) throw err
        throw { erro: 'Erro ao obter a mídia do Instagram. Verifique o link (público) ou configure cookies no .env.' }
    }
}

export const obterInfoVideoYT = async (texto) => {
    try {
        const videoId = await obterVideoIdYT(texto)
        if (!videoId) throw {erro: 'Não foi encontrado um vídeo para esta pesquisa.'}
        const watchUrl = urlYoutube(texto, videoId)

        if (await ytDlpDisponivel()) {
            try {
                return {resultado: await obterInfoYtDlp(watchUrl)}
            } catch (err) {
                console.log(`API obterInfoVideoYT yt-dlp - ${msgErro(err)}`)
            }
        }

        try {
            return {resultado: await obterInfoOEmbed(videoId)}
        } catch {
            // youtube-sr fallback
            const pesquisa = await YouTube.searchOne(texto)
            if (pesquisa) {
                const lengthSeconds = Math.floor((pesquisa.duration || 0) / 1000)
                return {
                    resultado: {
                        title: pesquisa.title || 'Vídeo do YouTube',
                        lengthSeconds,
                        durationFormatted: formatarDuracaoYT(lengthSeconds),
                        isLiveContent: !!pesquisa.live
                    }
                }
            }
            throw {erro: 'Não foi possível obter informações do vídeo.'}
        }
    } catch (err) {
        console.log(`API obterInfoVideoYT - ${msgErro(err)}`)
        if (err?.erro) throw err
        throw {erro: mensagemErroYoutube(err) || 'Houve um erro ao obter as informações do vídeo do YouTube.'}
    }
}

export const obterYTMP4 = async (texto) => {
    try {
        const videoId = await obterVideoIdYT(texto)
        if (!videoId) throw {erro: 'Não foi encontrado um vídeo para esta pesquisa.'}
        const watchUrl = urlYoutube(texto, videoId)

        if (await ytDlpDisponivel()) {
            try {
                const buffer = await baixarComYtDlp(watchUrl, {audioOnly: false})
                if (buffer?.length) return {resultado: buffer}
            } catch (err) {
                console.log(`API obterYTMP4 yt-dlp - ${msgErro(err)}`)
            }
        }

        let ultimoCobalt = null
        for (const mode of ['auto', 'video']) {
            try {
                const {buffer} = await cobaltBaixarBuffer(watchUrl, {downloadMode: mode})
                if (buffer?.length) return {resultado: buffer}
            } catch (e) {
                ultimoCobalt = e
            }
        }

        throw {
            erro:
                mensagemErroYoutube(ultimoCobalt) ||
                msgErro(ultimoCobalt) ||
                'Erro ao obter o vídeo do YouTube. Confira o link e se o yt-dlp está instalado.'
        }
    } catch (err) {
        console.log(`API obterYTMP4 - ${msgErro(err)}`)
        if (err?.erro) throw err
        throw {erro: mensagemErroYoutube(err) || 'Erro no servidor ao obter o vídeo do YouTube.'}
    }
}

export const obterYTMP3 = async (texto) => {
    try {
        const videoId = await obterVideoIdYT(texto)
        if (!videoId) throw {erro: 'Não foi encontrado um vídeo para esta pesquisa.'}
        const watchUrl = urlYoutube(texto, videoId)

        if (await ytDlpDisponivel()) {
            try {
                const buffer = await baixarComYtDlp(watchUrl, {audioOnly: true})
                if (buffer?.length) return {resultado: buffer}
            } catch (err) {
                console.log(`API obterYTMP3 yt-dlp - ${msgErro(err)}`)
            }
        }

        try {
            const {buffer} = await cobaltBaixarBuffer(watchUrl, {
                downloadMode: 'audio',
                audioFormat: 'mp3'
            })
            if (buffer?.length) return {resultado: buffer}
        } catch {}

        const {resultado} = await obterYTMP4(texto)
        const bufferAudio = (await converterMp4ParaMp3(resultado)).resultado
        return {resultado: bufferAudio}
    } catch (err) {
        console.log(`API obterYTMP3 - ${msgErro(err)}`)
        if (err?.erro) throw err
        throw {erro: mensagemErroYoutube(err) || 'Erro ao converter/baixar o áudio (MP3) do YouTube.'}
    }
}

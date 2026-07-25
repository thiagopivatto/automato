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
    'https://co.eepy.today/',
    'https://cobalt-api.kwiatekmirek.workers.dev/',
    'https://api.cobalt.tools/'
]

const COBALT_HEADERS = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
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
                headers: COBALT_HEADERS,
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
    if (['redirect', 'tunnel', 'stream'].includes(status) && resposta.url) {
        return [{url: resposta.url, tipo: normalizarTipoMidia(resposta.type)}]
    }
    if (status === 'picker' && Array.isArray(resposta.picker)) {
        return resposta.picker
            .filter((item) => item?.url)
            .map((item) => ({
                url: item.url,
                tipo: normalizarTipoMidia(item.type)
            }))
    }
    throw new Error('Resposta Cobalt sem URL utilizável.')
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
        const child = spawn(bin, args, {windowsHide: true})
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
async function ytDlpDisponivel() {
    if (_ytDlpOk !== null) return _ytDlpOk
    try {
        await runYtDlp(['--version'], {timeoutMs: 15000})
        _ytDlpOk = true
    } catch {
        _ytDlpOk = false
    }
    return _ytDlpOk
}

const YT_EXTRACTOR_ARGS = 'youtube:player_client=android,web'

async function obterVideoIdYT(texto) {
    if (ytdl.validateURL(texto)) return ytdl.getVideoID(texto)
    const pesquisa = await YouTube.searchOne(texto)
    if (!pesquisa?.id) return null
    return pesquisa.id
}

function urlYoutube(texto, videoId) {
    if (ytdl.validateURL(texto)) return texto
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
        '--extractor-args', YT_EXTRACTOR_ARGS,
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

async function baixarComYtDlp(watchUrl, {audioOnly = false} = {}) {
    const ext = audioOnly ? 'mp3' : 'mp4'
    const saida = obterCaminhoTemporario(ext)
    const template = saida.replace(new RegExp(`\\.${ext}$`), '')
    const args = [
        '--no-playlist',
        '--no-warnings',
        '--extractor-args', YT_EXTRACTOR_ARGS,
        '-o', `${template}.%(ext)s`,
        '--retries', '3'
    ]
    if (audioOnly) {
        // android costuma expor format 18 (mp4 a+v) — extrai áudio depois se preciso
        args.push('-f', 'bestaudio/18/b', '-x', '--audio-format', 'mp3', '--audio-quality', '0')
    } else {
        args.push('-f', '18/b/bv*+ba', '--merge-output-format', 'mp4')
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
        try {
            const resposta = await cobaltSolicitar(url, {downloadMode: 'auto'})
            const itens = cobaltExtrairUrls(resposta)
            if (itens.length) {
                return {
                    resultado: {
                        texto: resposta.text || resposta.description || '',
                        midias: itens.map((item) => ({
                            tipo: item.tipo,
                            url: item.url
                        }))
                    }
                }
            }
        } catch {}

        const resultado = await baixarMidiaTwitterScraper(url)
        return {resultado}
    } catch (err) {
        console.log(`API obterMidiaTwitter - ${msgErro(err)}`)
        if (err?.erro) throw err
        throw {erro: 'Houve um erro no servidor de obter mídias do Twitter/X'}
    }
}

export const obterMidiaTiktok = async (url) => {
    try {
        const link = String(url || '').trim()
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
        for (const mode of ['auto', 'video']) {
            try {
                const itens = await cobaltObterUrls(url, {downloadMode: mode})
                const video = itens.find((item) => item.tipo === 'video') || itens[0]
                if (video?.url) {
                    return {
                        resultado: {
                            title: 'Vídeo do Facebook',
                            duration_ms: 0,
                            sd: video.url,
                            hd: itens.length > 1 ? itens[1].url : undefined
                        }
                    }
                }
            } catch {}
        }

        const resultado = await baixarMidiaFacebookScraper(url)
        return {resultado}
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

        for (const mode of ['auto', 'video']) {
            try {
                const {buffer} = await cobaltBaixarBuffer(watchUrl, {downloadMode: mode})
                if (buffer?.length) return {resultado: buffer}
            } catch {}
        }

        throw {erro: mensagemErroYoutube('yt-dlp') || 'Erro no servidor ao obter o vídeo do YouTube. Instale o yt-dlp.'}
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

import fs from 'fs-extra'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { obterCaminhoTemporario } from '../lib/util.js'
import axios from 'axios'
import instagramGetUrl from 'instagram-url-direct'

/**
 * Extrai shortcode de URL do Instagram.
 */
function extrairShortcode(url) {
    const m = String(url).match(/\/(p|reel|reels|tv|stories)\/([^/?#]+)/i)
    return m?.[2] || null
}

function normalizarLinkIg(url) {
    let link = String(url || '').trim()
    link = link
        .replace(/^http:\/\//i, 'https://')
        .replace(/instagram\.com\/reels\//i, 'instagram.com/reel/')
        .replace(/\/\/(www\.)?instagram\.com/i, '//www.instagram.com')
    // remove query/hash mas mantém path
    try {
        const u = new URL(link)
        link = `${u.origin}${u.pathname}`.replace(/\/+$/, '') + '/'
    } catch {
        link = link.replace(/\?.*$/, '').replace(/\/+$/, '') + '/'
    }
    return link
}

async function baixarBuffer(url) {
    const { data } = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 120000,
        maxRedirects: 10,
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: '*/*',
            Referer: 'https://www.instagram.com/'
        },
        maxContentLength: 80 * 1024 * 1024
    })
    return Buffer.isBuffer(data) ? data : Buffer.from(data)
}

function tipoDeUrl(u) {
    return /\.mp4(\?|$)/i.test(u) || /video/i.test(u) ? 'video' : 'imagem'
}

function coletarUrlsDeTexto(texto) {
    const urls = new Set()
    const blob = String(texto || '')
    const patterns = [
        /https?:\\\/\\\/[^"'\\\s]+/g,
        /https?:\/\/[^"'\\\s<>]+/g,
        /"(https?:[^"]+cdninstagram[^"]+)"/gi,
        /"(https?:[^"]+fbcdn[^"]+)"/gi,
        /"(https?:[^"]+scontent[^"]+)"/gi
    ]
    for (const re of patterns) {
        let m
        while ((m = re.exec(blob))) {
            let u = (m[1] || m[0])
                .replace(/\\\//g, '/')
                .replace(/\\u0026/g, '&')
                .replace(/&amp;/g, '&')
                .replace(/\\"/g, '')
            if (u.startsWith('http') && /(cdninstagram|fbcdn|scontent|instagram)/i.test(u)) {
                urls.add(u)
            }
        }
    }
    return [...urls]
}

async function viaYtDlp(link) {
    const cookies =
        process.env.YTDLP_COOKIES?.trim() ||
        process.env.INSTAGRAM_COOKIES?.trim() ||
        ''
    const bin = process.env.YTDLP_PATH?.trim() || (process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp')
    const outTpl = obterCaminhoTemporario('mp4').replace(/\.mp4$/i, '.%(ext)s')
    const tmpBase = outTpl.replace('.%(ext)s', '')

    const args = [
        '-f', 'best[ext=mp4]/best',
        '--no-playlist',
        '--no-warnings',
        '--retries', '3',
        '--socket-timeout', '30',
        '--extractor-args', 'instagram:app_id=936619743392459',
        '-o', outTpl
    ]
    if (cookies && fs.existsSync(cookies)) {
        args.push('--cookies', cookies)
    } else if (process.env.YTDLP_BROWSER_COOKIES?.trim()) {
        args.push('--cookies-from-browser', process.env.YTDLP_BROWSER_COOKIES.trim())
    } else {
        // tenta Chrome logado (Windows) — ignora erro se falhar
        args.push('--cookies-from-browser', 'chrome')
    }
    args.push(link)

    await new Promise((resolve, reject) => {
        const child = spawn(bin, args, { windowsHide: true })
        let stderr = ''
        const timer = setTimeout(() => {
            try { child.kill() } catch {}
            reject(new Error('yt-dlp timeout'))
        }, 120000)
        child.stderr.on('data', (c) => { stderr += c.toString() })
        child.on('error', (err) => {
            clearTimeout(timer)
            reject(err)
        })
        child.on('close', (code) => {
            clearTimeout(timer)
            if (code === 0) resolve()
            else reject(new Error(stderr.trim() || `yt-dlp ${code}`))
        })
    })

    const dir = path.dirname(tmpBase)
    const baseName = path.basename(tmpBase)
    const arquivos = (await fs.readdir(dir)).filter((f) => f.startsWith(baseName))
    const midias = []
    for (const arq of arquivos) {
        const full = path.join(dir, arq)
        const buffer = await fs.readFile(full)
        try { await fs.unlink(full) } catch {}
        if (!buffer?.length) continue
        const ext = path.extname(arq).toLowerCase()
        midias.push({
            tipo: ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? 'imagem' : 'video',
            buffer
        })
    }
    if (!midias.length) throw new Error('yt-dlp sem arquivos')
    return midias
}

async function viaScraper(link) {
    const res = await instagramGetUrl(link)
    if (!res?.url_list?.length) throw new Error('scraper vazio')
    const midias = []
    for (const u of res.url_list) {
        const buffer = await baixarBuffer(u)
        midias.push({ tipo: tipoDeUrl(u), buffer })
    }
    return midias
}

async function viaEmbed(link) {
    const short = extrairShortcode(link)
    const candidates = [
        link.replace(/\/$/, '') + '/embed/captioned/',
        link.replace(/\/$/, '') + '/embed/',
        short ? `https://www.instagram.com/p/${short}/embed/captioned/` : null,
        short ? `https://www.instagram.com/reel/${short}/embed/captioned/` : null
    ].filter(Boolean)

    for (const embedUrl of candidates) {
        try {
            const { data: html } = await axios.get(embedUrl, {
                timeout: 25000,
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                    'Accept-Language': 'en-US,en;q=0.9',
                    Accept: 'text/html'
                }
            })
            const urls = coletarUrlsDeTexto(html)
            // prefer video urls
            const ordenadas = urls.sort((a, b) => Number(/\.mp4/i.test(b)) - Number(/\.mp4/i.test(a)))
            const midias = []
            for (const u of ordenadas.slice(0, 6)) {
                try {
                    const buffer = await baixarBuffer(u)
                    if (buffer.length > 2000) midias.push({ tipo: tipoDeUrl(u), buffer })
                } catch { /* next */ }
            }
            if (midias.length) return midias
        } catch { /* next embed */ }
    }
    throw new Error('embed sem mídia')
}

async function viaEspelhos(link) {
    const mirrors = [
        link.replace('www.instagram.com', 'ddinstagram.com').replace('instagram.com', 'ddinstagram.com'),
        link.replace('www.instagram.com', 'www.ddinstagram.com'),
        link.replace('instagram.com', 'ezddinstagram.com')
    ]
    for (const dd of mirrors) {
        try {
            const { data: html } = await axios.get(dd, {
                timeout: 20000,
                headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
                maxRedirects: 5,
                validateStatus: () => true
            })
            const urls = coletarUrlsDeTexto(html)
            const og =
                String(html).match(/og:video" content="([^"]+)"/) ||
                String(html).match(/og:image" content="([^"]+)"/)
            if (og?.[1]) urls.unshift(og[1].replace(/&amp;/g, '&'))
            const midias = []
            for (const u of [...new Set(urls)].slice(0, 5)) {
                try {
                    const buffer = await baixarBuffer(u)
                    if (buffer.length > 2000) midias.push({ tipo: tipoDeUrl(u), buffer })
                } catch { /* next */ }
            }
            if (midias.length) return midias
        } catch { /* next mirror */ }
    }
    throw new Error('espelhos falharam')
}

async function viaAjaxDownloaders(link) {
    const endpoints = [
        {
            url: 'https://snapinsta.app/action2.php',
            body: new URLSearchParams({ url: link, lang: 'en' }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0',
                Origin: 'https://snapinsta.app',
                Referer: 'https://snapinsta.app/'
            }
        },
        {
            url: 'https://indown.io/download',
            body: new URLSearchParams({ link, lang: 'en' }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0',
                Origin: 'https://indown.io',
                Referer: 'https://indown.io/'
            }
        }
    ]

    for (const ep of endpoints) {
        try {
            const { data, status } = await axios.post(ep.url, ep.body, {
                timeout: 25000,
                headers: ep.headers,
                validateStatus: () => true
            })
            if (status >= 400) continue
            const urls = coletarUrlsDeTexto(typeof data === 'string' ? data : JSON.stringify(data))
            const midias = []
            for (const u of urls.slice(0, 5)) {
                try {
                    const buffer = await baixarBuffer(u)
                    if (buffer.length > 2000) midias.push({ tipo: tipoDeUrl(u), buffer })
                } catch { /* next */ }
            }
            if (midias.length) return midias
        } catch { /* next */ }
    }
    throw new Error('ajax downloaders falharam')
}

/** Cobalt self-hosted (COBALT_API_URL) ou instâncias públicas conhecidas. */
async function viaCobalt(link) {
    const bases = [
        process.env.COBALT_API_URL?.trim(),
        'https://cobalt-api.kwiatekmiki.com',
        'https://api.cobalt.best',
        'https://co.wuk.sh'
    ].filter(Boolean)

    for (const base of bases) {
        try {
            const { data, status } = await axios.post(
                base.replace(/\/+$/, '') + '/',
                { url: link, downloadMode: 'auto', videoQuality: '720' },
                {
                    timeout: 45000,
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 UltronBot'
                    },
                    validateStatus: () => true
                }
            )
            if (status >= 400 || !data) continue

            const urls = []
            if (data.url) urls.push(data.url)
            if (data.tunnel) urls.push(data.tunnel)
            if (Array.isArray(data.picker)) {
                for (const p of data.picker) {
                    if (p?.url) urls.push(p.url)
                }
            }
            const midias = []
            for (const u of [...new Set(urls)].slice(0, 8)) {
                try {
                    const buffer = await baixarBuffer(u)
                    if (buffer.length > 2000) midias.push({ tipo: tipoDeUrl(u), buffer })
                } catch { /* next */ }
            }
            if (midias.length) return midias
        } catch { /* next instance */ }
    }
    throw new Error('cobalt falhou')
}

/** saveig / downloadreel style JSON APIs. */
async function viaSaveApis(link) {
    const posts = [
        {
            url: 'https://saveig.app/api/ajaxSearch',
            body: new URLSearchParams({ q: link, t: 'media', lang: 'en' }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0',
                Origin: 'https://saveig.app',
                Referer: 'https://saveig.app/'
            }
        },
        {
            url: 'https://v3.saveig.app/api/ajaxSearch',
            body: new URLSearchParams({ q: link, t: 'media', lang: 'en' }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0',
                Origin: 'https://saveig.app',
                Referer: 'https://saveig.app/en'
            }
        },
        {
            url: 'https://api.fabdl.com/instagram/get',
            body: null,
            getUrl: `https://api.fabdl.com/instagram/get?url=${encodeURIComponent(link)}`,
            headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }
        }
    ]

    for (const ep of posts) {
        try {
            let data, status
            if (ep.getUrl) {
                ;({ data, status } = await axios.get(ep.getUrl, {
                    timeout: 30000,
                    headers: ep.headers,
                    validateStatus: () => true
                }))
            } else {
                ;({ data, status } = await axios.post(ep.url, ep.body, {
                    timeout: 30000,
                    headers: ep.headers,
                    validateStatus: () => true
                }))
            }
            if (status >= 400 || !data) continue
            const blob = typeof data === 'string' ? data : JSON.stringify(data)
            const urls = coletarUrlsDeTexto(blob)
            // fabdl shape
            if (data?.result?.download_url) urls.unshift(data.result.download_url)
            if (data?.result?.video_url) urls.unshift(data.result.video_url)
            if (Array.isArray(data?.result?.medias)) {
                for (const m of data.result.medias) {
                    if (m?.url) urls.unshift(m.url)
                }
            }
            const midias = []
            for (const u of [...new Set(urls)].slice(0, 6)) {
                try {
                    const buffer = await baixarBuffer(u)
                    if (buffer.length > 2000) midias.push({ tipo: tipoDeUrl(u), buffer })
                } catch { /* next */ }
            }
            if (midias.length) return midias
        } catch { /* next */ }
    }
    throw new Error('saveapis falharam')
}

/**
 * Baixa mídia pública do Instagram com várias estratégias.
 */
export async function baixarInstagram(url) {
    const link = normalizarLinkIg(url)
    if (!/instagram\.com\//i.test(link)) {
        throw { erro: 'Envie um link válido do Instagram (post/reel/tv).' }
    }

    const erros = []
    const tentativas = [
        ['yt-dlp', () => viaYtDlp(link)],
        ['cobalt', () => viaCobalt(link)],
        ['saveapis', () => viaSaveApis(link)],
        ['scraper', () => viaScraper(link)],
        ['embed', () => viaEmbed(link)],
        ['espelhos', () => viaEspelhos(link)],
        ['ajax', () => viaAjaxDownloaders(link)]
    ]

    for (const [nome, fn] of tentativas) {
        try {
            const midias = await fn()
            if (midias?.length) return midias
        } catch (err) {
            const msg = err?.message || String(err)
            console.log(`IG ${nome} - ${msg}`)
            erros.push(`${nome}: ${msg.slice(0, 80)}`)
        }
    }

    throw {
        erro:
            'Não foi possível baixar do Instagram (post privado ou bloqueio da API). ' +
            'Dicas: poste link público; no `.env` defina `YTDLP_COOKIES=caminho/cookies.txt` ' +
            'ou `YTDLP_BROWSER_COOKIES=chrome` com o Chrome logado no Instagram.'
    }
}

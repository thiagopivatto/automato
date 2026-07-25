import axios from 'axios'
import {obterNomeAleatorio} from '../lib/util.js'
import duration from 'format-duration-time'
import FormData from 'form-data'
import getEmojiMixUrl, {checkSupported} from 'emoji-mixer'
import qs from 'node:querystring'
import {ImageUploadService} from 'node-upload-images'
import UserAgent from 'user-agents'
import {JSDOM} from 'jsdom'
import { removeBgRapid, rapidKey } from '../lib/rapidapi.js'
import { removerFundoHf } from '../lib/rembg.js'


export const imagemUpload = async (bufferImagem) =>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {}
            const service = new ImageUploadService('pixhost.to')
            await service.uploadFromBinary(bufferImagem, obterNomeAleatorio("png")).then(({directLink})=>{
                resposta.resultado = directLink
                resolve(resposta)
            }).catch(()=>{
                resposta.erro = `Houve um erro no upload da imagem`
                reject(resposta)
            })
        } catch(err){
            console.log(`API imagemUpload - ${err.message}`)
            reject({erro: `Houve um erro no upload da imagem`})
        }
    })
}

async function gerarImagemTextoLocal(texto){
    const jimp = (await import('jimp')).default
    const width = 512
    const height = 512
    const image = new jimp(width, height, 0x00000000)
    const font = await jimp.loadFont(jimp.FONT_SANS_32_WHITE)
    const lines = String(texto).match(/.{1,18}(\s|$)/g) || [texto]
    let y = Math.max(40, Math.floor((height - lines.length * 40) / 2))
    for (const line of lines.slice(0, 10)) {
        image.print(font, 20, y, {
            text: line.trim(),
            alignmentX: jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: jimp.VERTICAL_ALIGN_MIDDLE
        }, width - 40, 40)
        y += 40
    }
    return await image.getBufferAsync(jimp.MIME_PNG)
}

export const textoParaImagem = async(texto, animado = false)=>{
    return new Promise(async(resolve,reject)=>{
        try{
            let resposta = {}
            const textoEnc = encodeURIComponent(texto)
            const apisEstaticas = [
                `https://api.erdwpe.com/api/maker/ttp?text=${textoEnc}`,
                `https://api.popcat.xyz/text?text=${textoEnc}`,
                `https://api.nyxs.pw/canvas/ttp?text=${textoEnc}`
            ]
            const apisAnimadas = [
                `https://api.erdwpe.com/api/maker/attp?text=${textoEnc}`,
                `https://api.nyxs.pw/canvas/ttp?text=${textoEnc}`
            ]
            const urls = animado ? apisAnimadas : apisEstaticas
            let tentativas = 0

            for (const apiUrl of urls) {
                tentativas++
                try {
                    const {data} = await axios.get(apiUrl, {responseType: 'arraybuffer', timeout: 15000})
                    if (data && data.byteLength > 100) {
                        resposta.resultado = data
                        resolve(resposta)
                        return
                    }
                } catch {
                    // tenta próxima API
                }
                if (animado && tentativas >= 2) break
            }

            if (animado) {
                reject({erro: 'Não foi possível gerar o GIF animado após várias tentativas. Tente novamente mais tarde.'})
                return
            }

            resposta.resultado = await gerarImagemTextoLocal(texto)
            resolve(resposta)
        } catch(err){
            console.log(`API textoParaImagem- ${err.message}`)
            reject({erro: "Houve um erro no servidor para transformar texto em imagem."})
        }
    })

}

function normalizarEmoji(e) {
    return String(e || '')
        .trim()
        .replace(/\uFE0F/g, '') // variation selector
        .replace(/\u200D/g, '') // ZWJ simplificado para fallback
}

function codepointsEmoji(emoji) {
    return [...String(emoji)].map((c) => c.codePointAt(0).toString(16)).filter(Boolean)
}

async function baixarUrlArrayBuffer(url) {
    const { data, status } = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 20000,
        validateStatus: (s) => s < 500,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    if (status >= 400 || !data || data.byteLength < 200) throw new Error('download falhou')
    return Buffer.from(data)
}

async function misturarViaGstatic(emoji1, emoji2) {
    // Usa datas retornadas pelo emoji-mixer quando disponíveis
    let datas = [
        '20201001', '20210521', '20211115', '20220203', '20221101',
        '20230301', '20230418', '20230803', '20231113', '20231128',
        '20240206', '20240530', '20240610', '20241015', '20241023', '20260202'
    ]
    try {
        const info = checkSupported(emoji1, true)
        if (Array.isArray(info)) {
            for (const item of info) {
                if (item?.date && !datas.includes(item.date)) datas.unshift(item.date)
            }
        }
    } catch { /* ignore */ }

    const c1list = [codepointsEmoji(emoji1).map((p) => `u${p}`).join('-')]
    const c2list = [codepointsEmoji(emoji2).map((p) => `u${p}`).join('-')]
    // também tenta só o primeiro codepoint (emoji simples)
    const c1simple = codepointsEmoji(emoji1)[0]
    const c2simple = codepointsEmoji(emoji2)[0]
    if (c1simple) c1list.push(`u${c1simple}`)
    if (c2simple) c2list.push(`u${c2simple}`)

    const pares = []
    for (const a of [...new Set(c1list)]) {
        for (const b of [...new Set(c2list)]) {
            if (!a || !b) continue
            pares.push([a, b], [b, a])
        }
    }

    for (const data of datas) {
        for (const [a, b] of pares) {
            const url = `https://www.gstatic.com/android/keyboard/emojikitchen/${data}/${a}/${a}_${b}.png`
            try {
                const buf = await baixarUrlArrayBuffer(url)
                if (buf.length > 2000) return buf
            } catch { /* próxima */ }
        }
    }
    throw new Error('gstatic sem combinação')
}

export const misturarEmojis = async (emoji1, emoji2)=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {}
            const e1 = String(emoji1 || '').trim()
            const e2 = String(emoji2 || '').trim()
            if (!e1 || !e2) {
                reject({ erro: 'Informe dois emojis no formato emoji1+emoji2' })
                return
            }

            // 1) gstatic com ambas as ordens (mais confiável)
            try {
                resposta.resultado = await misturarViaGstatic(e1, e2)
                resolve(resposta)
                return
            } catch { /* segue */ }

            // 2) URL do pacote emoji-mixer
            const tentativasUrl = []
            for (const [a, b] of [[e1, e2], [e2, e1]]) {
                try {
                    const u = getEmojiMixUrl(a, b, false, true)
                    if (u) tentativasUrl.push(u)
                } catch { /* ignore */ }
                try {
                    const u2 = getEmojiMixUrl(a, b, false, false)
                    if (u2) tentativasUrl.push(u2)
                } catch { /* ignore */ }
            }
            for (const emojiUrl of [...new Set(tentativasUrl)]) {
                try {
                    const buf = await baixarUrlArrayBuffer(emojiUrl)
                    if (buf.length > 2000) {
                        resposta.resultado = buf
                        resolve(resposta)
                        return
                    }
                } catch { /* próxima URL */ }
            }

            reject({ erro: 'Emojis não compatíveis para união. Tente outra combinação (ex: 😂+❤️).' })
        } catch(err){
            console.log(`API misturarEmojis- ${err.message}`)
            reject({erro: "Emojis não compatíveis"})
        }
    })
}

async function removerFundoImageOnline(bufferImagem){
    let nomeArquivo = obterNomeAleatorio("png")
    let data = new FormData();
    data.append('files', bufferImagem, {filename: nomeArquivo})

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://download1.imageonline.co/ajax_upload_file.php',
        timeout: 20000,
        headers: { 
            'User-Agent': ' Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0', 
            'Accept': ' */*', 
            'Origin': ' https://imageonline.co', 
            'Connection': ' keep-alive', 
            'Referer': ' https://imageonline.co/', 
            'Sec-Fetch-Dest': ' empty', 
            'Sec-Fetch-Mode': ' cors', 
            'Sec-Fetch-Site': ' same-site', 
            ...data.getHeaders()
        },
        data : data
    }

    let respostaUpload = await axios.request(config)
    let dadosUpload = JSON.parse(JSON.stringify(respostaUpload.data))

    if(!dadosUpload.isSuccess){
        throw new Error('Tamanho da foto excedeu o limite')
    }

    data = qs.stringify({
        'name': dadosUpload.files[0].name,
        'originalname': dadosUpload.files[0].old_name,
        'option3': dadosUpload.files[0].extension,
        'option4': '1' 
    });
    
    config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://download1.imageonline.co/pngmaker.php',
        timeout: 20000,
        headers: { 
        'User-Agent': ' Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0', 
        'Accept': ' */*', 
        'Accept-Language': ' pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3', 
        'Accept-Encoding': ' gzip, deflate, br', 
        'Content-Type': 'application/x-www-form-urlencoded', 
        'Origin': ' https://imageonline.co', 
        'Connection': ' keep-alive', 
        'Referer': ' https://imageonline.co/', 
        'Sec-Fetch-Dest': ' empty', 
        'Sec-Fetch-Mode': ' cors', 
        'Sec-Fetch-Site': ' same-site'
        },
        data : data
    }

    let respostaFotoUrl = await axios.request(config)
    let fotoUrl = respostaFotoUrl.data.match(/https:\/\/download1\.imageonline\.co\/download\.php\?filename=[A-Za-z0-9]+-imageonline\.co-[0-9]+\.png/m)
    if (!fotoUrl?.[0]) throw new Error('URL da imagem sem fundo não encontrada')
    const {data: buffer} = await axios.get(fotoUrl[0], {responseType: 'arraybuffer', timeout: 20000})
    return buffer
}

async function removerFundoRyzumi(bufferImagem){
    const upload = await imagemUpload(bufferImagem)
    const imageUrl = upload.resultado
    const {data} = await axios.get(`https://api.ryzumi.vip/api/ai/removebg?url=${encodeURIComponent(imageUrl)}`, {
        responseType: 'arraybuffer',
        timeout: 30000
    })
    if (!data || data.byteLength < 100) throw new Error('Resposta inválida do removebg')
    return data
}

export const removerFundo = async(bufferImagem)=>{
    return new Promise(async (resolve,reject)=>{
        try{
            let resposta = {}

            // 1) HuggingFace rembg (mais confiável sem assinatura Rapid)
            try {
                resposta.resultado = await removerFundoHf(bufferImagem)
                if (resposta.resultado?.length > 500) {
                    resolve(resposta)
                    return
                }
            } catch (errHf) {
                console.log(`API removerFundo HF - ${errHf.message}`)
            }

            if (rapidKey()) {
                try {
                    resposta.resultado = await removeBgRapid(bufferImagem)
                    if (resposta.resultado?.length > 500) {
                        resolve(resposta)
                        return
                    }
                } catch (errRapid) {
                    console.log(`API removerFundo RapidAPI - ${errRapid.message}`)
                }
            }

            try {
                resposta.resultado = await removerFundoRyzumi(bufferImagem)
                resolve(resposta)
                return
            } catch (err2) {
                console.log(`API removerFundo ryzumi - ${err2.message}`)
            }

            try {
                resposta.resultado = await removerFundoImageOnline(bufferImagem)
                resolve(resposta)
                return
            } catch (err1) {
                console.log(`API removerFundo imageonline - ${err1.message}`)
            }

            reject({erro: 'Não foi possível remover o fundo da imagem. Tente novamente mais tarde.'})
        } catch(err){
            console.log(`API removerFundo - ${err.message}`)
            reject({erro: "Não foi possível remover o fundo da imagem. Tente novamente mais tarde."})
        }
    })
}

export const obterAnimeInfo = async (bufferImagem)=>{ 
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {}
            await fetch(`https://api.trace.moe/search?anilistInfo`,{
                    method: "POST",
                    body: bufferImagem,
                    headers: { "Content-type": "image/jpeg" },
            }).then(async (res)=>{
                res = await res.json()
                let msInicio = Math.round(res.result[0].from * 1000) , msFinal = Math.round(res.result[0].to * 1000)
                let tempoInicial = duration.default(msInicio).format("h:mm:ss")
                let tempoFinal = duration.default(msFinal).format("h:mm:ss")
                let episodio = res.result[0].episode
                let titulo =  res.result[0].anilist.title.english || res.result[0].anilist.title.romaji
                let similaridade = parseFloat((res.result[0].similarity * 100).toFixed(2))
                let previaLink = res.result[0].video
                resposta.resultado = {
                    tempoInicial,
                    tempoFinal,
                    episodio,
                    titulo,
                    similaridade,
                    link_previa: previaLink
                }
                resolve(resposta)
            }).catch(err=>{
                if(err.status == 429){
                    resposta.erro = 'Muitas solicitações sendo feitas, tente novamente mais tarde.'
                    reject(resposta)
                } else if(err.status == 400){
                    resposta.erro = 'Não foi possível achar resultados para esta imagem'
                    reject(resposta)
                } else {
                    resposta.erro = 'Houve um erro no servidor de pesquisa de anime.'
                    reject(resposta)
                } 
            })
        } catch(err){
            console.log(`API obterAnimeInfo - ${err.message}`)
            reject({erro: 'Houve um erro no servidor de pesquisa de anime.'})
        }
    })
}

function ehUrlImagemValida(url){
    if (!url || typeof url !== 'string') return false
    if (!/^https?:\/\//i.test(url)) return false
    const limpa = url.split('?')[0].toLowerCase()
    return /\.(jpe?g|png|webp|gif)$/i.test(limpa) || /\/images?\//i.test(url) || /mm.bing.net|bing.net|tse\d+\.mm/i.test(url)
}

function coletarImagensBingHtml(html){
    const { window: { document } } = new JSDOM(html)
    const imagens = []
    const vistos = new Set()
    for (const img of document.querySelectorAll('a.iusc')) {
        try {
            const meta = JSON.parse(img.getAttribute('m') || '{}')
            const full = meta.murl || meta.turl
            const preview = meta.turl || meta.murl
            if (!full || !ehUrlImagemValida(full)) continue
            if (vistos.has(full)) continue
            vistos.add(full)
            imagens.push({ url: full, preview: preview || full })
        } catch {
            // ignora item inválido
        }
    }
    return imagens
}

function coletarImagensBingAsync(textoResposta){
    const imagens = []
    const vistos = new Set()
    const matches = String(textoResposta).matchAll(/murl&quot;:&quot;(https?:\/\/[^&"]+)/g)
    for (const match of matches) {
        try {
            const full = decodeURIComponent(match[1].replace(/\\u0026/g, '&').replace(/\\u003d/g, '='))
            if (!ehUrlImagemValida(full) || vistos.has(full)) continue
            vistos.add(full)
            imagens.push({ url: full, preview: full })
        } catch {
            // ignora
        }
    }
    // fallback: parse JSON-like murl fields
    if (!imagens.length) {
        const murlRegex = /"murl"\s*:\s*"(https?:\/\/[^"]+)"/g
        let m
        while ((m = murlRegex.exec(textoResposta)) !== null) {
            const full = m[1].replace(/\\u0026/g, '&').replace(/\\u003d/g, '=')
            if (!ehUrlImagemValida(full) || vistos.has(full)) continue
            vistos.add(full)
            imagens.push({ url: full, preview: full })
        }
    }
    return imagens
}

export const obterImagens = async (texto)=>{ 
    return new Promise(async(resolve,reject)=>{
        try {
            let resposta = {}
            const q = encodeURIComponent(texto)
            const headers = { 'User-Agent': new UserAgent().toString() }
            let imagens = []

            try {
                const url = `https://www.bing.com/images/search?q=${q}&form=HDRSC2&first=1`
                const { data: html } = await axios.get(url, { headers, timeout: 15000 })
                imagens = coletarImagensBingHtml(html)
            } catch (err) {
                console.log(`API obterImagens bing html - ${err.message}`)
            }

            if (!imagens.length) {
                try {
                    const asyncUrl = `https://www.bing.com/images/async?q=${q}&first=0&count=35`
                    const { data } = await axios.get(asyncUrl, { headers, timeout: 15000 })
                    imagens = coletarImagensBingAsync(data)
                } catch (err) {
                    console.log(`API obterImagens bing async - ${err.message}`)
                }
            }

            if (!imagens.length) {
                resposta.erro = "Não foi encontrado resultado para esta pesquisa."
                reject(resposta)
                return
            }
            resposta.resultado = imagens
            resolve(resposta)
        } catch(err) {
            console.log(`API obterImagens - ${err.message}`)
            reject({erro: "Houve um erro no servidor de pesquisa de imagens."})
        }
    })
}

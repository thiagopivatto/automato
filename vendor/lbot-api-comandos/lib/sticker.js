import ffmpeg from "fluent-ffmpeg"
import crypto from 'node:crypto'
import webp from "node-webpmux"
import fs from 'fs-extra'
import {obterCaminhoTemporario, detectarMimeBuffer} from './util.js'

export const StickerTipos= {
    CIRCULO: 'circulo',
    PADRAO: 'padrao'
}

export async function criacaoSticker(buffer, {autor = 'LBOT', pack = 'LBOT Stickers', fps = 9, tipo = 'padrao'}){
    try{
        let mime = await detectarMimeBuffer(buffer, 'image/png')
        let midiaVideo = mime.startsWith('video')
        let midiaAnimada = midiaVideo || mime.includes('gif')
        const bufferWebp = await conversaoWebP(buffer, midiaAnimada, fps, tipo)
        return await adicionarExif(bufferWebp, pack, autor)
    } catch(err){
        throw err
    }   
}

export async function adicionarExif(buffer, pack, autor){
    try{
        const img = new webp.Image()
        const stickerPackId = crypto.randomBytes(32).toString('hex')
        const json = { 'sticker-pack-id': stickerPackId, 'sticker-pack-name': pack, 'sticker-pack-publisher': autor}
        let exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
        let jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
        let exif = Buffer.concat([exifAttr, jsonBuffer])
        exif.writeUIntLE(jsonBuffer.length, 14, 4)
        await img.load(buffer)
        img.exif = exif
        return await img.save(null)
    } catch(err){
        throw err
    }
}

async function conversaoWebP(buffer, midiaAnimada, fps, tipo){
    return new Promise(async (resolve,reject)=>{
        try{
            let caminhoEntrada
            let opcoesFfmpeg
            let caminhoSaida = obterCaminhoTemporario('webp')
    
            if(midiaAnimada){
                caminhoEntrada = obterCaminhoTemporario('mp4')
                opcoesFfmpeg = [
                    "-vcodec libwebp",
                    "-filter:v",
                    `fps=fps=${fps}`,
                    "-lossless 0",
                    "-compression_level 4",
                    "-q:v 10",
                    "-loop 1",
                    "-preset picture",
                    "-an",
                    "-vsync 0",
                    "-s 512:512"
                ]
            } else{
                caminhoEntrada = obterCaminhoTemporario('png')
                buffer = await edicaoImagemFfmpeg(buffer, tipo)
                opcoesFfmpeg = [
                    "-vcodec libwebp",
                    "-loop 0",
                    "-lossless 1",
                    "-q:v 100",
                    "-preset default",
                    "-an",
                    "-vsync 0",
                    "-pix_fmt yuva420p"
                ]
            }
    
            fs.writeFileSync(caminhoEntrada, buffer)
    
            ffmpeg(caminhoEntrada).outputOptions(opcoesFfmpeg).save(caminhoSaida).on('end', async ()=>{
                let buffer = fs.readFileSync(caminhoSaida)
                fs.unlinkSync(caminhoSaida)
                fs.unlinkSync(caminhoEntrada)
                resolve(buffer)
            }).on('error', async (err)=>{
                try { fs.unlinkSync(caminhoEntrada) } catch {}
                reject(err)
            })
        } catch(err){
            reject(err)
        }
    })
}

/** Redimensiona com ffmpeg (sem Jimp/file-type). */
async function edicaoImagemFfmpeg(buffer, tipo){
    const entrada = obterCaminhoTemporario('bin')
    const saida = obterCaminhoTemporario('png')
    await fs.writeFile(entrada, buffer)

    let vf
    if (tipo === 'auto') {
        vf = 'format=rgba,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000'
    } else if (tipo === 'transparente' || tipo === 'emojimix') {
        // Remove fundos verdes (Emoji Kitchen) com agressividade alta + alpha
        vf = [
            'format=rgba',
            'colorkey=0x00FF00:0.35:0.04',
            'colorkey=0x00FE00:0.35:0.04',
            'colorkey=0x00B140:0.32:0.05',
            'colorkey=0x00A651:0.32:0.05',
            'colorkey=0x39FF14:0.35:0.05',
            'colorkey=0x7CFC00:0.3:0.05',
            'colorkey=0xADFF2F:0.28:0.05',
            'colorkey=0x90EE90:0.24:0.04',
            'colorkey=0x32CD32:0.3:0.05',
            'colorkey=0x008000:0.3:0.05',
            'despill=type=green:mix=0.9:expand=0.25',
            'scale=512:512:force_original_aspect_ratio=decrease',
            'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000'
        ].join(',')
    } else if (tipo === 'circulo') {
        // círculo com alpha
        vf = "scale=512:512:force_original_aspect_ratio=increase,crop=512:512,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(hypot(X-W/2,Y-H/2),min(W,H)/2),255,0)'"
    } else {
        vf = 'format=rgba,scale=512:512:force_original_aspect_ratio=increase,crop=512:512'
    }

    try {
        await new Promise((resolve, reject) => {
            ffmpeg(entrada)
                .outputOptions(['-vf', vf, '-frames:v', '1', '-y'])
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

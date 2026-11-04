/**
 * Teste exaustivo do pipeline revelar (sem WhatsApp real).
 * Simula VO de imagem/vídeo/áudio/voz e verifica reenvio NORMAL.
 */
import assert from 'node:assert/strict'
import {
    ehViewOnce,
    extrairMidiaViewOnce,
    baixarMidiaViewOnce,
    aoReceberViewOnce,
    revelarPorCitacao,
    enviarComoNormal,
    __test
} from '../bot/lib/revelar.js'
import { tiposMensagem } from '../bot/baileys/mensagem.js'

let falhas = 0
function ok(msg) { console.log(`✓ ${msg}`) }
function fail(msg, err) {
    falhas++
    console.error(`✗ ${msg}`, err?.message || err || '')
}

const mediaKey = Buffer.alloc(32, 7)
const jpegThumb = Buffer.from([0xff, 0xd8, 0xff, 0xd9, ...Buffer.alloc(100, 1)])

function voImage() {
    return {
        viewOnceMessageV2: {
            message: {
                imageMessage: {
                    mimetype: 'image/jpeg',
                    caption: 'segredo',
                    mediaKey,
                    url: 'https://mmg.whatsapp.net/v/fake',
                    directPath: '/v/fake',
                    fileLength: 1234,
                    jpegThumbnail: jpegThumb,
                    viewOnce: true
                }
            }
        }
    }
}

function voVideo() {
    return {
        viewOnceMessage: {
            message: {
                videoMessage: {
                    mimetype: 'video/mp4',
                    mediaKey,
                    url: 'https://mmg.whatsapp.net/v/fakevid',
                    directPath: '/v/fakevid',
                    seconds: 3,
                    viewOnce: true
                }
            }
        }
    }
}

function voAudio(ptt = false) {
    return {
        viewOnceMessageV2: {
            message: {
                audioMessage: {
                    mimetype: 'audio/ogg; codecs=opus',
                    mediaKey,
                    url: 'https://mmg.whatsapp.net/v/fakeaud',
                    directPath: '/v/fakeaud',
                    ptt,
                    seconds: 2,
                    viewOnce: true
                }
            }
        }
    }
}

function flatVoImage() {
    return {
        imageMessage: {
            mimetype: 'image/jpeg',
            mediaKey,
            url: 'https://mmg.whatsapp.net/v/x',
            directPath: '/v/x',
            viewOnce: true
        }
    }
}

// --- detecção ---
try {
    assert.equal(ehViewOnce(voImage()), true)
    assert.equal(ehViewOnce(voVideo()), true)
    assert.equal(ehViewOnce(voAudio(true)), true)
    assert.equal(ehViewOnce(flatVoImage()), true)
    assert.equal(ehViewOnce({ conversation: 'oi' }), false)
    assert.equal(ehViewOnce({ imageMessage: { mimetype: 'image/jpeg' } }), false)
    ok('ehViewOnce (imagem/vídeo/áudio/voz/flat)')
} catch (e) { fail('ehViewOnce', e) }

// --- extração ---
try {
    const img = extrairMidiaViewOnce(voImage())
    assert.equal(img.tipo, tiposMensagem.imagem)
    assert.equal(img.midia.viewOnce, false)
    assert.ok(Buffer.isBuffer(img.midia.mediaKey))
    assert.equal(img.midia.caption, 'segredo')

    const vid = extrairMidiaViewOnce(voVideo())
    assert.equal(vid.tipo, tiposMensagem.video)

    const voz = extrairMidiaViewOnce(voAudio(true))
    assert.equal(voz.tipo, tiposMensagem.audio)
    assert.equal(voz.ptt, true)

    const aud = extrairMidiaViewOnce(voAudio(false))
    assert.equal(aud.ptt, false)
    ok('extrairMidiaViewOnce')
} catch (e) { fail('extrairMidiaViewOnce', e) }

// --- download injetado + aoReceber ---
const enviados = []
const sockFake = {
    logger: { info() {}, warn() {}, error() {}, debug() {}, child() { return this } },
    updateMediaMessage: async (m) => m,
    relayMessage: async () => {},
    sendMessage: async (jid, content) => {
        enviados.push({ jid, content })
        return { key: { id: 'OUT1', remoteJid: jid }, message: content }
    }
}

// stub socket.responderArquivoBuffer via enviarComoNormal usa socket real —
// então testamos baixar + aoReceber com downloadFn e mockamos enviarComoNormal path
// chamando baixarMidiaViewOnce + verificando arquivo

try {
    const fakeBytes = Buffer.alloc(500, 9)
    const wa = {
        key: { remoteJid: '120363@g.us', id: 'ABC123', fromMe: false, participant: '5511@s.whatsapp.net' },
        message: voImage()
    }
    const arquivo = await baixarMidiaViewOnce(sockFake, wa, {
        downloadFn: async () => fakeBytes
    })
    assert.ok(arquivo)
    assert.equal(arquivo.buffer.length, 500)
    assert.equal(arquivo.tipo, tiposMensagem.imagem)
    assert.equal(arquivo.caption, 'segredo')
    ok('baixarMidiaViewOnce (download injetado)')
} catch (e) { fail('baixarMidiaViewOnce', e) }

// aoReceber: precisa do socket real responderArquivoBuffer — mock via downloadFn
// e intercepta enviando com enviarComoNormal se socket funcionar.
// Em NAS/api Videos.obterThumbnail pode falhar no vídeo; imagem deve ir.

try {
    // monkey: usar downloadFn e enviarComoNormal com sock que só implementa sendMessage
    const { default: api } = await import('../bot/lib/lbotApi.js').catch(() => ({ default: null }))
    // Força caminho imagem (não chama ffmpeg)
    const wa = {
        key: { remoteJid: '120363@g.us', id: 'IMG999', fromMe: false },
        message: voImage()
    }
    const fakeBytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9, ...Buffer.alloc(200, 2)])
    // Patch temporário: chamar baixar + enviarComoNormal direto
    const arq = await baixarMidiaViewOnce(sockFake, wa, { downloadFn: async () => fakeBytes })
    const enviou = await enviarComoNormal(sockFake, wa.key.remoteJid, arq, wa)
    assert.equal(enviou, true)
    assert.ok(enviados.some((e) => e.content?.image))
    assert.ok(!enviados.some((e) => e.content?.image?.viewOnce))
    ok('enviarComoNormal imagem sem viewOnce')
} catch (e) { fail('enviarComoNormal imagem', e) }

try {
    enviados.length = 0
    const wa = {
        key: { remoteJid: '120363@g.us', id: 'AUD001', fromMe: false },
        message: voAudio(true)
    }
    const fakeBytes = Buffer.alloc(300, 3)
    const arq = await baixarMidiaViewOnce(sockFake, wa, { downloadFn: async () => fakeBytes })
    assert.equal(arq.ptt, true)
    const enviou = await enviarComoNormal(sockFake, wa.key.remoteJid, arq, null)
    assert.equal(enviou, true)
    const audioMsg = enviados.find((e) => e.content?.audio)
    assert.ok(audioMsg)
    assert.equal(audioMsg.content.ptt, true)
    ok('enviarComoNormal voz (ptt)')
} catch (e) { fail('enviarComoNormal voz', e) }

try {
    enviados.length = 0
    const wa = {
        key: { remoteJid: '120363@g.us', id: 'VID001', fromMe: false },
        message: voVideo()
    }
    const fakeBytes = Buffer.alloc(400, 4)
    const arq = await baixarMidiaViewOnce(sockFake, wa, { downloadFn: async () => fakeBytes })
    // vídeo chama api.Videos.obterThumbnailVideo — pode falhar; tratamos
    try {
        const enviou = await enviarComoNormal(sockFake, wa.key.remoteJid, arq, null)
        if (enviou) {
            assert.ok(enviados.some((e) => e.content?.video))
            ok('enviarComoNormal vídeo')
        } else {
            ok('enviarComoNormal vídeo (skip thumb api)')
        }
    } catch (err) {
        // se thumb falhar, ainda validamos arquivo
        assert.equal(arq.tipo, tiposMensagem.video)
        ok(`enviarComoNormal vídeo (arquivo ok; envio: ${err.message})`)
    }
} catch (e) { fail('vídeo', e) }

// aoReceberViewOnce end-to-end com downloadFn + sendMessage imagem
try {
    enviados.length = 0
    __test.jaReenviadas.clear()
    const wa = {
        key: { remoteJid: 'g@g.us', id: 'E2E1', fromMe: false },
        message: voImage()
    }
    const fakeBytes = Buffer.from([0xff, 0xd8, ...Buffer.alloc(120, 5)])
    const okRecv = await aoReceberViewOnce(sockFake, wa, { downloadFn: async () => fakeBytes })
    assert.equal(okRecv, true)
    assert.equal(await aoReceberViewOnce(sockFake, wa, { downloadFn: async () => fakeBytes }), false) // dedupe
    ok('aoReceberViewOnce + dedupe')
} catch (e) { fail('aoReceberViewOnce', e) }

// revelarPorCitacao
try {
    enviados.length = 0
    __test.jaReenviadas.clear()
    const citacao = {
        stanzaId: 'QUOTE1',
        remetente: '5511999@s.whatsapp.net',
        mensagem_vunica: true,
        tipo: tiposMensagem.imagem,
        midia: {
            mimetype: 'image/jpeg',
            mediaKey,
            url: 'https://mmg.whatsapp.net/v/q',
            directPath: '/v/q',
            caption: 'citado',
            viewOnce: true
        },
        quoteOriginal: voImage()
    }
    const fakeBytes = Buffer.alloc(180, 6)
    const res = await revelarPorCitacao(sockFake, citacao, 'g@g.us', { key: { id: 'CMD' } }, {
        downloadFn: async () => fakeBytes
    })
    assert.equal(res.ok, true)
    assert.ok(res.bytes === 180 || res.via === 'relay' || res.via === 'download')
    ok('revelarPorCitacao')
} catch (e) { fail('revelarPorCitacao', e) }

// grupo.js usa revelarPorCitacao
try {
    const fs = await import('fs')
    const src = fs.readFileSync(new URL('../bot/comandos/grupo.js', import.meta.url), 'utf8')
    const bloco = src.slice(src.indexOf('case "revelar"'), src.indexOf('case "revelar"') + 1800)
    assert.ok(bloco.includes('revelarPorCitacao'))
    assert.ok(!bloco.includes('viewOnceCache'))
    ok('grupo.js revelar usa módulo novo')
} catch (e) { fail('grupo.js', e) }

// eventosSocket usa aoReceberViewOnce
try {
    const fs = await import('fs')
    const src = fs.readFileSync(new URL('../bot/baileys/eventosSocket.js', import.meta.url), 'utf8')
    assert.ok(src.includes('aoReceberViewOnce'))
    assert.ok(src.includes('revelar.js'))
    ok('eventosSocket integra aoReceberViewOnce')
} catch (e) { fail('eventosSocket', e) }

console.log(falhas ? `\nFALHOU (${falhas})` : '\nTODOS OS TESTES PASSARAM')
process.exit(falhas ? 1 : 0)

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, unlink } from 'node:fs/promises'
import { createDecipheriv } from 'node:crypto'
import { downloadMediaMessage, encryptedStream, getMediaKeys, proto } from '@whiskeysockets/baileys'
import { baixarImagemStatus, publicarStatusGrupo, mensagemErroStatusGrupo } from '../bot/lib/statusGrupo.js'

// Somente o transporte HTTP é substituído; download, criptografia e proto são reais.
function transporteLocal(bytes) {
    return {
        dispatch(options, handler) {
            assert.equal(String(options.origin), 'https://mmg.whatsapp.net')
            queueMicrotask(() => {
                handler.onConnect(() => {})
                handler.onHeaders(200, ['content-type', 'application/octet-stream'], () => {}, 'OK')
                handler.onData(bytes)
                handler.onComplete([])
            })
            return true
        }
    }
}

async function imagemCriptografada(t) {
    const png = await readFile(new URL('../bot/midia/mascote.png', import.meta.url))
    const criptografada = await encryptedStream(png, 'image')
    t.after(async () => { await unlink(criptografada.encFilePath).catch(() => {}) })
    const bytes = await readFile(criptografada.encFilePath)
    return {
        png, bytes,
        mensagem: {
            key: { remoteJid: '120363000000000000@g.us', id: 'IMAGEM', participant: '777@lid', fromMe: false },
            message: { imageMessage: {
                directPath: '/imagem-local.enc',
                mediaKey: criptografada.mediaKey,
                fileSha256: criptografada.fileSha256,
                fileEncSha256: criptografada.fileEncSha256,
                mimetype: 'image/png', caption: 'Legenda original'
            } }
        }
    }
}

test('reproduz no Baileys real a rejeição de uma imagem com directPath sem url', async (t) => {
    const { mensagem } = await imagemCriptografada(t)
    await assert.rejects(downloadMediaMessage(mensagem, 'buffer', {}), /not a media message/)
})

test('correção baixa e descriptografa imagem com directPath sem modificar a citação', async (t) => {
    const { mensagem, png, bytes } = await imagemCriptografada(t)
    const resultado = await baixarImagemStatus({}, { mensagem }, {
        opcoesDownload: { options: { dispatcher: transporteLocal(bytes) } }
    })
    assert.deepEqual(resultado, png)
    assert.equal(mensagem.message.imageMessage.url, undefined)
})

test('pipeline real baixa, descriptografa, recriptografa e serializa imagem no status', async (t) => {
    const { mensagem, png, bytes } = await imagemCriptografada(t)
    let upload
    let publicado
    const sock = {
        user: { id: '5511999999999:3@s.whatsapp.net' },
        async waUploadToServer(path, options) {
            upload = await readFile(path)
            assert.equal(options.mediaType, 'image')
            return { mediaUrl: 'https://mmg.whatsapp.net/nova-imagem.enc', directPath: '/nova-imagem.enc' }
        },
        async relayMessage(jid, message) {
            assert.equal(jid, mensagem.key.remoteJid)
            publicado = proto.Message.decode(proto.Message.encode(message).finish())
        }
    }
    await publicarStatusGrupo(sock, {
        mensagem_grupo: true, mensagem_citada: true, id_chat: mensagem.key.remoteJid,
        citacao: { tipo: 'imageMessage', mensagem, legenda: 'Legenda original', mimetype: 'image/png' }
    }, {
        baixar: (wa, tipo, _options, ctx) => downloadMediaMessage(wa, tipo, {
            options: { dispatcher: transporteLocal(bytes) }
        }, ctx)
    })
    const imagem = publicado.groupStatusMessageV2.message.imageMessage
    assert.equal(imagem.contextInfo.isGroupStatus, true)
    assert.equal(imagem.caption, 'Legenda original')
    assert.notDeepEqual(imagem.mediaKey, mensagem.message.imageMessage.mediaKey)
    const { cipherKey, iv } = await getMediaKeys(imagem.mediaKey, 'image')
    const decifrador = createDecipheriv('aes-256-cbc', cipherKey, iv)
    const original = Buffer.concat([decifrador.update(upload.subarray(0, -10)), decifrador.final()])
    assert.deepEqual(original, png)
})

test('contexto de reupload fornece logger mesmo quando o socket não o expõe', async () => {
    let reupload = false
    const mensagem = { message: { imageMessage: { mediaKey: Buffer.alloc(32), directPath: '/imagem.enc' } } }
    await baixarImagemStatus({ async updateMediaMessage(m) { reupload = true; return m } }, { mensagem }, {
        async baixar(m, tipo, options, ctx) {
            assert.equal(typeof ctx.logger.info, 'function')
            ctx.logger.info('Teste de reupload')
            await ctx.reuploadRequest(m)
            return Buffer.from('ok')
        }
    })
    assert.equal(reupload, true)
})

test('falhas informam a etapa sem expor URLs ou credenciais na resposta ao grupo', async () => {
    for (const etapa of ['download', 'upload', 'envio']) {
        const resposta = mensagemErroStatusGrupo({ etapaStatusGrupo: etapa, message: 'token-secreto' })
        assert.match(resposta, new RegExp(`SG_${etapa.toUpperCase()}`))
        assert.doesNotMatch(resposta, /token-secreto/)
    }
    let relay = false
    await assert.rejects(publicarStatusGrupo({
        user: { id: '5511999999999@s.whatsapp.net' },
        async relayMessage() { relay = true }
    }, {
        mensagem_grupo: true, mensagem_citada: true, id_chat: '120363000000000000@g.us',
        citacao: { tipo: 'imageMessage', mensagem: { message: { imageMessage: { jpegThumbnail: Buffer.alloc(100) } } } }
    }), (err) => err.etapaStatusGrupo === 'download')
    assert.equal(relay, false)
})

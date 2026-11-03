import test from 'node:test'
import assert from 'node:assert/strict'
import { proto } from '@whiskeysockets/baileys'
import { comandosInfo, verificarComandoExiste } from '../bot/comandos/comandos.js'
import { publicarStatusGrupo } from '../bot/lib/statusGrupo.js'
import { converterMensagem } from '../bot/baileys/mensagem.js'

const bot = { prefixo: '!', nome_bot: 'Ultron', numero_bot: '5511999999999@s.whatsapp.net', lid_bot: '123456@lid' }
function pedido() {
    return {
        mensagem_grupo: true,
        mensagem_bot: false,
        mensagem_citada: true,
        id_chat: '120363000000000000@g.us',
        corpo: '!statusgrupo',
        comando: '!statusgrupo',
        mencionados: [],
        citacao: { tipo: 'conversation', corpo: 'a gente se vira' }
    }
}
function socket() {
    const envios = []
    return {
        user: { id: '5511999999999:3@s.whatsapp.net', lid: bot.lid_bot },
        envios,
        async relayMessage(jid, message, options) {
            // Verifica os bytes que o Baileys vai criptografar, não só o objeto JS.
            const bytes = proto.Message.encode(message).finish()
            envios.push({ jid, message: proto.Message.decode(bytes), options })
        }
    }
}

test('comando explícito é registrado com o prefixo configurado', () => {
    assert.equal(verificarComandoExiste({ ...bot, prefixo: '#' }, '#statusgrupo', 'grupo'), true)
    assert.match(comandosInfo(bot).grupo.statusgrupo.guia, /!statusgrupo/)
    assert.doesNotMatch(comandosInfo(bot).grupo.statusgrupo.guia, /menção/)
})

test('comando do WhatsApp preserva o texto ou imagem respondida', async () => {
    for (const quotedMessage of [
        { conversation: 'Texto original' },
        { imageMessage: { caption: 'Legenda original', mimetype: 'image/jpeg', mediaKey: Buffer.alloc(32) } }
    ]) {
        const m = await converterMensagem({ messages: [{
            key: { remoteJid: pedido().id_chat, id: 'PEDIDO', participant: '888@lid' },
            message: { extendedTextMessage: {
                text: '!statusgrupo',
                contextInfo: { quotedMessage, stanzaId: 'ORIGINAL', participant: '777@lid' }
            } }
        }] }, bot)
        assert.equal(m.comando, '!statusgrupo')
        assert.equal(m.citacao.stanzaId, 'ORIGINAL')
        assert.equal(m.citacao.mensagem.key.participant, '777@lid')
        assert.equal(m.citacao.corpo || m.citacao.legenda, quotedMessage.conversation || quotedMessage.imageMessage.caption)
    }
})

test('menção ao bot com resposta continua sendo uma mensagem sem comando', async () => {
    const m = await converterMensagem({ messages: [{
        key: { remoteJid: pedido().id_chat, id: 'MENCAO', participant: '888@lid' },
        message: { extendedTextMessage: {
            text: '@123456',
            contextInfo: { mentionedJid: [bot.lid_bot], quotedMessage: { conversation: 'Texto original' }, stanzaId: 'ORIGINAL', participant: '777@lid' }
        } }
    }] }, bot)
    assert.equal(m.mensagem_citada, true)
    assert.equal(verificarComandoExiste(bot, m.comando), false)
})

test('texto serializado é um status de grupo V2, com o conteúdo original', async () => {
    const sock = socket()
    const gerada = await publicarStatusGrupo(sock, pedido())
    assert.equal(sock.envios.length, 1)
    const envio = sock.envios[0]
    assert.equal(envio.jid, pedido().id_chat)
    assert.equal(envio.options.messageId, gerada.key.id)
    const texto = envio.message.groupStatusMessageV2.message.extendedTextMessage
    assert.equal(texto.text, 'a gente se vira')
    assert.equal(texto.contextInfo.isGroupStatus, true)
    assert.equal(texto.contextInfo.statusSourceType, proto.ContextInfo.StatusSourceType.TEXT)
    assert.equal(texto.contextInfo.statusAttributions[0].type, proto.StatusAttribution.Type.GROUP_STATUS)
    assert.equal(texto.contextInfo.statusAttributions[0].groupStatus.authorJid, bot.numero_bot)
    assert.equal(envio.message.conversation, null)
})

test('imagem é baixada da citação, reenviada com legenda e envolvida como status', async () => {
    const sock = socket()
    const m = pedido()
    const citada = { key: { remoteJid: m.id_chat, id: 'FOTO', participant: '777@lid' }, message: { imageMessage: {} } }
    m.citacao = { tipo: 'imageMessage', legenda: 'Legenda original', mimetype: 'image/png', mensagem: citada }
    const foto = Buffer.from('imagem de teste')
    let preparacoes = 0
    await publicarStatusGrupo(sock, m, {
        async baixar(wa, formato) {
            assert.equal(wa, citada)
            assert.equal(formato, 'buffer')
            return foto
        },
        async prepararMidia(conteudo, opts) {
            preparacoes++
            assert.equal(conteudo.image, foto)
            assert.equal(conteudo.caption, 'Legenda original')
            assert.equal(conteudo.mimetype, 'image/png')
            assert.equal(opts.jid, m.id_chat)
            return { imageMessage: { url: 'https://example.invalid/upload', caption: conteudo.caption, mediaKey: Buffer.alloc(32) } }
        }
    })
    assert.equal(preparacoes, 1)
    const imagem = sock.envios[0].message.groupStatusMessageV2.message.imageMessage
    assert.equal(imagem.caption, 'Legenda original')
    assert.equal(imagem.contextInfo.isGroupStatus, true)
    assert.equal(imagem.contextInfo.statusSourceType, proto.ContextInfo.StatusSourceType.IMAGE)
})

test('rejeita entradas inválidas antes de publicar', async () => {
    for (const mudanca of [
        { mensagem_grupo: false }, { id_chat: 'status@broadcast' },
        { mensagem_citada: false }, { citacao: { tipo: 'videoMessage' } },
        { citacao: { tipo: 'conversation', corpo: ' ' } },
        { citacao: { tipo: 'imageMessage', mensagem_vunica: true } }
    ]) {
        const sock = socket()
        await assert.rejects(publicarStatusGrupo(sock, { ...pedido(), ...mudanca }))
        assert.equal(sock.envios.length, 0)
    }
})

test('falha no download ou no relay não publica uma mensagem comum como alternativa', async () => {
    const sock = socket()
    await assert.rejects(publicarStatusGrupo(sock, {
        ...pedido(), citacao: { tipo: 'imageMessage', mensagem: {} }
    }, { baixar: async () => { throw new Error('download indisponível') } }), /download indisponível/)
    assert.equal(sock.envios.length, 0)
    sock.relayMessage = async () => { throw new Error('servidor recusou') }
    await assert.rejects(publicarStatusGrupo(sock, pedido()), /servidor recusou/)
})

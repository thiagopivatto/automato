import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import pino from 'pino'

const nos = []
let fimSocket
const transporte = {
    ev: new EventEmitter(),
    user: { id: '5511999999999@s.whatsapp.net', lid: '123@lid' },
    authState: {
        creds: { me: { id: '5511999999999@s.whatsapp.net', lid: '123@lid' } },
        keys: { get: async () => ({}), set: async () => {}, transaction: async (fn) => fn() }
    },
    signalRepository: {
        lidMapping: { getLIDForPN: async () => undefined },
        encryptGroupMessage: async () => ({ ciphertext: Buffer.from('cifra'), senderKeyDistributionMessage: Buffer.alloc(0) })
    },
    groupMetadata: async () => ({ participants: [], addressingMode: 'lid' }),
    sendNode: async (node) => { nos.push(node) },
    registerSocketEndHandler: (fn) => { fimSocket = fn }
}

// Substitui a conexão de rede/Signal, mantendo o relay real do Baileys.
mock.module(new URL('../node_modules/@whiskeysockets/baileys/lib/Socket/newsletter.js', import.meta.url).href, {
    namedExports: { makeNewsletterSocket: () => transporte }
})
const { makeMessagesSocket } = await import('../node_modules/@whiskeysockets/baileys/lib/Socket/messages-send.js')

test('relay real identifica a imagem dentro do status e preserva o marcador externo', async () => {
    const sock = makeMessagesSocket({
        logger: pino({ level: 'silent' }),
        patchMessageBeforeSending: async (message) => message,
        enableRecentMessageCache: false
    })
    try {
        await sock.relayMessage('120363000000000000@g.us', {
            groupStatusMessageV2: { message: { imageMessage: { caption: 'Teste' } } }
        }, {
            messageId: 'STATUS-IMAGEM',
            additionalNodes: [{ tag: 'meta', attrs: { is_group_status: 'true' } }]
        })
        const enviado = nos.at(-1)
        assert.equal(enviado.attrs.type, 'media')
        assert.equal(enviado.content.find((n) => n.tag === 'enc').attrs.mediatype, 'image')
        assert.equal(enviado.content.find((n) => n.tag === 'meta').attrs.is_group_status, 'true')

        await sock.relayMessage('120363000000000000@g.us', {
            groupStatusMessageV2: { message: { extendedTextMessage: { text: 'Texto' } } }
        }, { messageId: 'STATUS-TEXTO' })
        assert.equal(nos.at(-1).attrs.type, 'text')
        assert.equal(nos.at(-1).content.find((n) => n.tag === 'enc').attrs.mediatype, undefined)

        await sock.relayMessage('120363000000000000@g.us', {
            imageMessage: { caption: 'Imagem comum' }
        }, { messageId: 'IMAGEM-COMUM' })
        assert.equal(nos.at(-1).attrs.type, 'media')
        assert.equal(nos.at(-1).content.find((n) => n.tag === 'enc').attrs.mediatype, 'image')
    } finally { fimSocket?.() }
})

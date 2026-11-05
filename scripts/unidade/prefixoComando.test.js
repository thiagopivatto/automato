import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mensagemEhComando } from '../../bot/comandos/comandos.js'
import { decidirAcaoChat } from '../../bot/lib/chatRoteador.js'

const bot = { prefixo: '!', nome_adm: 'Thiago', nome_bot: 'Ultron' }

describe('comando só com prefixo', () => {
    it('palavra solta não dispara comando', () => {
        assert.equal(mensagemEhComando(bot, 'menu'), false)
        assert.equal(mensagemEhComando(bot, 'chat'), false)
        assert.equal(mensagemEhComando(bot, 'resumodogrupo'), false)
        assert.equal(mensagemEhComando(bot, 'play'), false)
    })

    it('com prefixo o comando existe', () => {
        assert.equal(mensagemEhComando(bot, '!menu'), true)
        assert.equal(mensagemEhComando(bot, '!chat'), true)
        assert.equal(mensagemEhComando(bot, '!resumodogrupo'), true)
    })

    it('no chat, pedido sem prefixo continua conversa', async () => {
        const frases = [
            'faz o resumo do grupo',
            'quero sortear',
            'baixa essa música',
            'conta uma piada',
            'como foi o jogo do são paulo ontem'
        ]
        for (const frase of frases) {
            const acao = await decidirAcaoChat(frase, bot)
            assert.equal(acao.tipo, 'conversa', frase)
        }
    })

    it('no chat, prefixo explícito vira comando', async () => {
        const acao = await decidirAcaoChat('ultron !menu', bot)
        assert.equal(acao.tipo, 'comando')
        assert.equal(acao.comando, '!menu')
        const chat = await decidirAcaoChat('!chat me conta o jogo', bot)
        assert.equal(chat.tipo, 'conversa')
    })
})

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    ORDEM_CASCADE_TEXTO,
    ORDEM_CASCADE_CHAT,
    respostaIaInvalida
} from '../../vendor/lbot-api-comandos/api/ia.js'

describe('cascade IA', () => {
    it('ordem padrão sem groq e free antes do pago', () => {
        assert.equal(ORDEM_CASCADE_TEXTO.includes('groq'), false)
        const free = ORDEM_CASCADE_TEXTO.indexOf('openrouter-free')
        const pago = ORDEM_CASCADE_TEXTO.indexOf('openrouter')
        const gemini = ORDEM_CASCADE_TEXTO.indexOf('gemini')
        assert.ok(gemini === 0)
        assert.ok(free > gemini)
        assert.ok(pago > free)
        assert.deepEqual([...ORDEM_CASCADE_TEXTO], [
            'gemini',
            'openrouter-free',
            'rapid',
            'openrouter',
            'pollinations'
        ])
    })

    it('chat hot path evita OpenRouter pago por padrão', () => {
        assert.equal(ORDEM_CASCADE_CHAT.includes('openrouter'), false)
        assert.ok(ORDEM_CASCADE_CHAT.includes('gemini'))
        assert.ok(ORDEM_CASCADE_CHAT.includes('openrouter-free'))
        assert.deepEqual([...ORDEM_CASCADE_CHAT], [
            'gemini',
            'openrouter-free',
            'pollinations'
        ])
    })

    it('respostaIaInvalida detecta lixo do Rapid / Copilot', () => {
        assert.equal(respostaIaInvalida(''), true)
        assert.equal(respostaIaInvalida('ok'), false)
        assert.equal(
            respostaIaInvalida('Copilot has moved. Visit https://www.microsoft.com for more info.'),
            true
        )
        assert.equal(respostaIaInvalida('You are not subscribed to this API'), true)
        assert.equal(respostaIaInvalida('Error: rate limit exceeded'), true)
        assert.equal(respostaIaInvalida('O placar do jogo foi 2 a 1 ontem à noite.'), false)
    })
})

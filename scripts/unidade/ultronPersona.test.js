import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
    parseSecoesPersona,
    personaPara,
    personaBase,
    caminhoArquivoPersona,
    limparCachePersona
} from '../../bot/lib/ultronPersona.js'

describe('ultronPersona', () => {
    it('arquivo persona/ULTRON.md existe', () => {
        const arq = caminhoArquivoPersona()
        assert.ok(fs.existsSync(arq), `esperado ${arq}`)
    })

    it('parseSecoesPersona extrai seções nomeadas', () => {
        const md = `# Como usar\nx\n\n# Identidade\nSou Ultron.\n\n# Chat\nRespondo no grupo.\n`
        const m = parseSecoesPersona(md)
        assert.equal(m.has('Como usar'), false)
        assert.equal(m.get('Identidade'), 'Sou Ultron.')
        assert.equal(m.get('Chat'), 'Respondo no grupo.')
    })

    it('personaPara(chat/resumo/automsg) não vazio', () => {
        limparCachePersona()
        const chat = personaPara('chat')
        const resumo = personaPara('resumo')
        const automsg = personaPara('automsg', { maxChars: 900 })
        assert.ok(chat.length > 80, 'chat')
        assert.ok(resumo.length > 80, 'resumo')
        assert.ok(automsg.length > 40, 'automsg')
        assert.match(chat, /Ultron/i)
        assert.match(resumo, /resumo|assuntos|opinião|primeira pessoa/i)
    })

    it('personaBase inclui identidade', () => {
        limparCachePersona()
        const b = personaBase()
        assert.match(b, /Identidade|Ultron/i)
    })
})

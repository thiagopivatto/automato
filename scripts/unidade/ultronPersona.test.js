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
        assert.match(chat, /Thiago|mestre/i)
        assert.match(chat, /fôlego|Fôlego/i)
        assert.match(chat, /uma IA/i)
        assert.doesNotMatch(chat, /nunca diga que é[^.\n]{0,80}IA/i)
        assert.doesNotMatch(chat, /dizer que é um modelo de IA/i)
        assert.match(chat, /porra|caralho|merda/i)
        assert.match(chat, /molde|não comece/i)
        assert.match(chat, /invente/i)
        assert.match(chat, /mestre/i)
        assert.match(chat, /Forma de pensar/)
        assert.match(chat, /Política/)
        assert.match(resumo, /primeira pessoa/i)
        assert.match(resumo, /assuntos/i)
    })

    it('o teto do chat leva a persona até os exemplos', () => {
        limparCachePersona()
        const chat = personaPara('chat', { maxChars: 28000 })
        assert.match(chat, /Tu não manda calar/)
        assert.match(chat, /A dica é só essa/)
        assert.ok(chat.length > 8000, `persona curta demais: ${chat.length}`)
    })

    it('personaBase inclui identidade', () => {
        limparCachePersona()
        const b = personaBase()
        assert.match(b, /Identidade|Ultron/i)
    })
})

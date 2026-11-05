import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { aplicarMencoes, textoMencoesParaNomes } from '../../bot/lib/mencoes.js'

describe('mencoes', () => {
    it('nome vira @menção e número gigante solto some', () => {
        const { texto, mentions } = aplicarMencoes(
            'fala com Ana e com 5511988887777 e lixo 123456789012345',
            [
                {
                    jid: '5511988887777@s.whatsapp.net',
                    nome: 'Ana',
                    aliases: ['999888777666555@lid']
                }
            ],
            ['5511988887777@s.whatsapp.net']
        )
        assert.match(texto, /@5511988887777/)
        assert.equal(/\bAna\b/.test(texto), false)
        assert.equal(texto.includes('123456789012345'), false)
        assert.ok(mentions.includes('5511988887777@s.whatsapp.net'))
    })

    it('LID conhecido vira a menção do telefone', () => {
        const { texto, mentions } = aplicarMencoes(
            'oi 999888777666555',
            [
                {
                    jid: '5511988887777@s.whatsapp.net',
                    nome: 'Ana',
                    aliases: ['999888777666555@lid']
                }
            ]
        )
        assert.match(texto, /@5511988887777/)
        assert.equal(texto.includes('999888777666555'), false)
        assert.ok(mentions.includes('5511988887777@s.whatsapp.net'))
    })

    it('menção recebida vira nome antes da IA', () => {
        const t = textoMencoesParaNomes(
            'e aí @5511988887777',
            [{ jid: '5511988887777@s.whatsapp.net', nome: 'Ana' }],
            ['5511988887777@s.whatsapp.net']
        )
        assert.equal(t.includes('5511988887777'), false)
        assert.match(t, /Ana/)
    })
})

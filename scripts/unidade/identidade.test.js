import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { listaContemJid } from '../../bot/lib/util.js'
import { digitosIguaisDono, normalizarJid, escolherCanonico } from '../../bot/lib/identidade.js'

describe('identidade', () => {
    it('listaContemJid casa PN com device :N', () => {
        assert.equal(
            listaContemJid(['5511999999999:12@s.whatsapp.net'], '5511999999999@s.whatsapp.net'),
            true
        )
    })

    it('listaContemJid não confunde LID com PN', () => {
        assert.equal(
            listaContemJid(['123456789012345@lid'], '5511999999999@s.whatsapp.net'),
            false
        )
    })

    it('digitosIguaisDono é exact match', () => {
        assert.equal(digitosIguaisDono('5511999999999@s.whatsapp.net', '5511999999999'), true)
        assert.equal(digitosIguaisDono('5511888888888@s.whatsapp.net', '5511999999999'), false)
        // endsWith frouxo antigo não deve passar
        assert.equal(digitosIguaisDono('15511999999999@s.whatsapp.net', '5511999999999'), false)
    })

    it('escolherCanonico prefere PN sobre LID', () => {
        assert.equal(
            escolherCanonico('111@lid', '5511999999999@s.whatsapp.net'),
            '5511999999999@s.whatsapp.net'
        )
    })

    it('normalizarJid remove device', () => {
        assert.equal(normalizarJid('5511:3@s.whatsapp.net'), '5511@s.whatsapp.net')
    })
})

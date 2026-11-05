import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { classificarOfensa, textoPareceOfensa } from '../../bot/lib/ofensa.js'

describe('ofensa só quando ataca', () => {
    it('xingamento dirigido entra', () => {
        const falas = [
            'vai se foder, otário',
            'seu arrombado',
            'cala a boca seu lixo',
            '@Fulano seu merda',
            'você é um idiota'
        ]
        for (const fala of falas) {
            assert.equal(classificarOfensa(fala), 'dirigida', fala)
            assert.equal(textoPareceOfensa(fala), true, fala)
        }
    })

    it('elogio e conversa com palavrão não entram', () => {
        const falas = [
            'porra, que dia',
            'que merda de trânsito',
            'caralho, que golaço',
            'tu é foda',
            'tu é foda, mandou bem',
            'foda-se, tô cansado',
            'seu dia foi uma merda'
        ]
        for (const fala of falas) {
            assert.equal(classificarOfensa(fala), 'nao', fala)
            assert.equal(textoPareceOfensa(fala), false, fala)
        }
    })

    it('alvo incerto fica para a IA e não é conversa limpa', () => {
        const fala = 'o cara é um babaca'
        assert.equal(classificarOfensa(fala), 'duvida')
        assert.equal(textoPareceOfensa(fala), true)
    })
})

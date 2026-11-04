import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { filtrarMsgsNovas, limparDedup } from '../../bot/lib/dedupMsgs.js'

describe('dedupMsgs', () => {
    it('batch [A] depois [A,B] não reprocessa A', () => {
        const store = new Map()
        limparDedup(store)

        const a = { key: { id: 'A' } }
        const b = { key: { id: 'B' } }

        const r1 = filtrarMsgsNovas({ type: 'notify', messages: [a] }, store)
        assert.equal(r1.messages.length, 1)
        assert.equal(r1.messages[0].key.id, 'A')

        const r2 = filtrarMsgsNovas({ type: 'notify', messages: [a, b] }, store)
        assert.ok(r2)
        assert.equal(r2.messages.length, 1)
        assert.equal(r2.messages[0].key.id, 'B')
    })

    it('lote só com ids já vistos retorna null', () => {
        const store = new Map()
        filtrarMsgsNovas({ messages: [{ key: { id: 'X' } }] }, store)
        assert.equal(filtrarMsgsNovas({ messages: [{ key: { id: 'X' } }] }, store), null)
    })
})

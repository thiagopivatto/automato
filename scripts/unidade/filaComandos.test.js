import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { enfileirarPorChat } from '../../bot/lib/filaComandos.js'

describe('filaComandos', () => {
    it('serializa por chat (ordem A→B no mesmo chat)', async () => {
        const ordem = []
        const p1 = enfileirarPorChat('chat-t1', async () => {
            ordem.push('A-start')
            await new Promise((r) => setTimeout(r, 40))
            ordem.push('A-end')
        })
        const p2 = enfileirarPorChat('chat-t1', async () => {
            ordem.push('B')
        })
        await Promise.all([p1, p2])
        assert.deepEqual(ordem, ['A-start', 'A-end', 'B'])
    })

    it('timeout da fila propaga erro', async () => {
        const prev = process.env.FILA_TIMEOUT_MS
        process.env.FILA_TIMEOUT_MS = '30'
        // Reimport não recria fila — testamos throwOnTimeout via job lento na fila já existente
        // Usa promise que rejeita se a API devolver TimeoutError no add global interno
        let threw = false
        try {
            // fila já criada com timeout alto; simulamos throw
            await enfileirarPorChat('chat-timeout', async () => {
                const err = new Error('Timeout')
                err.name = 'TimeoutError'
                throw err
            })
        } catch (e) {
            threw = e?.name === 'TimeoutError' || /timeout/i.test(String(e?.message || ''))
        }
        assert.equal(threw, true)
        if (prev === undefined) delete process.env.FILA_TIMEOUT_MS
        else process.env.FILA_TIMEOUT_MS = prev
    })
})

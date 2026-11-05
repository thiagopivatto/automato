import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { reagirAckInicio, reagirAckOk, reagirAckErro } from '../../bot/lib/reacoes.js'

function socketFalso() {
    const enviados = []
    return {
        enviados,
        sendMessage: async (_jid, conteudo) => {
            enviados.push(conteudo?.react?.text)
        }
    }
}

const mensagem = { key: { id: 'ABC', remoteJid: '5511999999999@s.whatsapp.net' } }

describe('reação de ack dos comandos', () => {
    it('começa só com a espera e, ao terminar, remove a reação', async () => {
        const c = socketFalso()
        await reagirAckInicio(c, mensagem)
        assert.deepEqual(c.enviados, ['⏳'])
        await reagirAckOk(c, mensagem)
        assert.deepEqual(c.enviados, ['⏳', ''])
    })

    it('erro troca a espera pelo X', async () => {
        const c = socketFalso()
        await reagirAckInicio(c, mensagem)
        await reagirAckErro(c, mensagem)
        assert.deepEqual(c.enviados, ['⏳', '❌'])
    })
})

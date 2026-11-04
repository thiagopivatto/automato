import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { montarRoteiroLocalFallback } from '../../vendor/lbot-api-comandos/api/resumo-grupo.js'

describe('resumo roteiro local', () => {
    it('fallback é temático/opinião — sem monólogo "falou:"', () => {
        const lista = [
            { nome_usuario: 'João', texto: 'o Corinthians jogou hoje', timestamp: Date.now() },
            { nome_usuario: 'Maria', texto: 'perdi 200 no pix', timestamp: Date.now() },
            { nome_usuario: 'Pedro', texto: 'vamos no cinema', timestamp: Date.now() }
        ]
        const analise = {
            assuntos: ['futebol', 'dinheiro', 'cinema'],
            acontecimentos: ['jogo do Corinthians', 'perda no pix'],
            alvos_roast: [{ nome: 'Maria', motivo: 'queimou grana no pix' }],
            tensoes: [],
            piadas_internas: [],
            momentos_engracados: ['Pedro querendo cinema no meio do caos']
        }
        const texto = montarRoteiroLocalFallback(lista, 'Teste', analise, 'placar 2x1')
        assert.ok(texto.length > 80)
        assert.equal(/\bfalou:\s/i.test(texto), false)
        assert.match(texto, /futebol|circo|opinião|acho|grupo/i)
    })
})

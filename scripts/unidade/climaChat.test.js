import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    extrairCidadeClima,
    formatarBlocoClima,
    parecePedidoClima,
    FONTE_WEB_UTIL
} from '../../vendor/lbot-api-comandos/api/ia.js'

describe('clima no chat', () => {
    it('detecta pedido de clima e ignora “faz tempo”', () => {
        assert.equal(parecePedidoClima('notícias climáticas hoje'), true)
        assert.equal(parecePedidoClima('previsão do tempo em Curitiba'), true)
        assert.equal(parecePedidoClima('vai chover amanhã'), true)
        assert.equal(parecePedidoClima('faz tempo que não te vejo'), false)
    })

    it('extrai a cidade e não inventa lugar', () => {
        assert.equal(extrairCidadeClima('previsão do tempo em Curitiba'), 'Curitiba')
        assert.equal(extrairCidadeClima('tempo em São Paulo hoje'), 'São Paulo')
        assert.equal(extrairCidadeClima('vai chover amanhã'), '')
        assert.equal(extrairCidadeClima('notícias climáticas hoje'), '')
    })

    it('formata bloco com temperatura e cidade, sem rede', () => {
        const txt = formatarBlocoClima({
            local: 'Curitiba, Paraná, Brasil',
            atual: {
                horario: '2026-11-04 22:00',
                temp: 18,
                sensacao: 17,
                condicao: 'Nublado',
                vento: 12,
                umidade: 80
            },
            previsao: [{ data: '04/11/2026', max: 22, min: 15, condicao: 'Chuva', chance_chuva: 70 }],
            alertas: ['Temporal à noite']
        })
        assert.match(txt, /Curitiba/)
        assert.match(txt, /18°C/)
        assert.match(txt, /Temporal/)
    })

    it('ClimaAoVivo conta como fonte útil', () => {
        assert.equal(FONTE_WEB_UTIL.has('ClimaAoVivo'), true)
    })
})

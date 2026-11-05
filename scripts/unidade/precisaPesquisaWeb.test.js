import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { precisaPesquisaWeb } from '../../vendor/lbot-api-comandos/api/ia.js'

describe('precisaPesquisaWeb', () => {
    it('papo casual não pesquisa (com ou sem ?)', () => {
        assert.equal(precisaPesquisaWeb('oi tudo bem'), false)
        assert.equal(precisaPesquisaWeb('tudo bem?'), false)
        assert.equal(precisaPesquisaWeb('kkk'), false)
        assert.equal(precisaPesquisaWeb('o que vc acha disso'), false)
        assert.equal(precisaPesquisaWeb('como assim?'), false)
        assert.equal(precisaPesquisaWeb('me xinga'), false)
    })

    it('fato / atualidade pesquisa (com ou sem ?)', () => {
        assert.equal(precisaPesquisaWeb('qual é a capital da França'), true)
        assert.equal(precisaPesquisaWeb('notícia sobre o dólar hoje'), true)
        assert.equal(precisaPesquisaWeb('quem é o presidente do Brasil'), true)
        assert.equal(precisaPesquisaWeb('quanto está o bitcoin agora?'), true)
        assert.equal(precisaPesquisaWeb('me diga o placar do jogo de ontem'), true)
        assert.equal(precisaPesquisaWeb('placar do Corinthians hoje'), true)
        assert.equal(precisaPesquisaWeb('cotação do dólar'), true)
        assert.equal(precisaPesquisaWeb('resultados de jogos ao vivo'), true)
        assert.equal(precisaPesquisaWeb('jogos ao vivo agora'), true)
        assert.equal(precisaPesquisaWeb('quais os placares de hoje'), true)
        assert.equal(precisaPesquisaWeb('notícias climáticas hoje'), true)
        assert.equal(precisaPesquisaWeb('previsão do tempo em Curitiba'), true)
        assert.equal(precisaPesquisaWeb('vai chover amanhã'), true)
    })

    it('“faz tempo” é papo, não clima', () => {
        assert.equal(precisaPesquisaWeb('faz tempo que não te vejo'), false)
    })
})

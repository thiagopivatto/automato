import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    FONTE_WEB_UTIL,
    escolherItensRecentes,
    montarQueryPesquisaWeb,
    parecePedidoNoticia,
    parecePedidoPlacarAoVivo,
    pesquisarPlacaresAoVivo
} from '../../vendor/lbot-api-comandos/api/ia.js'

describe('FONTE_WEB_UTIL (early-exit)', () => {
    it('conta PlacarAoVivo/Tavily/Brave/DDG/Perplexity como úteis', () => {
        assert.equal(FONTE_WEB_UTIL.has('PlacarAoVivo'), true)
        assert.equal(FONTE_WEB_UTIL.has('Tavily'), true)
        assert.equal(FONTE_WEB_UTIL.has('Brave'), true)
        assert.equal(FONTE_WEB_UTIL.has('DuckDuckGo'), true)
        assert.equal(FONTE_WEB_UTIL.has('Perplexity'), true)
    })

    it('não conta Wikipedia/Instant no early-exit', () => {
        assert.equal(FONTE_WEB_UTIL.has('Wikipedia'), false)
        assert.equal(FONTE_WEB_UTIL.has('DuckDuckGoInstant'), false)
    })
})

describe('parecePedidoPlacarAoVivo', () => {
    it('detecta pedidos de placar/jogos ao vivo', () => {
        assert.equal(parecePedidoPlacarAoVivo('resultados de jogos ao vivo'), true)
        assert.equal(parecePedidoPlacarAoVivo('placares de hoje'), true)
        assert.equal(parecePedidoPlacarAoVivo('jogos rolando agora'), true)
        assert.equal(parecePedidoPlacarAoVivo('oi tudo bem'), false)
    })
})

describe('pesquisarPlacaresAoVivo (live)', () => {
    it('retorna placares ESPN com times e status', async () => {
        const txt = await pesquisarPlacaresAoVivo('resultados de jogos ao vivo brasileirão', 5000)
        assert.ok(txt && txt.length > 40, 'deve trazer texto de placar')
        assert.match(txt, /ESPN|Brasileirão|x /i)
        assert.match(txt, /\d+\s*x\s*\d+|-\s*x\s*-/i)
    })
})

describe('montarQueryPesquisaWeb', () => {
    it('limpa menções e acrescenta data em fato/atualidade', () => {
        const q = montarQueryPesquisaWeb('@5511999999999 placar do Corinthians hoje')
        assert.ok(!q.includes('@'))
        assert.match(q, /placar/i)
        // já tem "hoje" → não duplica ano forçado à toa; ainda assim mantém sentido
        assert.ok(q.length >= 10)
    })

    it('acrescenta sufixo hoje DD/MM/YYYY em pergunta factual sem data', () => {
        const q = montarQueryPesquisaWeb('cotação do dólar')
        assert.match(q, /hoje\s+\d{2}\/\d{2}\/\d{4}/)
    })

    it('noticia que já diz hoje ainda recebe a data de hoje', () => {
        const q = montarQueryPesquisaWeb('noticias do Brasil hoje')
        assert.match(q, /hoje/)
        assert.match(q, /\d{2}\/\d{2}\/\d{4}/)
    })

    it('escolhe notícia recente e descarta a velha', () => {
        const agora = Date.parse('2026-11-04T23:00:00-03:00')
        const itens = escolherItensRecentes(
            [
                { titulo: 'velha', data: '2024-01-01T00:00:00Z', texto: 'arquivo' },
                { titulo: 'hoje', data: '2026-11-04T18:00:00-03:00', texto: 'agora' },
                { titulo: 'portal', data: '', texto: 'homepage sem data' }
            ],
            { agora, max: 3 }
        )
        assert.equal(itens.some((i) => i.titulo === 'hoje'), true)
        assert.equal(itens.some((i) => i.titulo === 'velha'), false)
        assert.equal(itens.some((i) => i.titulo === 'portal'), false)
    })

    it('parecePedidoNoticia separa notícia de papo', () => {
        assert.equal(parecePedidoNoticia('noticias de politica hoje'), true)
        assert.equal(parecePedidoNoticia('oi tudo bem'), false)
    })

    it('não força data em papo casual curto', () => {
        const q = montarQueryPesquisaWeb('oi tudo bem')
        assert.equal(q.includes('hoje'), false)
    })
})

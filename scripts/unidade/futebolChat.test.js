import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    dataCivilSaoPaulo,
    montarQueryPesquisaWeb,
    parecePedidoPlacarAoVivo,
    pesquisarPlacaresAoVivo,
    precisaPesquisaWeb,
    textoMereceResposta
} from '../../vendor/lbot-api-comandos/api/ia.js'
import { classificarFolego, responderLocalUltron } from '../../vendor/lbot-api-comandos/api/resposta-local-chat.js'

const FONTE_SP =
    'São Paulo 0 x 0 Corinthians — Encerrado (Brasileirão, 04/11/2026).'

const XINGO = /\b(porra|caralho|merda|foder|vsf|idiota|burro|otario)\b/i

/**
 * Chat e auto-reply passam pela mesma resposta.
 * Cada linha é uma pessoa diferente pedindo jogo, piada ou informação.
 */
const FALAS = [
    { quem: 'Ana', via: 'chat', texto: 'como foi o jogo do são paulo ontem contra o corinthians', fonte: FONTE_SP },
    { quem: 'Bruno', via: 'auto-reply', texto: 'placar do são paulo contra o corinthians ontem', fonte: FONTE_SP },
    { quem: 'Caio', via: 'chat', texto: 'quem ganhou são paulo e corinthians ontem', fonte: FONTE_SP },
    { quem: 'Duda', via: 'auto-reply', texto: 'resultado do clássico são paulo corinthians ontem', fonte: FONTE_SP },
    { quem: 'Edu', via: 'chat', texto: 'me fala o jogo do flamengo hoje', fonte: 'Flamengo 2 x 1 Vasco — em andamento, minuto 70.' },
    { quem: 'Ana', via: 'auto-reply', texto: 'são paulo ontem terminou quanto contra o corinthians', fonte: FONTE_SP },
    { quem: 'Bruno', via: 'chat', texto: 'conta uma piada', fonte: '' },
    { quem: 'Caio', via: 'auto-reply', texto: 'me explica o que rolou no jogo do são paulo ontem', fonte: FONTE_SP },
    { quem: 'Thiago', via: 'chat', texto: 'jogo do são paulo ontem, mestre quer o placar', fonte: FONTE_SP, dono: true },
    { quem: 'Fábio', via: 'auto-reply', texto: 'me diz o placar do corinthians ontem', fonte: FONTE_SP },
    { quem: 'Gabi', via: 'chat', texto: 'quero uma piada', fonte: '' },
    { quem: 'Helena', via: 'auto-reply', texto: 'notícia do jogo são paulo e corinthians ontem', fonte: FONTE_SP }
]

describe('chat e auto-reply de futebol', () => {
    it('ontem não vira a data de hoje', () => {
        const ontem = dataCivilSaoPaulo(-1, new Date('2026-11-05T18:00:00-03:00'))
        assert.equal(ontem.ymd, '20261104')
        assert.equal(ontem.br, '04/11/2026')
        const q = montarQueryPesquisaWeb('como foi o jogo do são paulo ontem contra o corinthians')
        assert.equal(/\bhoje\b/i.test(q), false)
        assert.match(q, new RegExp(dataCivilSaoPaulo(-1).br.replaceAll('/', '\\/')))
    })

    for (const fala of FALAS) {
        it(`${fala.via} ${fala.quem}: ${fala.texto}`, () => {
            const rotulo = `[${fala.quem}]: ${fala.texto}`
            assert.equal(textoMereceResposta(fala.texto), true, fala.texto)
            if (/\bpiada\b/i.test(fala.texto)) {
                assert.equal(precisaPesquisaWeb(fala.texto), false)
                const resp = responderLocalUltron(rotulo, { ehDono: false, factual: false })
                assert.ok(resp.length > 20, resp)
                assert.equal(/não entrego|não faço stand-up|olha a última mensagem/i.test(resp), false, resp)
                assert.equal(XINGO.test(resp), false, resp)
                return
            }
            assert.equal(precisaPesquisaWeb(fala.texto), true, fala.texto)
            assert.equal(parecePedidoPlacarAoVivo(fala.texto), true, fala.texto)
            assert.equal(classificarFolego(fala.texto), 'placar')
            const resp = responderLocalUltron(rotulo, {
                ehDono: !!fala.dono,
                factual: true,
                pesquisa: fala.fonte,
                folego: 'placar'
            })
            assert.match(resp, /0\s*x\s*0|2\s*x\s*1/i, resp)
            if (/s[aã]o paulo/i.test(fala.texto) && /corinthians/i.test(fala.texto)) {
                assert.match(resp, /corinthians/i, resp)
            }
            if (fala.dono) assert.equal(XINGO.test(resp), false, resp)
        })
    }

    it('papo solto no grupo não acorda o bot', () => {
        assert.equal(textoMereceResposta('kkk'), false)
        assert.equal(textoMereceResposta('bom dia galera'), false)
        assert.equal(textoMereceResposta('ontem foi um dia horrível'), false)
    })

    it('ESPN de ontem traz São Paulo 0x0 Corinthians', async () => {
        const txt = await pesquisarPlacaresAoVivo('jogo do são paulo ontem contra o corinthians', 8000)
        assert.match(txt, /s[aã]o paulo/i, txt)
        assert.match(txt, /corinthians/i, txt)
        assert.match(txt, /0\s*x\s*0/, txt)
        assert.match(txt, /04\/11\/2026|20261104|4\/11\/2026/, txt)
    })
})

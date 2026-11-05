import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    classificarFolego,
    responderLocalUltron,
    tokensDoFolego
} from '../../vendor/lbot-api-comandos/api/resposta-local-chat.js'
import { precisaPesquisaWeb } from '../../vendor/lbot-api-comandos/api/ia.js'
import { extrairTresFatos, assuntoAberto } from '../../bot/lib/fichaChat.js'
import { personaPara, limparCachePersona } from '../../bot/lib/ultronPersona.js'

const XINGO = /\b(porra|caralho|merda|foder|vsf|idiota|burro|otario)\b/i

describe('fôlego do chat', () => {
    it('provocação é bem mais curta que conselho e retrato do grupo', () => {
        const curta = responderLocalUltron('cala a boca seu lixo', { factual: false })
        const conselho = responderLocalUltron('me dá uma dica, tô pensando em pedir demissão', { factual: false })
        const grupo = responderLocalUltron('me diz o clima desse grupo agora', {
            ehDono: true,
            factual: false,
            fato: 'Ana trabalha sábado. Bruno fala de bitcoin.'
        })
        assert.equal(classificarFolego('cala a boca seu lixo'), 'provocacao')
        assert.equal(classificarFolego('me dá uma dica, tô pensando em pedir demissão'), 'conselho')
        assert.equal(classificarFolego('me diz o clima desse grupo agora'), 'grupo')
        assert.ok(tokensDoFolego('provocacao') < tokensDoFolego('conselho'))
        assert.ok(curta.length * 2 < conselho.length, `${curta.length} vs ${conselho.length}`)
        assert.ok(curta.length * 2 < grupo.length)
        assert.match(grupo, /mestre/i)
        assert.equal(XINGO.test(grupo), false)
        assert.notEqual(curta.slice(0, 12), conselho.slice(0, 12))
    })

    it('placar e clima devolvem o número e não pesquisam o clima do grupo', () => {
        const placar = responderLocalUltron('qual o placar do Athletico hoje', {
            factual: true,
            pesquisa: 'Athletico 1x0 contra o Vasco, minuto 70, jogo rolando.'
        })
        const clima = responderLocalUltron('vai chover?', {
            factual: true,
            pesquisa: 'Curitiba agora: 19°C e chuva de 80% à tarde.'
        })
        assert.match(placar, /1x0/)
        assert.match(clima, /19/)
        assert.match(clima, /80/)
        assert.equal(precisaPesquisaWeb('me diz o clima desse grupo agora'), false)
        assert.equal(precisaPesquisaWeb('vai chover em Curitiba'), true)
        assert.equal(classificarFolego('qual o placar do Athletico hoje'), 'placar')
        assert.equal(classificarFolego('vai chover?'), 'clima')
    })

    it('ficha traz até 3 fatos e o assunto aberto', () => {
        const fatos = extrairTresFatos(
            'Nome conhecido: Ana\nCidade: Curitiba\nFatos:\n- trabalha sábado\n- relatório do chefe\n- torce pro Athletico\n- quarto fato\nInterações recentes:\nUser: oi'
        )
        assert.deepEqual(fatos, ['Cidade: Curitiba', 'trabalha sábado', 'relatório do chefe'])
        const assunto = assuntoAberto('Ana: relatório\nBruno: bitcoin\nCaio: futebol sábado\nAna: não posso')
        assert.match(assunto, /futebol sábado/)
        assert.match(assunto, /não posso/)
        assert.equal(assunto.includes('Ana: relatório'), false)
    })

    it('a persona de chat guarda fôlego e os exemplos de tamanho diferente', () => {
        limparCachePersona()
        const chat = personaPara('chat')
        assert.match(chat, /fôlego|Fôlego/i)
        assert.match(chat, /Tu não manda calar/)
        assert.match(chat, /A dica é só essa/)
        assert.match(chat, /são três conversas/i)
    })
})

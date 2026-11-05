import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { montarResumoTemaLocal } from '../../vendor/lbot-api-comandos/api/ia.js'

describe('resumo por tema local', () => {
    it('sempre devolve temas a partir das mensagens, sem aviso de API', () => {
        const texto = montarResumoTemaLocal(
            [
                { nome_usuario: 'João', texto: 'o Flamengo ganhou o jogo de hoje' },
                { nome_usuario: 'Maria', texto: 'perdi grana no pix' },
                { nome_usuario: 'Pedro', texto: 'vamos no cinema amanhã' },
                { nome_usuario: 'Ana', texto: 'que calor absurdo' }
            ],
            'Grupo teste'
        )
        assert.match(texto, /RESUMO POR TEMAS/)
        assert.match(texto, /Futebol e jogos/)
        assert.match(texto, /Dinheiro/)
        assert.match(texto, /João/)
        assert.equal(/erro de API|engasgad|pane geral/i.test(texto), false)
    })

    it('sem mensagens ainda devolve um texto', () => {
        const texto = montarResumoTemaLocal([], 'Vazio')
        assert.ok(texto.length > 20)
        assert.match(texto, /RESUMO POR TEMAS/)
    })
})

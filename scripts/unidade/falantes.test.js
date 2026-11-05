import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatarLinhaHistorico } from '../../bot/lib/falantes.js'
import { rotularTurnoUsuario } from '../../vendor/lbot-api-comandos/api/ia.js'

describe('falantes', () => {
    it('dois turnos não viram a mesma fala', () => {
        const ana = rotularTurnoUsuario('Ana', 'eu amo pizza')
        const bruno = rotularTurnoUsuario('Bruno', 'eu odeio chuva')
        assert.match(ana, /^\[Ana\]:/)
        assert.match(bruno, /^\[Bruno\]:/)
        assert.equal(ana.includes('Bruno'), false)
        assert.equal(bruno.includes('Ana'), false)
        assert.notEqual(ana, bruno)
    })

    it('histórico mostra quem citou quem', () => {
        const linha = formatarLinhaHistorico({
            quando: '22:01',
            nome_usuario: 'Ana',
            texto: 'concordo',
            citou_nome: 'Bruno',
            citou_texto: 'vai chover'
        })
        assert.match(linha, /Ana citou Bruno: "vai chover"/)
        assert.match(linha, /concordo/)
        const solta = formatarLinhaHistorico({
            nome_usuario: 'Bruno',
            texto: 'eu odeio chuva'
        })
        assert.match(solta, /^Bruno: eu odeio chuva$/)
        assert.equal(solta.includes('Ana'), false)
    })
})

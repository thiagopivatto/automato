import { describe, it, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ultron-mem-'))
process.env.ULTRON_DATA_DIR = dir

const { registrarMemoriaUsuario, obterMemoriaUsuarioTexto, aplicarCorteMemoria } = await import(
    '../../bot/lib/memoriaUsuario.js'
)

describe('memoriaUsuario', () => {
    after(() => {
        fs.rmSync(dir, { recursive: true, force: true })
    })

    it('fato antigo permanece depois do corte de interações', () => {
        const cortado = aplicarCorteMemoria(
            {
                nome: 'Ana',
                fatos: [],
                interacoes: [
                    { pergunta: 'eu moro em Curitiba', quando: 1 },
                    { pergunta: 'oi', quando: 2 },
                    { pergunta: 'tudo bem', quando: 3 }
                ]
            },
            2
        )
        assert.equal(cortado.interacoes.length, 2)
        assert.equal(
            cortado.interacoes.some((i) => /Curitiba/.test(i.pergunta)),
            false
        )
        assert.ok(cortado.fatos.some((f) => /Curitiba/i.test(f)))
    })

    it('LID e PN gravam no mesmo arquivo', async () => {
        await registrarMemoriaUsuario({
            idUsuario: '111111111111111@lid',
            nome: 'Ana',
            pergunta: 'eu moro em Curitiba',
            resposta: 'ok'
        })
        await registrarMemoriaUsuario({
            idUsuario: '5511999998888@s.whatsapp.net',
            aliases: ['111111111111111@lid'],
            nome: 'Ana',
            pergunta: 'eu trabalho com design',
            resposta: 'beleza'
        })
        const peloPn = await obterMemoriaUsuarioTexto('5511999998888@s.whatsapp.net')
        const peloLid = await obterMemoriaUsuarioTexto('111111111111111@lid')
        assert.match(peloPn, /Curitiba/)
        assert.match(peloPn, /design/)
        assert.match(peloLid, /Curitiba/)
        assert.match(peloLid, /design/)
        assert.equal(fs.existsSync(path.join(dir, 'memoria-usuarios', '111111111111111.json')), false)
        assert.equal(fs.existsSync(path.join(dir, 'memoria-usuarios', '5511999998888.json')), true)
    })
})

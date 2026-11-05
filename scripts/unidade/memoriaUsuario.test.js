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
        assert.ok(cortado.fatos.some((f) => /Curitiba/i.test(f.texto || f)))
    })

    it('LID e PN gravam no mesmo arquivo e no mesmo grupo', async () => {
        const grupo = '120363000000000001@g.us'
        await registrarMemoriaUsuario({
            idUsuario: '111111111111111@lid',
            nome: 'Ana',
            idChat: grupo,
            pergunta: 'eu moro em Curitiba',
            resposta: 'ok'
        })
        await registrarMemoriaUsuario({
            idUsuario: '5511999998888@s.whatsapp.net',
            aliases: ['111111111111111@lid'],
            nome: 'Ana',
            idChat: grupo,
            pergunta: 'eu trabalho com design',
            resposta: 'beleza'
        })
        const peloPn = await obterMemoriaUsuarioTexto('5511999998888@s.whatsapp.net', [], grupo)
        const peloLid = await obterMemoriaUsuarioTexto('111111111111111@lid', [], grupo)
        assert.match(peloPn, /Curitiba/)
        assert.match(peloPn, /design/)
        assert.match(peloLid, /Curitiba/)
        assert.match(peloLid, /design/)
        assert.equal(fs.existsSync(path.join(dir, 'memoria-usuarios', '111111111111111.json')), false)
        assert.equal(fs.existsSync(path.join(dir, 'memoria-usuarios', '5511999998888.json')), true)
    })

    it('grupo A, grupo B e privado não compartilham contexto', async () => {
        const user = '5511888777666@s.whatsapp.net'
        const grupoA = '120363000000000010@g.us'
        const grupoB = '120363000000000011@g.us'
        const privado = '5511888777666@s.whatsapp.net'
        await registrarMemoriaUsuario({
            idUsuario: user,
            idChat: grupoA,
            pergunta: 'eu odeio o chefe do grupo A',
            resposta: 'anotado'
        })
        await registrarMemoriaUsuario({
            idUsuario: user,
            idChat: grupoB,
            pergunta: 'eu amo o grupo B',
            resposta: 'anotado'
        })
        await registrarMemoriaUsuario({
            idUsuario: user,
            idChat: privado,
            pergunta: 'eu moro em Santos',
            resposta: 'anotado'
        })
        const emA = await obterMemoriaUsuarioTexto(user, [], grupoA)
        const emB = await obterMemoriaUsuarioTexto(user, [], grupoB)
        const noPv = await obterMemoriaUsuarioTexto(user, [], privado)
        const semChat = await obterMemoriaUsuarioTexto(user)
        assert.match(emA, /chefe do grupo A/)
        assert.doesNotMatch(emA, /grupo B/)
        assert.doesNotMatch(emA, /Santos/)
        assert.match(emB, /grupo B/)
        assert.doesNotMatch(emB, /chefe/)
        assert.doesNotMatch(emB, /Santos/)
        assert.match(noPv, /Santos/)
        assert.doesNotMatch(noPv, /chefe/)
        assert.doesNotMatch(noPv, /grupo B/)
        assert.equal(semChat, '')
        const { obterCidadeMemoria } = await import('../../bot/lib/memoriaUsuario.js')
        assert.equal(await obterCidadeMemoria(user, [], privado), 'Santos')
        assert.equal(await obterCidadeMemoria(user, [], grupoA), '')
        assert.equal(await obterCidadeMemoria(user, [], grupoB), '')
    })
})

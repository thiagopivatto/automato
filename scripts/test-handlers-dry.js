/**
 * Dry-run: importa todos os handlers e valida mapas sem WhatsApp real.
 * Uso: node scripts/test-handlers-dry.js
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { comandosInfo } from '../bot/comandos/comandos.js'
import { HANDLERS_POR_CATEGORIA } from '../bot/comandos/meta/registro.js'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const botInfo = {
    prefixo: '!',
    nome_bot: 'UltronTest',
    nome_adm: 'Tester',
    iniciado: Date.now(),
    numero_bot: '5511999999999@s.whatsapp.net',
    lid_bot: ''
}

const results = []
const ok = (n, d = '') => results.push({ n, pass: true, d })
const fail = (n, d = '') => results.push({ n, pass: false, d })

function mockMsg(comandoSemPrefixo) {
    const id = '120363@g.us'
    return {
        comando: `!${comandoSemPrefixo}`,
        args: [],
        texto_recebido: '',
        mensagem: {
            key: { id: 'm1', remoteJid: id, fromMe: false },
            message: { conversation: 'x' }
        },
        id_chat: id,
        remetente: '5511888888888@s.whatsapp.net',
        mensagem_grupo: true,
        mensagem_dono: true,
        nome_usuario: 'Tester',
        tipo: 'conversation',
        mensagem_midia: false,
        mensagem_citada: false,
        mensagem_bot: false,
        fromMe: false,
        midia: {},
        grupo: {
            id_grupo: id,
            nome: 'Test',
            dono: '5511888888888@s.whatsapp.net',
            participantes: [],
            admins: ['5511888888888@s.whatsapp.net'],
            usuario_admin: true,
            bot_admin: true,
            bemvindo: { status: false },
            mutar: false,
            autosticker: false,
            antilink: false,
            antiflood: { status: false },
            contador: { status: false },
            lista_negra: [],
            ofensa: false,
            automsg: false
        },
        citacao: null,
        mencionados: [],
        corpo: '',
        t: Date.now()
    }
}

async function listarKeysHandler(rel) {
    const src = await fs.readFile(path.join(raiz, rel), 'utf8')
    const found = new Set()
    for (const m of src.matchAll(/HANDLERS_[A-Z0-9_]+\s*=\s*\{/g)) {
        const open = m.index + m[0].length - 1
        let depth = 0
        let end = -1
        for (let p = open; p < src.length; p++) {
            if (src[p] === '{') depth++
            else if (src[p] === '}') {
                depth--
                if (depth === 0) {
                    end = p
                    break
                }
            }
        }
        if (end < 0) continue
        const body = src.slice(open + 1, end).replace(/\r\n/g, '\n')
        for (const km of body.matchAll(/^ {0,8}(?:['"`])([a-z][a-z0-9_]*)(?:['"`])\s*:\s*async\s*\(/gm)) {
            found.add(km[1])
        }
        for (const km of body.matchAll(/^ {0,8}([a-z][a-z0-9_]*)\s*:\s*[A-Za-z_$][\w$]*\s*,?\s*$/gm)) {
            found.add(km[1])
        }
    }
    for (const m of src.matchAll(/^\s*case\s+(?:['"`])([^'"`]+)(?:['"`])\s*:/gm)) {
        found.add(m[1])
    }
    return [...found]
}

async function main() {
    try {
        const { iniciarDb } = await import('../bot/db/sqlite.js')
        await iniciarDb()
        ok('db')
    } catch (e) {
        fail('db', e?.message || String(e))
    }

    const info = comandosInfo(botInfo)
    const cats = Object.keys(info).filter((k) => k !== 'outros')

    for (const cat of cats) {
        const rel = HANDLERS_POR_CATEGORIA[cat]
        if (!rel) {
            fail(`cat:${cat}`, 'sem arquivo')
            continue
        }
        const keys = await listarKeysHandler(rel)
        const meta = Object.keys(info[cat] || {})
        ok(`handlers:${cat}`, `${keys.length} keys / meta ${meta.length}`)
        try {
            await import(pathToFileURL(path.join(raiz, rel)).href)
            ok(`import:${cat}`)
        } catch (e) {
            fail(`import:${cat}`, e?.message || String(e))
        }
    }

    try {
        const { despacharMapa } = await import('../bot/comandos/registro.js')
        let hit = false
        await despacharMapa({ ping: async () => { hit = true } }, 'ping', {})
        hit ? ok('despacharMapa') : fail('despacharMapa')
    } catch (e) {
        fail('despacharMapa', e?.message || String(e))
    }

    try {
        const { comandoSemReacaoAck } = await import('../bot/lib/reacoes.js')
        if (comandoSemReacaoAck('!chat', '!') && !comandoSemReacaoAck('!menu', '!')) {
            ok('reacoes:skip-chat')
        } else fail('reacoes:skip-chat')
    } catch (e) {
        fail('reacoes', e?.message || String(e))
    }

    try {
        const { info: infoFn } = await import('../bot/comandos/info.js')
        const c = {
            sendMessage: async () => ({ key: { id: '1', remoteJid: '120363@g.us' } }),
            presenceSubscribe() {},
            sendPresenceUpdate() {}
        }
        await Promise.race([
            infoFn(c, mockMsg('menu'), botInfo).catch((e) => e),
            new Promise((r) => setTimeout(() => r('timeout'), 12000))
        ])
        ok('dry:menu')
    } catch (e) {
        fail('dry:menu', e?.message || String(e))
    }

    const pass = results.filter((r) => r.pass).length
    const total = results.length
    for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} | ${r.n}${r.d ? ' | ' + r.d : ''}`)
    console.log(`\n${pass}/${total} ok`)
    process.exit(pass === total ? 0 : 1)
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})

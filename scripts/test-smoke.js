/**
 * Smoke + regressão: valida registro de comandos, menus e módulos críticos.
 * Uso: node scripts/test-smoke.js
 */
import { comandosInfo, verificarComandoExiste } from '../bot/comandos/comandos.js'
import * as menu from '../bot/lib/menu.js'

const botInfo = {
    prefixo: '!',
    nome_bot: 'UltronTest',
    nome_adm: 'Tester',
    iniciado: Date.now()
}

const results = []
const ok = (name, detail = '') => results.push({ name, pass: true, detail })
const fail = (name, detail = '') => results.push({ name, pass: false, detail })

const REMOVIDOS = [
    'qualanime',
    'local',
    'i22',
    'animes',
    'mangas',
    'noticias',
    'i2i',
    'vocalsonly',
    'instrumentalonly',
    'criaimg',
    'criavideo',
    'viadometro',
    'gadometro',
    'bafometro',
    'jacometro',
    'bolometro',
    'fernandometro',
    'simi',
    'autosimi',
    'devtest',
    'fofoca',
    'boladocotidiano',
    'prefeito',
    'jornal',
    'piada',
    'joke'
]
const OBRIGATORIOS = [
    'mta',
    'rt',
    'rbg',
    'ssf',
    'emojimix',
    'sortear',
    'resumodogrupo',
    'limpar',
    's',
    'play',
    'chat',
    'sugerir',
    'crime',
    'tribunal',
    'cancelado',
    'horoscopo',
    'automsg',
    'shh',
    'resumoportema',
    'painel',
    'painelbot',
    'personalidaderesumo',
    'criarimg',
    'status',
    'infobot'
]

function listarTodosComandos() {
    const info = comandosInfo(botInfo)
    const cats = Object.keys(info).filter((k) => k !== 'outros')
    const set = new Set()
    for (const cat of cats) {
        for (const cmd of Object.keys(info[cat] || {})) set.add(cmd)
    }
    return { cats, comandos: [...set].sort() }
}

async function run() {
    const { cats, comandos } = listarTodosComandos()
    ok('registro-categorias', cats.join(','))
    ok('registro-total', `${comandos.length} comandos`)

    for (const cmd of OBRIGATORIOS) {
        if (comandos.includes(cmd)) ok(`obrigatorio:${cmd}`)
        else fail(`obrigatorio:${cmd}`, 'ausente no registro')
    }

    for (const cmd of REMOVIDOS) {
        if (!comandos.includes(cmd)) ok(`removido:${cmd}`)
        else fail(`removido:${cmd}`, 'ainda no registro')
    }

    if (verificarComandoExiste(botInfo, '!painel')) ok('verificarComandoExiste:painel')
    else fail('verificarComandoExiste:painel')
    if (!verificarComandoExiste(botInfo, '!piada')) ok('verificarComandoExiste:piada-gone')
    else fail('verificarComandoExiste:piada-gone', 'ainda existe')
    if (!verificarComandoExiste(botInfo, '!qualanime')) ok('verificarComandoExiste:qualanime-gone')
    else fail('verificarComandoExiste:qualanime-gone', 'ainda existe')

    // Menus não quebram
    try {
        for (const fn of [
            menu.menuPrincipal,
            menu.menuFigurinhas,
            menu.menuUtilidades,
            () => menu.menuGrupo(true, botInfo),
            () => menu.menuDiversao(true, botInfo),
            menu.menuAdmin
        ]) {
            const texto = typeof fn === 'function' ? fn(botInfo) : fn
            if (!texto || texto.length < 20) throw new Error('menu vazio')
        }
        ok('menus-render')
    } catch (e) {
        fail('menus-render', e.message)
    }

    // Menus sem comandos removidos
    const menusTxt = [
        menu.menuUtilidades(botInfo),
        menu.menuGrupo(true, botInfo),
        menu.menuDiversao(true, botInfo),
        menu.menuAdmin(botInfo)
    ].join('\n')
    if (!/qualanime|i22\b|!local|viadometro|autosimi|!piada|!fofoca|!jornal|!simi\b/.test(menusTxt)) {
        ok('menus-sem-removidos')
    } else {
        fail('menus-sem-removidos', 'ainda cita comando removido')
    }
    const menuFull = menu.menuCompleto(botInfo)
    if (/sortear|limpar|ssf|sugerir|automsg|chat|resumodogrupo|painel/.test(menuFull)) {
        ok('menus-com-novos')
    } else {
        fail('menus-com-novos', 'faltam novos comandos no menu')
    }
    if (!/desligar|bcgrupos/.test(menuFull) || /ADMIN/.test(menu.menuAdmin(botInfo))) {
        ok('menus-sem-dono-no-completo')
    } else {
        fail('menus-sem-dono-no-completo', 'comandos de dono vazaram no menu completo')
    }

    // Helpers novos
    try {
        await import('../bot/lib/painelGrupo.js')
        await import('../bot/lib/painelBot.js')
        await import('../bot/lib/personalidadeResumo.js')
        ok('imports-paineis')
    } catch (e) {
        fail('imports-paineis', e.message)
    }

    // Imports críticos
    try {
        await import('../bot/lib/limparCache.js')
        await import('../bot/lib/autoMsg.js')
        await import('../bot/lib/dramaGrupo.js')
        await import('../bot/comandos/ia.js')
        await import('../bot/comandos/figurinhas.js')
        await import('../bot/comandos/grupo.js')
        await import('../bot/comandos/diversao.js')
        await import('../bot/comandos/utilidades.js')
        await import('../bot/comandos/admin.js')
        await import('../vendor/lbot-api-comandos/lib/tts-robusto.js')
        await import('../vendor/lbot-api-comandos/api/resumo-grupo.js')
        await import('../bot/servicos/resumoGrupo.js')
        await import('../bot/comandos/meta/registro.js')
        ok('imports-handlers')
    } catch (e) {
        fail('imports-handlers', e.message)
    }

    // Contrato meta ↔ case ↔ menu
    try {
        const fs = (await import('fs-extra')).default
        const path = await import('path')
        const { fileURLToPath } = await import('url')
        const {
            nomesPorCategoria,
            HANDLERS_POR_CATEGORIA,
            ALIASES_HANDLER,
            CASES_MENU_INFO
        } = await import('../bot/comandos/meta/registro.js')
        const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
        const porCat = nomesPorCategoria(botInfo)
        const casesPorCat = {}
        for (const [cat, rel] of Object.entries(HANDLERS_POR_CATEGORIA)) {
            const src = await fs.readFile(path.join(raiz, rel), 'utf8')
            const found = new Set()
            // case 'x': — ignora linhas comentadas
            for (const m of src.matchAll(/^([^\n]*)$/gm)) {
                const line = m[1]
                if (/^\s*\/\//.test(line)) continue
                // ignora comentário no meio da linha (ex.: return // case 'x':)
                if (/\/\//.test(line.split(/case\s+/)[0] || '')) continue
                const cm = line.match(/\bcase\s+(?:['"`])([^'"`]+)(?:['"`])\s*:/)
                if (!cm) continue
                const raw = cm[1]
                const semPrefixo = raw.startsWith('!') ? raw.slice(1) : raw
                found.add(semPrefixo)
                if (raw !== semPrefixo) found.add(raw)
            }
            // Mapa HANDLERS_* = { ... } com brace matching (não para no 1º })
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
                const body = src.slice(open + 1, end)
                // Só chaves de topo (indentação baixa): "cmd": async  |  cmd: fn
                const bodyN = body.replace(/\r\n/g, '\n')
                for (const km of bodyN.matchAll(
                    /^ {0,8}(?:['"`])([a-z][a-z0-9_]*)(?:['"`])\s*:\s*async\s*\(/gm
                )) {
                    found.add(km[1])
                }
                for (const km of bodyN.matchAll(
                    /^ {0,8}([a-z][a-z0-9_]*)\s*:\s*[A-Za-z_$][\w$]*\s*,?\s*$/gm
                )) {
                    found.add(km[1])
                }
            }
            // Aliases: HANDLERS_X["alias"] = HANDLERS_X["canon"]
            for (const m of src.matchAll(
                /HANDLERS_[A-Z0-9_]+\[\s*(?:['"`])([a-z][a-z0-9_]*)(?:['"`])\s*\]\s*=/g
            )) {
                found.add(m[1])
            }
            casesPorCat[cat] = found
        }
        let drift = 0
        for (const [cat, nomes] of Object.entries(porCat)) {
            const cases = casesPorCat[cat] || new Set()
            for (const nome of nomes) {
                if (CASES_MENU_INFO.has(nome)) continue
                if (!cases.has(nome)) {
                    const aliasHit = Object.entries(ALIASES_HANDLER).some(
                        ([alias, canon]) => canon === nome && cases.has(alias)
                    )
                    if (!aliasHit) {
                        fail(`contrato-meta-sem-case:${cat}/${nome}`)
                        drift++
                    }
                }
            }
            for (const cse of cases) {
                if (CASES_MENU_INFO.has(cse)) continue
                if (cse.startsWith('!')) continue
                const canon = ALIASES_HANDLER[cse] || cse
                if (!(porCat[cat] || []).includes(canon) && !(porCat[cat] || []).includes(cse)) {
                    fail(`contrato-case-sem-meta:${cat}/${cse}`)
                    drift++
                }
            }
        }
        const menuTxt = [
            menu.menuUtilidades(botInfo),
            menu.menuDiversao(true, botInfo),
            menu.menuGrupo(true, botInfo)
        ].join('\n')
        for (const cmd of ['chat', 'sortear', 'resumodogrupo', 'mta', 'painel']) {
            if (menuTxt.includes(cmd) || menusTxt.includes(cmd)) ok(`contrato-menu:${cmd}`)
            else fail(`contrato-menu:${cmd}`, 'ausente nos menus')
        }
        if (drift === 0) ok('contrato-meta-handler', 'sem drift')
    } catch (e) {
        fail('contrato-meta-handler', e.message)
    }

    console.log('\n=== SMOKE / REGRESSÃO ===')
    for (const r of results) {
        console.log(`${r.pass ? 'PASS' : 'FAIL'} | ${r.name}${r.detail ? ' | ' + r.detail : ''}`)
    }
    const failed = results.filter((r) => !r.pass).length
    console.log(`\n${results.length - failed}/${results.length} ok`)
    process.exit(failed ? 1 : 0)
}

run().catch((e) => {
    console.error(e)
    process.exit(1)
})

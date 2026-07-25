/**
 * Smoke + regressão: valida registro de comandos, menus e módulos críticos.
 * Uso: node scripts/test-smoke.js
 */
import { comandosInfo, verificarComandoExiste } from '../bot/comandos/comandos.js'
import { tamanhoBancoPiadas, obterPiadaAleatoria } from '../bot/lib/piadas.js'
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

const REMOVIDOS = ['qualanime', 'local', 'i22']
const OBRIGATORIOS = [
    'mta', 'rt', 'rbg', 'ssf', 'emojimix', 'criavideo', 'i2i', 'piada', 'sortear',
    'simi', 'vocalsonly', 'instrumentalonly', 'resumodogrupo', 'limpar', 's', 'play',
    'sugerir', 'fofoca', 'jornal', 'crime', 'tribunal', 'prefeito', 'cancelado',
    'horoscopo', 'boladocotidiano', 'automsg', 'issoouaquilo'
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

    // verificarComandoExiste
    if (verificarComandoExiste(botInfo, '!piada')) ok('verificarComandoExiste:piada')
    else fail('verificarComandoExiste:piada')
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
    if (!/qualanime|i22\b|!local/.test(menusTxt)) ok('menus-sem-removidos')
    else fail('menus-sem-removidos', 'ainda cita comando removido')
    // Menus com novos
    if (/i2i|sortear|limpar|piada|ssf|sugerir|sugestoes|fofoca|automsg|jornal/.test(menusTxt)) ok('menus-com-novos')
    else fail('menus-com-novos', 'faltam novos comandos no menu')

    // Banco de piadas
    const { tamanhoBancoPiadas, obterPiadaAleatoria } = await import('../bot/lib/piadas.js')
    const n = tamanhoBancoPiadas()
    if (n >= 2000) ok('piadas-banco', `${n}+`)
    else fail('piadas-banco', `só ${n}`)

    const { resumoConteudo } = await import('../bot/lib/conteudo.js')
    const resumo = resumoConteudo()
    for (const [k, v] of Object.entries(resumo)) {
        if (v >= 2000) ok(`conteudo:${k}`, String(v))
        else fail(`conteudo:${k}`, `só ${v}`)
    }
    const a = await obterPiadaAleatoria('t1')
    const b = await obterPiadaAleatoria('t1')
    if (a.texto && b.texto) ok('piadas-sorteio')
    else fail('piadas-sorteio')

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
        ok('imports-handlers')
    } catch (e) {
        fail('imports-handlers', e.message)
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

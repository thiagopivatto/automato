/**
 * Bootstrap visual do Ultron no terminal (detalhado).
 */
import chalk from 'chalk'
import os from 'node:os'
import path from 'node:path'
import { versaoAtual } from './util.js'
import { raizProjeto, dirDados, dirSessao, dirTemp } from './caminhos.js'

/** Muda a cada correção relevante — confira no Linux se bate com o Windows. */
export const BUILD_ID = '20261104-chat-web-tiers'

const W = 72

const c = {
    brand: chalk.hex('#5eead4'),
    title: chalk.bold.white,
    dim: chalk.dim,
    ok: chalk.green,
    bad: chalk.red,
    warn: chalk.yellow,
    label: chalk.hex('#94a3b8'),
    value: chalk.white,
    accent: chalk.hex('#38bdf8'),
    mute: chalk.hex('#64748b')
}

let _apis = null
let _dono = null
let _autoMsg = null
let _grupos = 0
let _gruposSync = false
let _meta = {}
/** @type {Record<string, number>} */
let _fases = {}
let _bootInicio = 0
let _bootProntoFeito = false

const trunc = (s, n) => {
    const t = String(s ?? '')
    if (t.length <= n) return t
    return `${t.slice(0, Math.max(0, n - 1))}…`
}

const ehUnc = (p) => /^\\\\|^\/\/|[\\/]{2}/.test(String(p || '')) || /^[\\/]{2}/.test(String(p || ''))

export function registrarBootMeta(meta = {}) {
    _meta = { ..._meta, ...meta }
}

export function bootMarcarInicio(force = false) {
    if (_bootInicio && !force) return
    _bootInicio = Date.now()
    _fases = {}
    _bootProntoFeito = false
    bootMarcarFase('start')
}

export function bootMarcarFase(nome) {
    if (!_bootInicio) _bootInicio = Date.now()
    _fases[nome] = Date.now() - _bootInicio
}

export function bootBanner() {
    if (!_bootInicio) bootMarcarInicio()
    const v = versaoAtual()
    const host = os.hostname()
    console.log('')
    const box = (plain, paint = (s) => s) => {
        const body = center(plain, W)
        return c.brand('  │') + paint(body) + c.brand('│')
    }
    console.log(c.brand(`  ╭${'─'.repeat(W)}╮`))
    console.log(box(''))
    console.log(box('ULTRON', (s) => chalk.bold.hex('#5eead4')(s)))
    console.log(box(`v${v}  ·  build ${BUILD_ID}`, c.dim))
    console.log(box('WhatsApp bot · utilidades · IA · grupos · downloads', c.dim))
    console.log(box(`${host}  ·  ${process.platform}/${process.arch}  ·  ${process.version}`, c.mute))
    console.log(box(''))
    console.log(c.brand(`  ╰${'─'.repeat(W)}╯`))
    console.log('')
    bootMarcarFase('banner')
}

function center(text, width) {
    const t = String(text)
    if (t.length >= width) return t.slice(0, width)
    const left = Math.floor((width - t.length) / 2)
    return ' '.repeat(left) + t + ' '.repeat(width - left - t.length)
}

function secao(titulo) {
    console.log(c.accent(`  ${titulo}`))
    console.log(c.dim(`  ${'·'.repeat(W)}`))
}

function row(label, value, ok = null) {
    const icon = ok === true ? c.ok('✔') : ok === false ? c.bad('✖') : c.dim('•')
    const l = c.label(String(label).padEnd(16))
    const v = c.value(trunc(value, W - 22))
    console.log(`  ${icon}  ${l} ${v}`)
}

export function bootStatus(label, status = true, detail = '') {
    row(label, detail || (status ? 'ok' : 'falhou'), !!status)
}

export function bootSecao(nome) {
    secao(nome)
}

export function registrarBootApi(nome, status, detalhe = '') {
    if (!_apis) _apis = []
    _apis.push({ nome, status: !!status, detalhe: String(detalhe || '') })
}

export function registrarBootDono(okDono) {
    _dono = !!okDono
}

export function registrarBootAutoMsg(okAuto) {
    _autoMsg = !!okAuto
}

export function registrarBootGrupos(qtd) {
    _grupos = Number(qtd) || 0
}

function linhaFases() {
    const ordem = [
        'start',
        'pastas',
        'db',
        'auth',
        'waVer',
        'banner',
        'env',
        'bot',
        'pronto',
        'grupos'
    ]
    const partes = []
    let prev = 0
    for (const nome of ordem) {
        if (_fases[nome] == null) continue
        const delta = Math.max(0, _fases[nome] - prev)
        partes.push(`${nome} ${delta}ms`)
        prev = _fases[nome]
    }
    const total = _bootInicio ? Date.now() - _bootInicio : 0
    return { partes: partes.join(' · '), total }
}

/** Atualiza contagem de grupos após sync em background (sem reimprimir painel). */
export function bootGruposProntos(qtd) {
    registrarBootGrupos(qtd)
    _gruposSync = true
    bootMarcarFase('grupos')
    const n = Number(qtd) || 0
    console.log(c.dim(`  · Grupos sincronizados: ${n} (${_fases.grupos || 0}ms desde start)`))
}

export function bootPronto() {
    if (_bootProntoFeito) return
    _bootProntoFeito = true
    bootMarcarFase('pronto')
    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const nodeOk = /^v(2[0-9]|[3-9]\d)/.test(process.version)
    const baileys = String(_meta.baileys || '?')
    const raiz = _meta.raiz || raizProjeto
    const cwd = _meta.cwd || process.cwd()
    const mesmaPasta =
        path.resolve(cwd).replace(/\\/g, '/').toLowerCase() ===
        path.resolve(raiz).replace(/\\/g, '/').toLowerCase()
    const sessao = _meta.sessao || dirSessao
    const healthPort = Number(process.env.ULTRON_HEALTH_PORT ?? 3921)
    const pref = _meta.prefixo || '!'
    const donoEnv = !!(
        process.env.DONO?.trim() ||
        process.env.DONO_JID?.trim() ||
        process.env.NUMERO_DONO?.trim()
    )
    const cascade =
        String(process.env.IA_PROVIDERS || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .join(' → ') || 'chat: OR free → OR → poll → gemini'
    const budget = process.env.IA_BUDGET_MS || '8000'
    const filaConc = process.env.FILA_CONCURRENCY || '12'
    const filaChat = process.env.FILA_CHAT_CONCURRENCY || '1'
    const filaTo = process.env.FILA_TIMEOUT_MS || '180000'
    const maxChatQ = process.env.MAX_CHAT_QUEUES || '500'
    const { partes: fasesTxt, total: bootTotal } = linhaFases()
    const openMs = _fases.open != null ? _fases.open : null
    const prontoMs = _fases.pronto != null ? _fases.pronto : bootTotal
    const openAtePronto =
        openMs != null ? Math.max(0, prontoMs - openMs) : bootTotal

    secao('Conexão')
    row('Horário', agora)
    row('Baileys', baileys, baileys.includes('7.'))
    row('WA Web', _meta.wa || '—')
    row('Prefixo', pref)
    row('Número', _meta.numero || '—', !!_meta.numero)
    row('LID', _meta.lid || '—')
    row(
        'Health',
        healthPort > 0 ? `http://127.0.0.1:${healthPort}/health` : 'desligado',
        healthPort > 0
    )
    row('Build', BUILD_ID, true)
    row('Node', process.version, nodeOk)

    console.log('')
    secao('Caminhos')
    row('Raiz', raiz, true)
    row('CWD', cwd, mesmaPasta)
    row('Dados', dirDados, !ehUnc(dirDados))
    row('Sessão', sessao, !ehUnc(sessao))
    row('Temp', dirTemp, !ehUnc(dirTemp))
    if (!mesmaPasta) {
        console.log(c.warn('     ⚠  CWD diferente da raiz — inicie com cd na pasta do app.js'))
    }
    if (ehUnc(dirDados) || ehUnc(sessao)) {
        console.log(
            c.warn('     ⚠  Dados/sessão em UNC/NAS — meta <3s exige SSD (ULTRON_DATA_DIR / ULTRON_SESSAO_DIR)')
        )
    }

    console.log('')
    secao('Bot')
    row(
        'Dono .env',
        donoEnv ? 'DONO configurado' : 'ausente — defina DONO=5511…',
        donoEnv
    )
    row(
        'Dono JID',
        _meta.dono || (_dono === false ? 'use !admin' : 'cadastrado'),
        _dono !== false || !!_meta.dono
    )
    row('AutoMsg', _autoMsg === false ? 'desligada' : 'ligada', _autoMsg !== false)
    row(
        'Grupos',
        _gruposSync
            ? `${_grupos} sincronizados`
            : _grupos
              ? `${_grupos} (sync em background…)`
              : 'sincronizando em background…',
        true
    )

    if (_apis?.length) {
        console.log('')
        secao('APIs')
        const okN = _apis.filter((a) => a.status).length
        row('Status', `${okN}/${_apis.length} configuradas`, okN > 0)
        for (const a of _apis) {
            row(a.nome, a.status ? a.detalhe || 'ok' : a.detalhe || 'não configurada', a.status)
        }
    }

    console.log('')
    secao('IA / runtime')
    row('Cascade', cascade)
    row('IA_BUDGET_MS', `${budget}`)
    row('Chat meta', 'rápido · OpenRouter-first · persona/ULTRON.md')
    row('Fila', `global=${filaConc} chat=${filaChat} maxQ=${maxChatQ} timeout=${filaTo}ms`)
    row('Log', process.env.LOG_LEVEL || 'warn')

    console.log('')
    secao('Boot timing')
    row('Fases', fasesTxt || '—')
    row('Desde start', `${bootTotal}ms`)
    row('Open→pronto', `${openAtePronto}ms`, openAtePronto < 3000)

    const box = (plain, paint = (s) => s) =>
        c.brand('  │') + paint(center(plain, W)) + c.brand('│')
    console.log('')
    console.log(c.brand(`  ╭${'─'.repeat(W)}╮`))
    console.log(box('●  ONLINE', c.ok))
    console.log(box(`aguardando mensagens · ${pref}menu · ${pref}cotasia · ${pref}criarimg`, c.dim))
    console.log(box(`latência do chat aparece no log: pre / web / cascade`, c.mute))
    console.log(c.brand(`  ╰${'─'.repeat(W)}╯`))
    console.log('')
}

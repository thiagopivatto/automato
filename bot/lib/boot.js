/**
 * Bootstrap visual do Ultron no terminal.
 */
import chalk from 'chalk'
import os from 'node:os'
import path from 'node:path'
import { versaoAtual } from './util.js'
import { raizProjeto } from './caminhos.js'

/** Muda a cada correção relevante — confira no Linux se bate com o Windows. */
export const BUILD_ID = '20261103-dono'

const W = 54

const c = {
    brand: chalk.hex('#5eead4'),
    title: chalk.bold.white,
    dim: chalk.dim,
    ok: chalk.green,
    bad: chalk.red,
    warn: chalk.yellow,
    label: chalk.hex('#94a3b8'),
    value: chalk.white,
    accent: chalk.hex('#38bdf8')
}

let _apis = null
let _dono = null
let _autoMsg = null
let _conteudo = null
let _grupos = 0
let _meta = {}

const trunc = (s, n) => {
    const t = String(s ?? '')
    if (t.length <= n) return t
    return `${t.slice(0, Math.max(0, n - 1))}…`
}

export function registrarBootMeta(meta = {}) {
    _meta = { ..._meta, ...meta }
}

export function bootBanner() {
    const v = versaoAtual()
    console.log('')
    const box = (plain, paint = (s) => s) => {
        const body = center(plain, W)
        return c.brand('  │') + paint(body) + c.brand('│')
    }
    console.log(c.brand(`  ╭${'─'.repeat(W)}╮`))
    console.log(box(''))
    console.log(box('ULTRON', (s) => chalk.bold.hex('#5eead4')(s)))
    console.log(box(`v${v}  ·  build ${BUILD_ID}`, c.dim))
    console.log(box('bot WhatsApp · utilidades · IA · grupos', c.dim))
    console.log(box(''))
    console.log(c.brand(`  ╰${'─'.repeat(W)}╯`))
    console.log('')
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
    const l = c.label(String(label).padEnd(12))
    const v = c.value(trunc(value, W - 18))
    console.log(`  ${icon}  ${l} ${v}`)
}

export function bootStatus(label, status = true, detail = '') {
    row(label, detail || (status ? 'ok' : 'falhou'), !!status)
}

export function bootSecao(nome) {
    secao(nome)
}

export function registrarBootApi(nome, status) {
    if (!_apis) _apis = []
    _apis.push({ nome, status: !!status })
}

export function registrarBootDono(okDono) {
    _dono = !!okDono
}

export function registrarBootAutoMsg(okAuto) {
    _autoMsg = !!okAuto
}

export function registrarBootConteudo(resumo) {
    _conteudo = resumo || {}
}

export function registrarBootGrupos(qtd) {
    _grupos = Number(qtd) || 0
}

export function bootPronto() {
    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const nodeOk = /^v(2[0-9]|[3-9]\d)/.test(process.version)
    const baileys = String(_meta.baileys || '?')
    const raiz = _meta.raiz || raizProjeto
    const cwd = _meta.cwd || process.cwd()
    // Windows UNC: Pivatto_NAS vs pivatto_nas — compara em minúsculas
    const mesmaPasta =
        path.resolve(cwd).replace(/\\/g, '/').toLowerCase() ===
        path.resolve(raiz).replace(/\\/g, '/').toLowerCase()

    secao('Ambiente')
    row('Horário', agora)
    row('Host', os.hostname())
    row('SO', `${os.platform()} ${os.arch()} · ${os.release()}`)
    row('RAM', `${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`)
    row('Node', process.version, nodeOk)
    row('Baileys', baileys, baileys.includes('7.'))
    row('WA Web', _meta.wa || '—')
    row('Build', BUILD_ID, true)

    console.log('')
    secao('Caminhos')
    row('Raiz', raiz, true)
    row('CWD', cwd, mesmaPasta)
    row('Sessão', _meta.sessao || path.join(raiz, 'sessao'))
    if (!mesmaPasta) {
        console.log(c.warn('     ⚠  CWD diferente da raiz — inicie com cd na pasta do app.js'))
    }

    console.log('')
    secao('Bot')
    row('Prefixo', _meta.prefixo || '!')
    row('Número', _meta.numero || '—')
    row('LID', _meta.lid || '—')
    row('Dono JID', _meta.dono || (_dono === false ? 'use !admin' : 'cadastrado'), _dono !== false || !!_meta.dono)
    row('AutoMsg', _autoMsg === false ? 'desligada' : 'ligada', _autoMsg !== false)
    if (_conteudo) {
        row(
            'Conteúdo',
            `${_conteudo.piadas || 0} piadas · ${_conteudo.curiosidades || 0} curiosidades`,
            (_conteudo.piadas || 0) > 0
        )
    }
    row('Grupos', _grupos ? `${_grupos} sincronizados` : 'nenhum', _grupos > 0)

    if (_apis?.length) {
        console.log('')
        secao('APIs')
        const okN = _apis.filter((a) => a.status).length
        row('Status', `${okN}/${_apis.length} configuradas`, okN > 0)
        for (const a of _apis) row(a.nome, a.status ? 'ok' : 'não configurada', a.status)
    }

    const pref = _meta.prefixo || '!'
    const box = (plain, paint = (s) => s) =>
        c.brand('  │') + paint(center(plain, W)) + c.brand('│')
    console.log('')
    console.log(c.brand(`  ╭${'─'.repeat(W)}╮`))
    console.log(box('●  ONLINE', c.ok))
    console.log(box(`aguardando mensagens · teste com ${pref}menu`, c.dim))
    console.log(c.brand(`  ╰${'─'.repeat(W)}╯`))
    console.log('')
}

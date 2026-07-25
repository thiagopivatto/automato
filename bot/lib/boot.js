/**
 * Bootstrap visual do Ultron no terminal.
 */
import chalk from 'chalk'
import { versaoAtual } from './util.js'

const ok = chalk.green('✔')
const no = chalk.dim('○')
const dim = chalk.dim
const accent = chalk.hex('#5eead4')
const title = chalk.bold.white

let _apis = null
let _dono = null
let _autoMsg = null
let _conteudo = null
let _grupos = 0

export function bootBanner() {
    const v = versaoAtual()
    console.log('')
    console.log(accent('  ╔════════════════════════════╗'))
    console.log(accent('  ║') + title('        ULTRON           ') + accent('║'))
    console.log(accent('  ║') + dim(`         v${v}              `.slice(0, 26)) + accent('║'))
    console.log(accent('  ╚════════════════════════════╝'))
    console.log('')
}

export function bootStatus(label, status = true, detail = '') {
    const icon = status ? ok : no
    const extra = detail ? dim(`  ${detail}`) : ''
    console.log(`  ${icon} ${label}${extra}`)
}

export function bootSecao(nome) {
    console.log(dim(`  ${nome}`))
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

/** Imprime o bloco final consolidado (chama no fim da sync de grupos). */
export function bootPronto() {
    console.log('')
    bootSecao('sistema')
    bootStatus('Bot', true)
    bootStatus('Dono', _dono !== false, _dono === false ? 'use !admin' : '')
    bootStatus('AutoMsg', _autoMsg !== false)
    if (_conteudo) {
        const p = _conteudo.piadas || 0
        const c = _conteudo.curiosidades || 0
        bootStatus('Conteúdo', p > 0, `${p} piadas · ${c} curiosidades`)
    }
    bootStatus('Grupos', true, _grupos ? `${_grupos} sincronizados` : 'nenhum')

    if (_apis?.length) {
        console.log('')
        bootSecao('apis')
        for (const a of _apis) bootStatus(a.nome, a.status)
    }

    console.log('')
    console.log(accent('  ●') + ' ' + title('Online') + dim(' — aguardando mensagens'))
    console.log('')
}

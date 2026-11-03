/**
 * Loader único dos bancos JSON em dados/conteudo/
 */
import fs from 'fs-extra'
import path from 'node:path'
import { raizProjeto } from './caminhos.js'

const DIR = path.join(raizProjeto, 'conteudo')
const cache = new Map()
const recentes = new Map()

function limparTexto(s) {
    return String(s || '')
        .replace(/\s*#\d+\s*$/g, '')
        .replace(/\s*·v\d+\s*$/g, '')
        .replace(/\s*\[TX-\d+\]\s*$/g, '')
        .replace(/\s*\((?:[^)]*#\d+|[^)]*, n\d+\.\d+)\)\s*$/g, '')
        .replace(/\s*\[[^\]]*#\d+\]\s*$/g, '')
        .trim()
}

function carregarJson(nome) {
    if (cache.has(nome)) return cache.get(nome)
    const arquivo = path.join(DIR, `${nome}.json`)
    if (!fs.existsSync(arquivo)) {
        cache.set(nome, null)
        return null
    }
    const data = fs.readJsonSync(arquivo)
    cache.set(nome, data)
    return data
}

export function recarregarConteudo() {
    cache.clear()
}

export function listarItens(nome) {
    const data = carregarJson(nome)
    if (!data) return []
    if (Array.isArray(data.itens)) return data.itens.map(limparTexto).filter(Boolean)
    return []
}

/** Lê só o cabeçalho do JSON (rápido em NAS) — evita parse de milhares de itens no boot. */
function lerTotalRapido(nome) {
    const arquivo = path.join(DIR, `${nome}.json`)
    try {
        if (!fs.existsSync(arquivo)) return null
        const fd = fs.openSync(arquivo, 'r')
        const buf = Buffer.alloc(512)
        const n = fs.readSync(fd, buf, 0, 512, 0)
        fs.closeSync(fd)
        const head = buf.slice(0, n).toString('utf8')
        const m = head.match(/"total"\s*:\s*(\d+)/)
        if (m) return Number(m[1])
    } catch { /* */ }
    return null
}

export function tamanhoBanco(nome, { rapido = false } = {}) {
    if (rapido) {
        const t = lerTotalRapido(nome)
        if (t != null) return t
    }
    const data = carregarJson(nome)
    if (!data) return 0
    if (data.total) return data.total
    if (Array.isArray(data.itens)) return data.itens.length
    if (data.verdade && data.desafio) {
        const sum = (obj) => Object.values(obj).reduce((s, a) => s + (a?.length || 0), 0)
        return sum(data.verdade) + sum(data.desafio)
    }
    return 0
}

export function sortearItem(nome, chatId = 'global') {
    const itens = listarItens(nome)
    if (!itens.length) return null
    const key = `${nome}:${chatId}`
    const usados = recentes.get(key) || []
    const evitar = new Set(usados)
    let escolha = null
    for (let t = 0; t < 40; t++) {
        const idx = Math.floor(Math.random() * itens.length)
        if (!evitar.has(idx)) {
            escolha = itens[idx]
            usados.push(idx)
            break
        }
    }
    if (!escolha) escolha = itens[Math.floor(Math.random() * itens.length)]
    while (usados.length > 80) usados.shift()
    recentes.set(key, usados)
    return escolha
}

export function obterVerdadeOuDesafioDoJson(tipo, nivel) {
    const data = carregarJson('verdade_ou_desafio')
    if (!data?.verdade || !data?.desafio) return null
    const t = String(tipo || '').toLowerCase()
    const n = Math.min(5, Math.max(1, Number(nivel) || 1))
    const chave = ['verdade', 'vdd', 'truth', 'v'].includes(t)
        ? 'verdade'
        : ['desafio', 'dsf', 'dare', 'd'].includes(t)
          ? 'desafio'
          : Math.random() < 0.5
            ? 'verdade'
            : 'desafio'
    const lista = (data[chave][n] || data[chave][1] || []).map(limparTexto).filter(Boolean)
    if (!lista.length) return null
    const texto = lista[Math.floor(Math.random() * lista.length)]
    return { tipo: chave, nivel: n, texto }
}

export function resumoConteudo() {
    const nomes = [
        'piadas',
        'trocadilhos',
        'audios_malignos',
        'isso_ou_aquilo',
        'curiosidades',
        'frases_soltas',
        'verdade_ou_desafio'
    ]
    const out = {}
    for (const n of nomes) out[n] = tamanhoBanco(n, { rapido: true })
    return out
}

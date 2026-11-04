/**
 * Dedup durável por id de mensagem.
 * Só marca "done" após processar — crash no meio não perde a msg (pode retentar).
 */
import fs from 'fs-extra'
import path from 'node:path'
import { incrMetrica } from './logger.js'
import { caminhoDados } from './caminhos.js'

/** @type {Map<string, { ts: number, estado: 'processing'|'done' }>} */
const msgsVistas = new Map()
let dirty = false
let flushTimer = null
const ARQ = () => caminhoDados('dedup-msgs.json')

export async function carregarDedupDisco() {
    try {
        const arq = ARQ()
        if (!(await fs.pathExists(arq))) return
        const j = await fs.readJson(arq)
        const agora = Date.now()
        const lim = agora - 30 * 60 * 1000
        for (const [id, v] of Object.entries(j?.ids || {})) {
            const ts = Number(v?.ts || 0)
            if (ts < lim) continue
            // processing antigo → libera para retentar
            if (v?.estado === 'processing') continue
            msgsVistas.set(id, { ts, estado: 'done' })
        }
    } catch {
        /* ignore */
    }
}

function agendarFlush() {
    dirty = true
    if (flushTimer) return
    flushTimer = setTimeout(() => {
        flushTimer = null
        void flushDedupDisco()
    }, 2000)
}

export async function flushDedupDisco() {
    if (!dirty) return
    dirty = false
    try {
        await fs.ensureDir(path.dirname(ARQ()))
        const ids = {}
        const lim = Date.now() - 30 * 60 * 1000
        for (const [k, v] of msgsVistas) {
            if (v.ts >= lim) ids[k] = v
        }
        await fs.writeJson(ARQ(), { ids }, { spaces: 0 })
    } catch {
        dirty = true
    }
}

export function jaViuMsgId(id, store = msgsVistas) {
    if (!id) return false
    const v = store.get(id)
    return v?.estado === 'done' || v?.estado === 'processing'
}

export function marcarMsgProcessando(id, store = msgsVistas, agora = Date.now()) {
    if (!id) return
    store.set(id, { ts: agora, estado: 'processing' })
    if (store === msgsVistas) agendarFlush()
    if (store.size > 4000) {
        const lim = agora - 30 * 60 * 1000
        for (const [k, t] of store) {
            if (t.ts < lim) store.delete(k)
        }
    }
}

export function marcarMsgDone(id, store = msgsVistas, agora = Date.now()) {
    if (!id) return
    store.set(id, { ts: agora, estado: 'done' })
    if (store === msgsVistas) agendarFlush()
}

export function liberarMsgId(id, store = msgsVistas) {
    if (!id) return
    store.delete(id)
    if (store === msgsVistas) agendarFlush()
}

/** Compat: marca done (legado dos testes). */
export function marcarMsgId(id, store = msgsVistas, agora = Date.now()) {
    marcarMsgDone(id, store, agora)
}

/**
 * Filtra msgs novas. Marca processing imediatamente para evitar double-work
 * no mesmo lote; caller deve marcarDone / liberar.
 */
export function filtrarMsgsNovas(m, store = msgsVistas) {
    const lista = Array.isArray(m?.messages) ? m.messages : []
    const novas = []
    for (const msg of lista) {
        const id = msg?.key?.id
        if (!id) {
            novas.push(msg)
            continue
        }
        if (jaViuMsgId(id, store)) {
            incrMetrica('msgs_ignoradas')
            continue
        }
        marcarMsgProcessando(id, store)
        novas.push(msg)
    }
    return novas.length ? { ...m, messages: novas } : null
}

export function limparDedup(store = msgsVistas) {
    store.clear()
}

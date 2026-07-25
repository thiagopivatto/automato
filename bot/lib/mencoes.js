import { mencaoNumero } from './util.js'

function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Prefere @s.whatsapp.net quando houver duplicata LID/PN na lista. */
export function preferirJidMencao(jid, participantes = []) {
    const num = String(jid || '').split('@')[0]
    if (!num) return jid
    const pn = participantes.find((p) => String(p).startsWith(num + '@') && String(p).endsWith('@s.whatsapp.net'))
    if (pn) return pn
    const mesma = participantes.find((p) => String(p).split('@')[0] === num)
    return mesma || jid
}

/**
 * Troca nomes (e números crus) por @menção WhatsApp e devolve JIDs para mentions[].
 */
export function aplicarMencoes(texto, membros = [], participantes = []) {
    let t = String(texto || '')
    const mentions = []
    const lista = (membros || [])
        .filter((m) => m?.jid)
        .map((m) => ({
            jid: preferirJidMencao(m.jid, participantes.length ? participantes : [m.jid]),
            nome: String(m.nome || '').trim()
        }))
        .sort((a, b) => b.nome.length - a.nome.length)

    for (const m of lista) {
        if (!m.nome || m.nome.length < 2) continue
        // Evita "nome" que seja só dígitos (parece número)
        if (/^\d+$/.test(m.nome) && m.nome.length >= 8) continue
        const tag = `@${mencaoNumero(m.jid)}`
        const re = new RegExp(`(?<!@)${escapeRegex(m.nome)}`, 'gi')
        if (re.test(t)) {
            t = t.replace(re, tag)
            mentions.push(m.jid)
        }
    }

    for (const m of lista) {
        const num = mencaoNumero(m.jid)
        if (!num || num.length < 8) continue
        const tag = `@${num}`
        const reNum = new RegExp(`(?<!@)\\b${escapeRegex(num)}\\b`, 'g')
        if (reNum.test(t)) {
            t = t.replace(reNum, tag)
            mentions.push(m.jid)
        }
    }

    return { texto: t, mentions: [...new Set(mentions)] }
}

/** Monta texto curto com menção tipada (ex.: prefeito). */
export function textoComMencao(templateComAt, jids = []) {
    return { texto: templateComAt, mentions: [...new Set(jids.filter(Boolean))] }
}

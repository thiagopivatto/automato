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
            nome: String(m.nome || '').trim(),
            aliases: Array.isArray(m.aliases) ? m.aliases : []
        }))
        .sort((a, b) => b.nome.length - a.nome.length)

    for (const m of lista) {
        if (!m.nome || m.nome.length < 2) continue
        // Evita "nome" que seja só dígitos (parece número)
        if (/^\d+$/.test(m.nome) && m.nome.length >= 8) continue
        const tag = `@${mencaoNumero(m.jid)}`
        const re = new RegExp(`(?<!@)${escapeRegex(m.nome)}`, 'gi')
        const novo = t.replace(re, tag)
        if (novo !== t) {
            t = novo
            mentions.push(m.jid)
        }
    }

    for (const m of lista) {
        const nums = [mencaoNumero(m.jid), ...(m.aliases || []).map((a) => mencaoNumero(a))]
            .filter((n) => n && n.length >= 8)
        const tag = `@${mencaoNumero(m.jid)}`
        for (const num of [...new Set(nums)]) {
            const reNum = new RegExp(`(?<!@)\\b${escapeRegex(num)}\\b`, 'g')
            const novo = t.replace(reNum, tag)
            if (novo !== t) {
                t = novo
                mentions.push(m.jid)
            }
        }
    }

    // Número gigante que não é membro conhecido não pode vazar no texto.
    t = t.replace(/(?<!@)\b\d{12,}\b/g, ' ')
    t = t.replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1').trim()

    return { texto: t, mentions: [...new Set(mentions)] }
}

/** Troca @número da mensagem recebida pelo nome, antes de mandar o texto à IA. */
export function textoMencoesParaNomes(texto, membros = [], mencionados = []) {
    let t = String(texto || '')
    for (const jid of mencionados || []) {
        const num = mencaoNumero(jid)
        if (!num) continue
        const membro = (membros || []).find((m) =>
            [m?.jid, ...(m?.aliases || [])].some((a) => mencaoNumero(a) === num)
        )
        const bruto = String(membro?.nome || '').trim()
        const nome = bruto && !/^\d{6,}$/.test(bruto) ? bruto : 'alguém'
        t = t.replace(new RegExp(`@${escapeRegex(num)}\\b`, 'g'), nome)
    }
    return t.replace(/\s+/g, ' ').trim()
}

/** Nomes reais para o prompt — sem telefone e sem "Membro1". */
export function nomesParaPrompt(membros = [], max = 25) {
    const nomes = []
    for (const m of membros || []) {
        const n = String(m?.nome || '').trim()
        if (!n || n.length < 2 || /^\d{6,}$/.test(n) || /^Membro\d+$/i.test(n)) continue
        if (nomes.some((x) => x.toLowerCase() === n.toLowerCase())) continue
        nomes.push(n)
        if (nomes.length >= max) break
    }
    return nomes.join(', ')
}

/** Monta texto curto com menção tipada (ex.: prefeito). */
export function textoComMencao(templateComAt, jids = []) {
    return { texto: templateComAt, mentions: [...new Set(jids.filter(Boolean))] }
}

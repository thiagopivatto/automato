/**
 * Resolução canônica de identidade WhatsApp (PN preferencial + aliases LID).
 */
import { chavesJid, listaContemJid } from './util.js'

/**
 * Normaliza um JID (remove device :N, trim).
 */
export function normalizarJid(jid) {
    const s = String(jid || '').trim()
    if (!s) return ''
    const [userPart, domain] = s.split('@')
    if (!domain) return s
    const user = userPart.split(':')[0]
    return `${user}@${domain}`
}

/**
 * Preferência: PN (@s.whatsapp.net) > outros > LID.
 */
export function escolherCanonico(...candidatos) {
    const ids = [...new Set(candidatos.flat().filter(Boolean).map(normalizarJid).filter(Boolean))]
    const pn = ids.find((j) => /@s\.whatsapp\.net$/i.test(j))
    if (pn) return pn
    const naoLid = ids.find((j) => !/@lid$/i.test(j))
    return naoLid || ids[0] || ''
}

/**
 * Extrai aliases úteis de uma key Baileys + extras.
 */
export function aliasesDeKey(key = {}, ...extras) {
    return [
        ...new Set(
            [
                key?.participant,
                key?.participantPn,
                key?.participantAlt,
                key?.participantLid,
                key?.remoteJid,
                key?.remoteJidAlt,
                ...extras
            ]
                .filter(Boolean)
                .map(normalizarJid)
        )
    ]
}

/**
 * Resolve identidade canônica + aliases para uso em dono/ban/ofensa/memória.
 * @returns {{ id: string, aliases: string[], ehLid: boolean }}
 */
export function resolverIdentidade(...candidatos) {
    const aliases = [
        ...new Set(candidatos.flat().filter(Boolean).map(normalizarJid).filter(Boolean))
    ]
    const id = escolherCanonico(...aliases)
    return {
        id,
        aliases: aliases.length ? aliases : id ? [id] : [],
        ehLid: /@lid$/i.test(id)
    }
}

/** Dígitos E.164 sem + (só números). */
export function digitosTelefone(jidOuNumero) {
    const s = String(jidOuNumero || '')
    if (s.endsWith('@lid')) return ''
    return s.replace(/\D/g, '')
}

/**
 * Match exato de dono por dígitos (sem endsWith frouxo).
 */
export function digitosIguaisDono(candidato, donoDigitos) {
    const a = digitosTelefone(candidato)
    const b = String(donoDigitos || '').replace(/\D/g, '')
    if (!a || !b || a.length < 10 || b.length < 10) return false
    return a === b
}

export { chavesJid, listaContemJid }

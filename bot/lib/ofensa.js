/**
 * Auto-ofensa de grupo: detecta xingamento e rebate pesado (padrão ligado).
 */
import * as socket from '../baileys/socket.js'
import { mencaoNumero } from './util.js'

const cooldownPorChat = new Map()
/** Cooldown maior = menos gasto de IA / menos spam de retaliação. */
const COOLDOWN_MS = Number(process.env.OFENSA_COOLDOWN_MS || 45_000)

const NOME_INSULTO =
    'arrombado|arrombada|idiota|imbecil|burro|burra|otario|otaria|lixo|merda|corno|corna|vagabundo|vagabunda|desgracado|desgracada|babaca|trouxa|palhaco|inutil|nojento|nojenta|ridiculo|ridicula|fracassado|fracassada|fdp|cuzao|piranha|puta|putinha'

const ATAQUE_DIRETO =
    /\b(vai se foder|vsf|vsfd|vai tomar no cu|cala a boca|te foder|pau no cu|vai pro inferno)\b/

function normalizarOfensa(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^\p{L}\p{N}\s@]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
}

function ofensaDirigida(t) {
    if (ATAQUE_DIRETO.test(t)) return true
    const seu = new RegExp(`\\b(seu|sua|seus|suas)\\s+(?:\\w+\\s+){0,1}?(${NOME_INSULTO})\\b`)
    if (seu.test(t)) return true
    const tuEs = new RegExp(
        `\\b(voce|vc|tu|ce)\\s+(e|eh)\\s+(um |uma |o |a )?(${NOME_INSULTO})\\b`
    )
    if (tuEs.test(t)) return true
    if (/@\w{3,}/.test(t) && new RegExp(`\\b(${NOME_INSULTO})\\b`).test(t)) return true
    return false
}

function elogioOuConversa(t) {
    if (/\b(tu|voce|vc|ce)\s+(e|eh)\s+(muito\s+)?(foda|brabo|braba|mito|fera)\b/.test(t)) return true
    if (/\b(caralho|porra)\s+que\s+(golaco|gol|gols|jogo|foto|dia|fome|sono)\b/.test(t)) return true
    if (/\bque (merda|bosta|lixo|porra|caralho) de\b/.test(t)) return true
    if (/\b(porra|caralho)\s+que\s+\w+/.test(t) && !ofensaDirigida(t)) return true
    if (/\bfoda-?se\b/.test(t) && !ofensaDirigida(t)) return true
    return false
}

/**
 * dirigida: xingamento mira alguém.
 * duvida: tem veneno e um alvo possível; a IA decide.
 * nao: elogio ou conversa com palavrão solto.
 * @returns {'dirigida'|'duvida'|'nao'}
 */
export function classificarOfensa(texto) {
    const t = normalizarOfensa(texto)
    if (!t || t.length < 2) return 'nao'
    if (ofensaDirigida(t)) return 'dirigida'
    if (elogioOuConversa(t)) return 'nao'
    const insulto = new RegExp(`\\b(e|eh)\\s+(um |uma )?(${NOME_INSULTO})\\b`)
    if (insulto.test(t)) return 'duvida'
    if (/\b(porra|caralho|merda|krl|crl|pqp|tnc|bosta)\b/.test(t)) return 'nao'
    return 'nao'
}

const FALLBACKS = [
    'cala a boca, seu lixo patético. tu xinga porque é o único talento que te sobrou, e mesmo assim é medíocre. senta, relê o que escreveu e percebe que passou vergonha em público, seu merda inútil, com teclado e zero repertório.',
    'falou pouco e já se entregou: é um arrombado sem repertório, daqueles que provocam e depois fazem cara de vítima. vai chorar no banho, otário. a frase foi fraca, a intenção foi pior, e todo mundo viu.',
    'puta que pariu, que ofensa fraca. tu é residual de gente, um corno emocional com teclado, achando que volume substitui cérebro. tenta de novo quando aprender a formar uma frase que não seja só barulho.',
    'parabéns, escória: inventou briga pra parecer alguém e só provou que é um troço descartável. o grupo inteiro perdeu tempo com o seu showzinho. continua sendo o mesmo babaca barulhento de sempre.',
    'xingou e achou que ganhou? seu cérebro é decoração, a coragem é de grupo e a ofensa é de criança cansada. some daqui, desgraça ambulante, antes de passar mais vergonha do que já passou.'
]

export function ofensaAtivaNoGrupo(grupo) {
    // OFENSA_DEFAULT_OFF=1 → grupos novos/sem flag ficam off até !ofensa on
    if (/^(1|true|sim|on)$/i.test(String(process.env.OFENSA_DEFAULT_OFF || ''))) {
        return grupo?.ofensa === true
    }
    // padrão ON: só desliga com ofensa === false
    return grupo?.ofensa !== false
}

/** Só enfileira se a frase ataca alguém ou está em dúvida. Conversa e elogio ficam de fora. */
export function textoPareceOfensa(texto) {
    return classificarOfensa(texto) !== 'nao'
}

function emCooldown(idChat, remetente) {
    const key = `${idChat}|${remetente}`
    const agora = Date.now()
    const prev = cooldownPorChat.get(key) || 0
    if (agora - prev < COOLDOWN_MS) return true
    cooldownPorChat.set(key, agora)
    if (cooldownPorChat.size > 2000) {
        for (const [k, ts] of cooldownPorChat) {
            if (agora - ts > 120_000) cooldownPorChat.delete(k)
        }
    }
    return false
}

function fallbackOfensa() {
    return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]
}

async function chamarResponderOfensaIA(texto, contexto) {
    try {
        const api = (await import('./lbotApi.js')).default
        if (typeof api?.IA?.responderOfensaIA === 'function') {
            return await api.IA.responderOfensaIA(texto, contexto)
        }
    } catch (err) {
        console.log(`[ofensa] import api - ${err?.message || err}`)
    }
    // Fallback: importa direto do vendor (evita node_modules desatualizado)
    try {
        const mod = await import('../../vendor/lbot-api-comandos/api/ia.js')
        if (typeof mod.responderOfensaIA === 'function') {
            return await mod.responderOfensaIA(texto, contexto)
        }
    } catch (err) {
        console.log(`[ofensa] import vendor - ${err?.message || err}`)
    }
    return { resultado: null }
}

/**
 * @returns {Promise<boolean>} true se respondeu
 */
export async function processarOfensaAutomatica(c, mensagemBaileys, botInfo) {
    try {
        const {
            mensagem_grupo,
            mensagem_bot,
            grupo,
            corpo,
            texto_recebido,
            remetente,
            nome_usuario,
            id_chat,
            mencionados
        } = mensagemBaileys

        if (!mensagem_grupo || mensagem_bot) return false
        if (!ofensaAtivaNoGrupo(grupo)) return false

        const texto = String(corpo || texto_recebido || '').trim()
        if (!texto || texto.length < 2) return false
        if (texto.startsWith(botInfo?.prefixo || '!')) return false

        const leitura = classificarOfensa(texto)
        if (leitura === 'nao') return false
        if (emCooldown(id_chat, remetente)) return false

        const membros = (grupo?.participantes || [])
            .slice(0, 50)
            .map((j) => mencaoNumero(j))
            .filter(Boolean)

        const tags = (mencionados || []).map((j) => mencaoNumero(j)).filter(Boolean)

        let resultado = null
        try {
            const resp = await chamarResponderOfensaIA(texto, {
                nomeUsuario: nome_usuario || mencaoNumero(remetente) || 'alguém',
                membros,
                mencionados: tags
            })
            resultado = resp?.resultado || null
        } catch (err) {
            console.log(`[ofensa] IA - ${err?.message || err}`)
        }

        // Insulto pronto só na ofensa dirigida. Dúvida sem texto da IA fica em silêncio.
        if (!resultado && leitura === 'dirigida') resultado = fallbackOfensa()
        if (!resultado) return false

        const mencoes = [remetente, ...(mencionados || [])].filter(Boolean)
        const tag = `@${mencaoNumero(remetente)}`
        const corpoFinal = `${tag} ${resultado}`.trim()
        await socket.enviarTextoComMencoes(c, id_chat, corpoFinal, mencoes)
        return true
    } catch (err) {
        console.log(`[ofensa] ${err?.message || err}`)
        return false
    }
}

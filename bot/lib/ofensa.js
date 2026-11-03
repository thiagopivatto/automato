/**
 * Auto-ofensa de grupo: detecta xingamento e rebate pesado (padrão ligado).
 */
import * as socket from '../baileys/socket.js'
import { mencaoNumero } from './util.js'

const cooldownPorChat = new Map()
const COOLDOWN_MS = 18_000

const PALAVROES_HINT =
    /(porra|caralho|merda|bosta|viado|viadinho|puta|puto|putinha|arrombado|arrombada|filho\s*d[ae]\s*puta|fdp|cuz[aã]o|buceta|pau\s*no\s*cu|vai\s*se\s*foder|vai\s*tomar\s*no\s*cu|vsf|vsfd|ot[aá]rio|idiota|imbecil|burro|lixo|vagabund|corno|corn[oa]|piranha|desgraç|babaca|trouxa|palha[cç]o|in[uú]til|nojent|rid[ií]cul|fracassad|krl|crl|pqp|tnc|foda-?se|se\s*fode|seu\s*lixo|sua\s*merda|vai\s*pro\s*inferno|filho\s*da\s*puta)/i

const FALLBACKS = [
    'cala a boca, seu lixo patético — tu xinga porque é o único talento que te sobrou, seu merda inútil.',
    'falou pouco e já se entregou: é um arrombado sem repertório. vai chorar no banho, otário.',
    'puta que pariu, que ofensa fraca. tu é residual de gente, um corno emocional com teclado.',
    'parabéns, escória: inventou briga pra parecer alguém. continua sendo um troço descartável.',
    'xingou e achou que ganhou? seu cérebro é decoração. some daqui, desgraça ambulante.'
]

export function ofensaAtivaNoGrupo(grupo) {
    // padrão ON: só desliga com ofensa === false
    return grupo?.ofensa !== false
}

/** Atalho barato: só enfileira IA se a msg cheira a ofensa. */
export function textoPareceOfensa(texto) {
    const t = String(texto || '')
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^\p{L}\p{N}\s@]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
    if (!t || t.length < 2) return false
    if (PALAVROES_HINT.test(t)) return true
    // menção + tom agressivo
    if (/@\w{3,}/.test(t) && t.length < 160 && /(seu|sua|esse|essa|vai|cala|morre|otario|idiota)/i.test(t)) {
        return true
    }
    return false
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
        const api = (await import('@victorsouzaleal/lbot-api-comandos')).default
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

        if (!textoPareceOfensa(texto)) return false
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

        // Com palavrão claro, nunca engole a resposta: fallback local
        if (!resultado) resultado = fallbackOfensa()

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

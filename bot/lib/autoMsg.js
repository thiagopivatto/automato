/**
 * AutoMsg — só fala depois de silêncio longo no grupo (~2h+).
 * Tom de pessoa normal: pergunta a alguém, filosofa leve, puxa assunto.
 * Sem madrugada (0h–8h).
 */
import moment from 'moment-timezone'
import api from './lbotApi.js'
import * as socket from '../baileys/socket.js'
import { GrupoControle } from '../controles/GrupoControle.js'
import { historicoGrupo } from '../controles/HistoricoGrupoControle.js'
import { membrosDoGrupo, sortearNomes } from './dramaGrupo.js'
import { mencaoNumero } from './util.js'
import { aplicarMencoes } from './mencoes.js'

const TZ = 'America/Sao_Paulo'
/** Checagem a cada 10 min — não precisa ser frequente. */
const INTERVALO_TICK_MS = 10 * 60 * 1000
/** Silêncio mínimo do grupo antes de o bot falar. */
const SILENCIO_MIN_MS = 2 * 60 * 60 * 1000
const SILENCIO_MAX_MS = 3.5 * 60 * 60 * 1000
/** Espaço mínimo entre duas autos do bot no mesmo grupo. */
const COOLDOWN_AUTO_MIN_MS = 2 * 60 * 60 * 1000
const COOLDOWN_AUTO_MAX_MS = 4 * 60 * 60 * 1000
const MAX_HIST_RECENTES = 12
const DELAY_ENVIO_MIN_MS = 12_000
const DELAY_ENVIO_MAX_MS = 50_000

let timer = null
let sockRef = null
let botInfoRef = null

/** @type {Map<string, { ultimaAuto: number, silencioAlvo: number, cooldownAlvo: number, recentes: string[] }>} */
const estado = new Map()

function agora() {
    return moment().tz(TZ)
}
function hora() {
    return agora().hour()
}
function ehMadrugada() {
    const h = hora()
    return h >= 0 && h < 8
}
function randEntre(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1))
}
function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}
function hashCurto(s) {
    const t = String(s || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 140)
    let h = 0
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0
    return String(h)
}
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms))
}

function getEstado(id) {
    if (!estado.has(id)) {
        estado.set(id, {
            ultimaAuto: 0,
            silencioAlvo: randEntre(SILENCIO_MIN_MS, SILENCIO_MAX_MS),
            cooldownAlvo: randEntre(COOLDOWN_AUTO_MIN_MS, COOLDOWN_AUTO_MAX_MS),
            recentes: []
        })
    }
    return estado.get(id)
}

function registrarRecente(st, texto) {
    const h = hashCurto(texto)
    st.recentes.push(h)
    if (st.recentes.length > MAX_HIST_RECENTES) st.recentes.shift()
}

function jaUsou(st, texto) {
    return st.recentes.includes(hashCurto(texto))
}

async function obterUltimoContexto(id_grupo) {
    try {
        const msgs = await historicoGrupo.obterUltimas(id_grupo, 30)
        if (!msgs?.length) return ''
        return msgs
            .slice(-12)
            .map((m) => `${m.nome_usuario || 'Alguém'}: ${String(m.texto || '').replace(/\s+/g, ' ').slice(0, 100)}`)
            .join('\n')
            .slice(0, 1200)
    } catch {
        return ''
    }
}

async function gerarTextoHumano(prompt, personalidade = '') {
    try {
        const { ultronSystemAutomsg } = await import('./ultronPersona.js')
        let system = ultronSystemAutomsg()
        const persona = String(personalidade || '').trim()
        if (persona) system += `\n\n[PERSONALIDADE DESTE CHAT]\n${persona.slice(0, 600)}`
        const { resultado } = await api.IA.gerarTextoIA(prompt, system, {
            temperature: 0.95,
            timeout: 25000,
            budgetMs: 10000,
            maxOutputTokens: 180
        })
        return String(resultado || '')
            .trim()
            .replace(/^["']|["']$/g, '')
            .slice(0, 320)
    } catch {
        return null
    }
}

async function textoComMembro(txt, alvo, participantes) {
    if (!alvo) return { texto: txt, mentions: [] }
    const aplicado = aplicarMencoes(txt, [alvo], participantes || [])
    if (aplicado.mentions.length) return aplicado
    return {
        texto: `@${mencaoNumero(alvo.jid)} ${txt}`,
        mentions: [alvo.jid]
    }
}

const FALLBACKS_PERGUNTA = [
    'e aí, como tá sendo o dia?',
    'sumiu ou só de boa aí?',
    'me responde uma coisa: o que te faz perder tempo de bom jeito?',
    'tá pensando em quê agora?',
    'se pudesse sumir por um dia sem explicar, pra onde ia?'
]

const FALLBACKS_FILO = [
    'às vezes o silêncio do grupo fala mais alto que o papo. estranho, né?',
    'fico pensando: a gente conversa tanto e ainda assim se conhece pouco.',
    'tem dia que o melhor plano é não ter plano. alguém discorda?'
]

async function montarMensagem(grupoInfo, botInfo, st) {
    const membros = await membrosDoGrupo(
        grupoInfo.id_grupo,
        grupoInfo.participantes,
        botInfo.numero_bot
    )
    const participantes = grupoInfo.participantes || []
    const nomeGrupo = grupoInfo.nome || 'o grupo'
    const contexto = await obterUltimoContexto(grupoInfo.id_grupo)
    const alvo = membros.length ? sortearNomes(membros, 1)[0] : null

    let personalidade = ''
    try {
        const { obterPersonalidadeChat } = await import('./personalidadeChat.js')
        personalidade = (await obterPersonalidadeChat(grupoInfo.id_grupo)) || ''
    } catch { /* ignore */ }

    const tentarUnico = async (factory, tentativas = 3) => {
        for (let i = 0; i < tentativas; i++) {
            const r = await factory()
            if (!r?.texto) continue
            if (!jaUsou(st, r.texto)) return r
        }
        return factory()
    }

    // ~70% pergunta a um membro; ~30% filosofada / reflexão pro grupo
    const perguntarAlguem = !!alvo && Math.random() < 0.72

    return tentarUnico(async () => {
        if (perguntarAlguem) {
            const ia = await gerarTextoHumano(
                `O grupo "${nomeGrupo}" está quieto há umas 2 horas. ` +
                    `Escreva UMA mensagem curta e natural falando com ${alvo.nome}, ` +
                    `fazendo uma pergunta sincera (dia a dia, opinião leve ou curiosidade). ` +
                    `Pode usar o nome ${alvo.nome} no texto. Sem parecer bot.` +
                    (contexto ? `\nÚltimo papo (só contexto, não invente):\n${contexto}` : ''),
                personalidade
            )
            const txt =
                ia ||
                `${alvo.nome}, ${FALLBACKS_PERGUNTA[Math.floor(Math.random() * FALLBACKS_PERGUNTA.length)]}`
            return textoComMembro(txt, alvo, participantes)
        }

        const ia = await gerarTextoHumano(
            `O grupo "${nomeGrupo}" está parado. Mande UMA mensagem curta, humana, ` +
                `filosofando de leve ou puxando um assunto calmo (sem sermão, sem piada forçada).` +
                (contexto ? `\nÚltimo papo:\n${contexto}` : '') +
                (alvo ? `\nSe quiser, pode dirigir a ${alvo.nome}.` : ''),
            personalidade
        )
        const txt = ia || FALLBACKS_FILO[Math.floor(Math.random() * FALLBACKS_FILO.length)]
        // Se a IA citou o nome do alvo, menciona; senão manda pro grupo
        if (alvo && new RegExp(alvo.nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(txt)) {
            return textoComMembro(txt, alvo, participantes)
        }
        return { texto: txt, mentions: [] }
    })
}

async function processarGrupo(grupoInfo) {
    if (!sockRef || !botInfoRef) return
    if (grupoInfo?.automsg === false) return
    if (ehMadrugada()) return

    const id = grupoInfo.id_grupo
    const st = getEstado(id)
    const agoraMs = Date.now()
    const silencioMs = agoraMs - (Number(grupoInfo.ultima_msg_humana) || 0)

    // Só fala se o grupo ficou quieto o bastante
    if (silencioMs < st.silencioAlvo) return
    // E se o próprio bot já não falou há pouco
    if (st.ultimaAuto && agoraMs - st.ultimaAuto < st.cooldownAlvo) return

    const msg = await montarMensagem(grupoInfo, botInfoRef, st)
    if (!msg?.texto) return

    await sleep(randEntre(DELAY_ENVIO_MIN_MS, DELAY_ENVIO_MAX_MS))

    try {
        if (msg.mentions?.length) {
            await socket.enviarTextoComMencoes(sockRef, id, msg.texto, msg.mentions)
        } else {
            await socket.enviarTexto(sockRef, id, msg.texto)
        }
        registrarRecente(st, msg.texto)
        st.ultimaAuto = Date.now()
        st.silencioAlvo = randEntre(SILENCIO_MIN_MS, SILENCIO_MAX_MS)
        st.cooldownAlvo = randEntre(COOLDOWN_AUTO_MIN_MS, COOLDOWN_AUTO_MAX_MS)
        await new GrupoControle().atualizarUltimaAutoMsg(id)
    } catch (err) {
        console.log(`AutoMsg ${id} - ${err?.message || err}`)
    }
}

async function tick() {
    try {
        const grupos = await new GrupoControle().obterGruposAutoMsg()
        for (const g of shuffle(grupos || [])) {
            await processarGrupo(g)
            await sleep(randEntre(5000, 15000))
        }
    } catch (err) {
        console.log(`AutoMsg tick - ${err?.message || err}`)
    }
}

export function iniciarAutoMsg(c, botInfo) {
    sockRef = c
    botInfoRef = botInfo
    if (timer) clearInterval(timer)
    timer = setInterval(tick, INTERVALO_TICK_MS)
    // Primeira checagem após 2 min (só envia se já houver silêncio de 2h+)
    setTimeout(tick, 120_000)
}

export function pararAutoMsg() {
    if (timer) clearInterval(timer)
    timer = null
    sockRef = null
}

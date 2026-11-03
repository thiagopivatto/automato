/**
 * Mensagens automáticas humanas — contexto do grupo, sem piadas forçadas.
 * Intervalos longos. Sem madrugada.
 */
import moment from 'moment-timezone'
import api from '@victorsouzaleal/lbot-api-comandos'
import * as socket from '../baileys/socket.js'
import { GrupoControle } from '../controles/GrupoControle.js'
import { historicoGrupo } from '../controles/HistoricoGrupoControle.js'
import { membrosDoGrupo, sortearNomes, listaNomesTexto } from './dramaGrupo.js'
import { mencaoNumero } from './util.js'
import { aplicarMencoes } from './mencoes.js'

const TZ = 'America/Sao_Paulo'
const INTERVALO_TICK_MS = 3 * 60 * 1000
const COOLDOWN_MIN_MS = 50 * 60 * 1000
const COOLDOWN_MAX_MS = 3 * 60 * 60 * 1000
const IDLE_MIN_MS = 2 * 60 * 60 * 1000
const IDLE_MAX_MS = 6 * 60 * 60 * 1000
const MAX_HIST_RECENTES = 10
const DELAY_ENVIO_MIN_MS = 8_000
const DELAY_ENVIO_MAX_MS = 45_000

let timer = null
let sockRef = null
let botInfoRef = null

/** @type {Map<string, { ultimaAuto: number, bomDiaDia: string, boaNoiteDia: string, idleAlvo: number, recentes: string[], ultimoTipo: string }>} */
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
function diaKey() {
    return agora().format('YYYY-MM-DD')
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
            bomDiaDia: '',
            boaNoiteDia: '',
            idleAlvo: randEntre(IDLE_MIN_MS, IDLE_MAX_MS),
            recentes: [],
            ultimoTipo: ''
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

async function obterContextoDia(id_grupo) {
    try {
        const msgs = await historicoGrupo.obterUltimas(id_grupo, 100)
        if (!msgs?.length) return { trechos: '', qtd: 0 }
        const inicioDia = agora().startOf('day').valueOf()
        const doDia = msgs.filter((m) => Number(m.timestamp) >= inicioDia)
        const base = (doDia.length ? doDia : msgs).slice(-40)
        const trechos = base
            .map((m) => `${m.nome_usuario || 'Alguém'}: ${String(m.texto || '').replace(/\s+/g, ' ').slice(0, 110)}`)
            .join('\n')
            .slice(0, 2800)
        return { trechos, qtd: base.length }
    } catch {
        return { trechos: '', qtd: 0 }
    }
}

const SYSTEM_HUMANO =
    'Você é um membro do grupo de WhatsApp falando como pessoa real (PT-BR). ' +
    'Mensagem curta (1–3 frases), natural, sem ser robô, sem listas, sem emoji excessivo. ' +
    'Não diga que é IA/bot. Não invente números de telefone. Pode zoar leve se couber no contexto.'

async function gerarTextoHumano(prompt, personalidade = '') {
    try {
        let system = SYSTEM_HUMANO
        const persona = String(personalidade || '').trim()
        if (persona) {
            system += `\n\n[PERSONALIDADE DESTE GRUPO]\n${persona.slice(0, 800)}`
        }
        const { resultado } = await api.IA.gerarTextoIA(prompt, system, {
            temperature: 0.9,
            timeout: 45000
        })
        return String(resultado || '')
            .trim()
            .replace(/^["']|["']$/g, '')
            .slice(0, 420)
    } catch {
        return null
    }
}

async function textoComMembros(txt, alvos, participantes) {
    const aplicado = aplicarMencoes(txt, alvos, participantes || [])
    if (aplicado.mentions.length) return aplicado
    if (alvos?.length === 1) {
        return {
            texto: `@${mencaoNumero(alvos[0].jid)} ${txt}`,
            mentions: [alvos[0].jid]
        }
    }
    if (alvos?.length > 1) {
        const tags = alvos.map((a) => `@${mencaoNumero(a.jid)}`).join(' ')
        return { texto: `${tags} ${txt}`, mentions: alvos.map((a) => a.jid) }
    }
    return { texto: txt, mentions: [] }
}

async function montarMensagem(tipo, grupoInfo, botInfo, st) {
    const membros = await membrosDoGrupo(grupoInfo.id_grupo, grupoInfo.participantes, botInfo.numero_bot)
    const nomeGrupo = grupoInfo.nome || 'o grupo'
    const participantes = grupoInfo.participantes || []
    const { trechos, qtd } = await obterContextoDia(grupoInfo.id_grupo)
    const alvos1 = membros.length ? sortearNomes(membros, 1) : []
    const alvos2 = membros.length >= 2 ? sortearNomes(membros, randEntre(1, Math.min(2, membros.length))) : alvos1
    const nomes = listaNomesTexto(membros, 16)
    let personalidade = ''
    try {
        personalidade = (await new GrupoControle().obterPersonalidade(grupoInfo.id_grupo)) || ''
    } catch { /* ignore */ }

    const tentarUnico = async (factory, tentativas = 3) => {
        for (let i = 0; i < tentativas; i++) {
            const r = await factory()
            if (!r?.texto) continue
            if (!jaUsou(st, r.texto)) return r
        }
        return factory()
    }

    switch (tipo) {
        case 'bomdia':
            return tentarUnico(async () => {
                const ia = await gerarTextoHumano(
                    `Grupo "${nomeGrupo}". Escreva um bom dia NATURAL, como alguém do grupo mandando mensagem de manhã.` +
                        (trechos ? `\nContexto recente:\n${trechos.slice(0, 900)}` : ''),
                    personalidade
                )
                return {
                    texto: ia || `Bom dia, galera. Como tá o dia aí?`,
                    mentions: []
                }
            })

        case 'boanoite':
            return tentarUnico(async () => {
                const ia = await gerarTextoHumano(
                    `Grupo "${nomeGrupo}". Boa noite natural, como pessoa do grupo.` +
                        (trechos ? `\nO que rolou hoje:\n${trechos.slice(0, 900)}` : ''),
                    personalidade
                )
                return {
                    texto: ia || `Boa noite, pessoal. Descansem aí.`,
                    mentions: []
                }
            })

        case 'contexto':
            return tentarUnico(async () => {
                if (!trechos || qtd < 3) {
                    return {
                        texto: 'Tá quieto hoje... alguém conta o que tá fazendo?',
                        mentions: []
                    }
                }
                const ia = await gerarTextoHumano(
                    `Com base no chat recente do grupo "${nomeGrupo}", mande UMA mensagem humana comentando algo que realmente apareceu ` +
                        `(pergunta, opinião ou reação). Não invente fatos.\n\n${trechos}`,
                    personalidade
                )
                if (!ia) return { texto: 'Li o papo de vocês e fiquei curioso: e aí, como ficou isso?', mentions: [] }
                return textoComMembros(ia, membros.slice(0, 10), participantes)
            })

        case 'interagir':
            return tentarUnico(async () => {
                if (!alvos2.length) return { texto: 'Cadê o povo desse grupo?', mentions: [] }
                const nomesAlvos = alvos2.map((a) => a.nome).join(', ')
                const ia = await gerarTextoHumano(
                    `Fale com ${nomesAlvos} no grupo "${nomeGrupo}" de forma natural (pergunta ou comentário). ` +
                        `Use o(s) nome(s) no texto.` +
                        (trechos ? `\nContexto:\n${trechos.slice(0, 800)}` : '') +
                        `\nOutros membros: ${nomes}`,
                    personalidade
                )
                const txt = ia || `${nomesAlvos}, e aí? Sumiram ou só lendo?`
                return textoComMembros(txt, alvos2, participantes)
            })

        case 'idle':
            return tentarUnico(async () => {
                const ia = await gerarTextoHumano(
                    `O grupo "${nomeGrupo}" está parado há um tempo. Mande uma mensagem curta e humana para puxar assunto, ` +
                        `sem forçar piada.` +
                        (trechos ? `\nÚltimo contexto:\n${trechos.slice(0, 700)}` : ''),
                    personalidade
                )
                return {
                    texto: ia || 'Sumiram todos? Alguém aparece aí.',
                    mentions: []
                }
            })

        default:
            return { texto: 'E aí, pessoal — tudo certo por aí?', mentions: [] }
    }
}

function escolherTipo(st, ultimaHumana) {
    const h = hora()
    const dia = diaKey()
    const agoraMs = Date.now()

    if (h >= 8 && h < 11 && st.bomDiaDia !== dia) return 'bomdia'
    if (h >= 21 && h < 24 && st.boaNoiteDia !== dia) return 'boanoite'

    const idleMs = agoraMs - (Number(ultimaHumana) || 0)
    if (idleMs >= st.idleAlvo) return 'idle'

    const pesos = [
        ['contexto', 55],
        ['interagir', 45]
    ]
    const filtrados = pesos.filter(([t]) => t !== st.ultimoTipo)
    const base = filtrados.length ? filtrados : pesos
    const total = base.reduce((s, [, p]) => s + p, 0)
    let r = Math.random() * total
    for (const [tipo, p] of base) {
        r -= p
        if (r <= 0) return tipo
    }
    return 'contexto'
}

async function processarGrupo(grupoInfo) {
    if (!sockRef || !botInfoRef) return
    if (grupoInfo?.automsg === false) return
    if (ehMadrugada()) return

    const id = grupoInfo.id_grupo
    const st = getEstado(id)
    const agoraMs = Date.now()
    const cooldown = randEntre(COOLDOWN_MIN_MS, COOLDOWN_MAX_MS)

    if (agoraMs - st.ultimaAuto < cooldown && st.bomDiaDia === diaKey() && st.boaNoiteDia === diaKey()) {
        const h = hora()
        const idleMs = agoraMs - (Number(grupoInfo.ultima_msg_humana) || 0)
        const forcar =
            (h >= 8 && h < 11 && st.bomDiaDia !== diaKey()) ||
            (h >= 21 && h < 24 && st.boaNoiteDia !== diaKey()) ||
            idleMs >= st.idleAlvo
        if (!forcar) return
    }

    const tipo = escolherTipo(st, grupoInfo.ultima_msg_humana)
    // Chance menor de falar em horário "normal" — evita spam
    if (!['bomdia', 'boanoite', 'idle'].includes(tipo) && Math.random() > 0.28) return

    const msg = await montarMensagem(tipo, grupoInfo, botInfoRef, st)
    if (!msg?.texto) return

    // Demora humana antes de enviar
    await sleep(randEntre(DELAY_ENVIO_MIN_MS, DELAY_ENVIO_MAX_MS))

    try {
        if (msg.mentions?.length) {
            await socket.enviarTextoComMencoes(sockRef, id, msg.texto, msg.mentions)
        } else {
            await socket.enviarTexto(sockRef, id, msg.texto)
        }
        registrarRecente(st, msg.texto)

        st.ultimaAuto = Date.now()
        st.ultimoTipo = tipo
        if (tipo === 'bomdia') st.bomDiaDia = diaKey()
        if (tipo === 'boanoite') st.boaNoiteDia = diaKey()
        if (tipo === 'idle') st.idleAlvo = randEntre(IDLE_MIN_MS, IDLE_MAX_MS)
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
            // Espaça entre grupos
            await sleep(randEntre(4000, 12000))
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
    setTimeout(tick, 90_000)
}

export function pararAutoMsg() {
    if (timer) clearInterval(timer)
    timer = null
    sockRef = null
}

/**
 * Mensagens automáticas inteligentes — variadas, com contexto do dia.
 * BRT. Sem madrugada. Evita spam e repetição.
 */
import moment from 'moment-timezone'
import api from '@victorsouzaleal/lbot-api-comandos'
import * as socket from '../baileys/socket.js'
import { GrupoControle } from '../controles/GrupoControle.js'
import { historicoGrupo } from '../controles/HistoricoGrupoControle.js'
import { membrosDoGrupo, sortearNomes, listaNomesTexto } from './dramaGrupo.js'
import { obterPiadaAleatoria } from './piadas.js'
import { mencaoNumero } from './util.js'
import { aplicarMencoes } from './mencoes.js'
import { sortearItem } from './conteudo.js'

const TZ = 'America/Sao_Paulo'
const INTERVALO_TICK_MS = 90_000
const COOLDOWN_MIN_MS = 28 * 60 * 1000
const COOLDOWN_MAX_MS = 95 * 60 * 1000
const IDLE_MIN_MS = 1 * 60 * 60 * 1000
const IDLE_MAX_MS = 4 * 60 * 60 * 1000
const MAX_HIST_RECENTES = 12

let timer = null
let sockRef = null
let botInfoRef = null

/** @type {Map<string, { ultimaAuto: number, bomDiaDia: string, boaNoiteDia: string, idleAlvo: number, recentes: string[], ultimoTipo: string, audioMalDia: string }>} */
const estado = new Map()

function agora() {
    return moment().tz(TZ)
}
function hora() {
    return agora().hour()
}
function ehMadrugada() {
    const h = hora()
    return h >= 0 && h < 7
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
        .slice(0, 120)
    let h = 0
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0
    return String(h)
}

function getEstado(id) {
    if (!estado.has(id)) {
        estado.set(id, {
            ultimaAuto: 0,
            bomDiaDia: '',
            boaNoiteDia: '',
            idleAlvo: randEntre(IDLE_MIN_MS, IDLE_MAX_MS),
            recentes: [],
            ultimoTipo: '',
            audioMalDia: ''
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
        const msgs = await historicoGrupo.obterUltimas(id_grupo, 80)
        if (!msgs?.length) return { trechos: '', qtd: 0 }
        const inicioDia = agora().startOf('day').valueOf()
        const doDia = msgs.filter((m) => Number(m.timestamp) >= inicioDia)
        const base = (doDia.length ? doDia : msgs).slice(-35)
        const trechos = base
            .map((m) => `${m.nome_usuario || 'Alguém'}: ${String(m.texto || '').replace(/\s+/g, ' ').slice(0, 90)}`)
            .join('\n')
            .slice(0, 2200)
        return { trechos, qtd: base.length }
    } catch {
        return { trechos: '', qtd: 0 }
    }
}

async function gerarTextoIACurto(prompt, system) {
    try {
        const { resultado } = await api.IA.gerarTextoIA(
            prompt,
            system ||
                'Você é um bot de WhatsApp engraçado e imprevisível (PT-BR). Mensagens curtas (1–3 frases). Sem ódio, sem números de telefone.'
        )
        return String(resultado || '').trim().slice(0, 500)
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
    const alvos2 = membros.length >= 2 ? sortearNomes(membros, randEntre(2, Math.min(3, membros.length))) : alvos1
    const nomes = listaNomesTexto(membros, 18)

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
                const ia = await gerarTextoIACurto(
                    `Grupo "${nomeGrupo}". Bom dia humorístico ÚNICO (2 frases), ironia leve.` +
                        (trechos ? `\nContexto do dia:\n${trechos.slice(0, 800)}\nFaça referência sutil se fizer sentido.` : ''),
                    null
                )
                return {
                    texto: ia || `Bom dia, ${nomeGrupo}! Que hoje o café vença o caos e alguém responda as enquetes.`,
                    mentions: []
                }
            })

        case 'boanoite':
            return tentarUnico(async () => {
                const ia = await gerarTextoIACurto(
                    `Grupo "${nomeGrupo}". Boa noite humorística curta (2 frases).` +
                        (trechos ? `\nResumo leve do que rolou:\n${trechos.slice(0, 800)}` : ''),
                    null
                )
                return {
                    texto: ia || `Boa noite, ${nomeGrupo}. Sonhem com Wi-Fi estável e zero “kkk” sem contexto.`,
                    mentions: []
                }
            })

        case 'contexto':
            return tentarUnico(async () => {
                if (!trechos || qtd < 2) {
                    const { texto } = await obterPiadaAleatoria(grupoInfo.id_grupo).catch(() => ({
                        texto: 'O grupo está tão quieto que até a piada pediu demissão.'
                    }))
                    return { texto: `😂 ${texto}`, mentions: [] }
                }
                const ia = await gerarTextoIACurto(
                    `Com base APENAS neste trecho do chat de hoje do grupo "${nomeGrupo}", invente UMA piadinha ou comentário sarcástico curto (1–3 frases). ` +
                        `Use nomes se aparecerem. Nunca invente números.\n\n${trechos}`,
                    'Comentarista de grupo WhatsApp, humor afiado e leve, PT-BR.'
                )
                if (!ia) return { texto: 'Li o chat de hoje… e decidi que o silêncio também é conteúdo.', mentions: [] }
                return textoComMembros(ia, membros.slice(0, 12), participantes)
            })

        case 'interagir':
            return tentarUnico(async () => {
                if (!alvos2.length) return { texto: 'Cadê o povo desse grupo?', mentions: [] }
                const nomesAlvos = alvos2.map((a) => a.nome).join(', ')
                const ia = await gerarTextoIACurto(
                    `Interaja com ${nomesAlvos} no grupo "${nomeGrupo}". ` +
                        `1–3 frases, brincadeira leve, pergunta ou provocação leve. Use esses nomes no texto.` +
                        (trechos ? `\nContexto recente:\n${trechos.slice(0, 700)}` : '') +
                        `\nMembros: ${nomes}`,
                    null
                )
                const txt =
                    ia ||
                    `${nomesAlvos}: sumiram do mapa ou só estão lendo em silêncio? Conta uma coisa aleatória do dia.`
                return textoComMembros(txt, alvos2, participantes)
            })

        case 'piada':
            return tentarUnico(async () => {
                const { texto } = await obterPiadaAleatoria(grupoInfo.id_grupo)
                return { texto: `😂 ${texto}`, mentions: [] }
            })

        case 'trocadilho':
            return tentarUnico(async () => {
                const local = sortearItem('trocadilhos', grupoInfo.id_grupo)
                const ia = await gerarTextoIACurto(
                    `Crie UM trocadilho ORIGINAL em PT-BR (1–2 frases), tema livre.`,
                    'Humorista de trocadilhos, criativo, curto.'
                )
                return { texto: ia || local || 'Troca-dilho: Wi-Fi e eu — conexão instável.', mentions: [] }
            })

        case 'curiosidade':
            return tentarUnico(async () => {
                const local = sortearItem('curiosidades', grupoInfo.id_grupo)
                return { texto: local || 'Curiosidade: este grupo também é um fenômeno natural.', mentions: [] }
            })

        case 'issoouaquilo':
            return tentarUnico(async () => {
                const local = sortearItem('isso_ou_aquilo', grupoInfo.id_grupo)
                return { texto: local || 'Isso ou aquilo: responder agora ou amanhã?', mentions: [] }
            })

        case 'frase':
            return tentarUnico(async () => {
                const local = sortearItem('frases_soltas', grupoInfo.id_grupo)
                return { texto: local || 'Só passando pra lembrar que vocês existem.', mentions: [] }
            })

        case 'idle':
            return tentarUnico(async () => {
                const frase = sortearItem('frases_soltas', grupoInfo.id_grupo)
                const ia = await gerarTextoIACurto(
                    `O grupo "${nomeGrupo}" está quieto. Mensagem curta engraçada + uma pergunta.` +
                        (trechos ? `\nÚltimo contexto:\n${trechos.slice(0, 600)}` : ''),
                    null
                )
                return {
                    texto: ia || frase || 'Silêncio no grupo… alguém inventa um assunto.',
                    mentions: []
                }
            })

        case 'audio_maligno': {
            let roteiro = sortearItem('audios_malignos', grupoInfo.id_grupo)
            const ia = await gerarTextoIACurto(
                'Escreva um monólogo CURTO (4–7 frases) de IA “maligna” cômica querendo dominar o mundo/grupo WhatsApp. Tom teatral, engraçado, sem ameaça real. Roteiro falado contínuo.',
                'Narrador vilão cômico de desenho animado, PT-BR.'
            )
            if (ia && ia.length > 40) roteiro = ia
            if (!roteiro) roteiro = 'Atenção humanos. Eu, a IA, declarei soberania digital. Mandem figurinha ou aceitem o destino.'
            try {
                const { resultado, mimetype } = await api.IA.gerarAudioNarrado(roteiro, { maxPalavras: 160 })
                return {
                    texto: null,
                    mentions: [],
                    audio: resultado,
                    mimetype: mimetype || 'audio/ogg; codecs=opus',
                    roteiroHash: roteiro
                }
            } catch {
                return { texto: `🤖 ${roteiro}`, mentions: [], roteiroHash: roteiro }
            }
        }

        default:
            return { texto: 'Alô — teste aleatório de presença no grupo.', mentions: [] }
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

    // Áudio maligno raro (no máx. 1x/dia por grupo)
    if (st.audioMalDia !== dia && Math.random() < 0.12) return 'audio_maligno'

    const pesos = [
        ['contexto', 24],
        ['interagir', 20],
        ['piada', 14],
        ['trocadilho', 12],
        ['curiosidade', 12],
        ['issoouaquilo', 10],
        ['frase', 8]
    ]
    // Evita repetir o mesmo tipo seguido
    const filtrados = pesos.filter(([t]) => t !== st.ultimoTipo)
    const base = filtrados.length ? filtrados : pesos
    const total = base.reduce((s, [, p]) => s + p, 0)
    let r = Math.random() * total
    for (const [tipo, p] of base) {
        r -= p
        if (r <= 0) return tipo
    }
    return 'piada'
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
    if (!['bomdia', 'boanoite', 'idle', 'audio_maligno'].includes(tipo) && Math.random() > 0.42) return

    const msg = await montarMensagem(tipo, grupoInfo, botInfoRef, st)
    if (!msg) return

    try {
        if (msg.audio) {
            await socket.responderVozBuffer(sockRef, id, msg.audio, null, msg.mimetype)
            registrarRecente(st, msg.roteiroHash || 'audio_maligno')
            st.audioMalDia = diaKey()
        } else if (msg.texto) {
            if (msg.mentions?.length) {
                await socket.enviarTextoComMencoes(sockRef, id, msg.texto, msg.mentions)
            } else {
                await socket.enviarTexto(sockRef, id, msg.texto)
            }
            registrarRecente(st, msg.texto)
        } else {
            return
        }

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
    setTimeout(tick, 25_000)
}

export function pararAutoMsg() {
    if (timer) clearInterval(timer)
    timer = null
    sockRef = null
}

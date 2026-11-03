//REQUERINDO MODULOS
import { fileURLToPath } from 'url'
import path from 'path'
import { chdir } from 'process'
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import * as eventosSocket from './bot/baileys/eventosSocket.js'
import { BotControle } from './bot/controles/BotControle.js'
import { MensagemControle } from './bot/controles/MensagemControle.js'
import configSocket from './bot/baileys/configSocket.js'
import moment from 'moment-timezone'
import NodeCache from 'node-cache'
import qrcode from 'qrcode-terminal'
import { carregarEnv, env } from './bot/lib/env.js'
import { obterVersaoWaWeb } from './bot/lib/baileysVersion.js'
import { raizProjeto as raizAbs } from './bot/lib/caminhos.js'
import { BUILD_ID, registrarBootMeta } from './bot/lib/boot.js'
import { createRequire } from 'module'

const raizProjeto = raizAbs || path.dirname(fileURLToPath(import.meta.url))
try {
    chdir(raizProjeto)
} catch {
    /* UNC */
}
carregarEnv(raizProjeto)

function versaoBaileys() {
    try {
        const req = createRequire(import.meta.url)
        return req('@whiskeysockets/baileys/package.json')?.version || '?'
    } catch {
        return '?'
    }
}

moment.tz.setDefault('America/Sao_Paulo')

const cacheTentativasEnvio = new NodeCache()

let sockAtual = null
let reconectando = false
let tentativasReconexao = 0
let botInfoCache = null

/** Evita processar a mesma msg 2x (ev.process + ev.on). */
const msgsVistas = new Map()
function marcarMsgVista(m) {
    const ids = (m?.messages || []).map((x) => x?.key?.id).filter(Boolean)
    if (!ids.length) return false
    let todasJaVistas = true
    const agora = Date.now()
    for (const id of ids) {
        if (!msgsVistas.has(id)) todasJaVistas = false
        msgsVistas.set(id, agora)
    }
    if (msgsVistas.size > 3000) {
        const lim = agora - 10 * 60 * 1000
        for (const [k, t] of msgsVistas) {
            if (t < lim) msgsVistas.delete(k)
        }
    }
    return todasJaVistas
}

function encerrarSocketAtual() {
    if (!sockAtual) return
    try {
        sockAtual.ev?.removeAllListeners()
        sockAtual.ws?.close()
        sockAtual.end?.()
    } catch {
        /* */
    }
    sockAtual = null
}

async function refreshBotInfo(bot) {
    try {
        botInfoCache = await bot.obterInformacoesBot()
        return botInfoCache
    } catch (err) {
        console.error('[botInfo]', err?.message || err)
        return botInfoCache
    }
}

/** Garante dono a partir de DONO / DONO_JID no .env (ou padrão do projeto). */
async function garantirDono() {
    const { UsuarioControle } = await import('./bot/controles/UsuarioControle.js')
    const usuarios = new UsuarioControle()
    const bruto =
        env('DONO_JID', 'DONO', 'NUMERO_DONO') ||
        '5511999178699'
    const digits = String(bruto).replace(/\D/g, '')
    if (digits.length < 10) return
    const jid = digits.includes('@') ? bruto : `${digits}@s.whatsapp.net`
    const atual = await usuarios.obterIdDono()
    const atualDigits = String(atual || '').replace(/\D/g, '')
    if (atualDigits === digits) {
        registrarBootMeta({ dono: jid })
        return jid
    }
    await usuarios.cadastrarDono(jid)
    registrarBootMeta({ dono: jid })
    console.log(`[dono] definido: ${jid}`)
    return jid
}

async function connectToWhatsApp() {
    encerrarSocketAtual()

    let inicializacaoCompleta = false
    let eventosEsperando = []
    const sessaoDir = path.join(raizProjeto, 'sessao')

    const [auth, versaoInfo] = await Promise.all([
        useMultiFileAuthState(sessaoDir),
        obterVersaoWaWeb()
    ])
    const { state: estadoAuth, saveCreds } = auth
    const versaoWaWeb = versaoInfo.version
    const bailVer = versaoBaileys()

    registrarBootMeta({
        baileys: bailVer,
        wa: versaoWaWeb.join('.'),
        raiz: raizProjeto,
        cwd: process.cwd(),
        sessao: sessaoDir,
        build: BUILD_ID
    })

    const c = makeWASocket(configSocket(estadoAuth, cacheTentativasEnvio, versaoWaWeb))
    sockAtual = c
    const bot = new BotControle()

    new MensagemControle().podarMensagensAntigas().catch((e) => {
        console.error('[cache msgs]', e?.message || e)
    })

    const encaminharUpsert = (m) => {
        if (!m) return
        if (marcarMsgVista(m)) return
        if (!inicializacaoCompleta) {
            eventosEsperando.push({ evento: 'messages.upsert', dados: m })
            return
        }
        const sock = c
        // Não await — libera o buffer do Baileys imediatamente (crítico no Linux)
        setImmediate(() => {
            if (sockAtual !== sock) return
            const bi = botInfoCache
            if (!bi) {
                console.error('[msg] sem botInfo — mensagem ignorada')
                return
            }
            eventosSocket.receberMensagem(sock, m, bi).catch((err) => {
                console.error('[messages.upsert]', err?.message || err)
            })
        })
    }

    /**
     * Baileys 7: ev.process é o caminho oficial do buffer.
     * Também ouvimos ev.on('messages.upsert') — no Linux o fan-out individual
     * às vezes entrega notify que o process já consolidou de forma estranha.
     */
    c.ev.process(async (events) => {
        if (sockAtual !== c) return

        if (events['connection.update']) {
            const update = events['connection.update']
            const { connection, lastDisconnect, qr } = update

            if (qr) {
                console.log('\n[QR] Escaneie o QR Code abaixo com o WhatsApp:\n')
                try {
                    qrcode.generate(qr, { small: true })
                } catch (err) {
                    console.log('[QR] (terminal) ' + qr)
                    console.error('[QR] falha ao desenhar:', err?.message || err)
                }
            }
            if (connection) console.log(`[conexão] ${connection}`)
            if (lastDisconnect?.error) {
                console.log(`[⚠️] Desconectado: ${lastDisconnect.error}`)
            }

            let necessarioReconectar = false
            if (connection === 'open') {
                reconectando = false
                tentativasReconexao = 0
                const botInfo = await refreshBotInfo(bot)
                if (!botInfo) return

                registrarBootMeta({
                    prefixo: botInfo.prefixo,
                    numero: botInfo.numero_bot,
                    lid: botInfo.lid_bot
                })

                await garantirDono().catch((e) => console.error('[dono]', e?.message || e))
                await eventosSocket.conexaoAberta(c, botInfo)
                inicializacaoCompleta = true
                await eventosSocket.atualizacaoDadosGrupos(c, botInfo).catch((e) => {
                    console.error('[grupos.init]', e?.message || e)
                })
                await eventosSocket.realizarEventosEspera(c, eventosEsperando, botInfo)
                eventosEsperando = []
            } else if (connection === 'close') {
                const botInfo = (await refreshBotInfo(bot)) || {}
                necessarioReconectar = await eventosSocket.conexaoEncerrada(update, botInfo)
            }

            if (necessarioReconectar && !reconectando) {
                reconectando = true
                const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
                const base =
                    statusCode == DisconnectReason.connectionReplaced || statusCode == 440
                        ? 8000
                        : 2000
                const delay = Math.min(30000, base * 2 ** tentativasReconexao)
                console.log(`[🔄] Reconectando em ${delay / 1000}s...`)
                tentativasReconexao++
                await new Promise((res) => setTimeout(res, delay))
                connectToWhatsApp()
            }
        }

        if (events['creds.update']) {
            await saveCreds()
        }

        if (events['messages.upsert']) {
            encaminharUpsert(events['messages.upsert'])
        }

        if (events['group-participants.update']) {
            const atualizacao = events['group-participants.update']
            if (inicializacaoCompleta && botInfoCache) {
                setImmediate(() => {
                    eventosSocket
                        .atualizacaoParticipantesGrupo(c, atualizacao, botInfoCache)
                        .catch(() => {})
                })
            } else {
                eventosEsperando.push({ evento: 'group-participants.update', dados: atualizacao })
            }
        }

        if (events['groups.upsert']) {
            const grupo = events['groups.upsert']
            if (inicializacaoCompleta && botInfoCache) {
                setImmediate(() => {
                    eventosSocket.adicionadoEmGrupo(c, grupo, botInfoCache).catch(() => {})
                })
            } else {
                eventosEsperando.push({ evento: 'groups.upsert', dados: grupo })
            }
        }

        if (events['groups.update']) {
            const grupos = events['groups.update']
            if (grupos.length == 1 && grupos[0].participants == undefined) {
                if (inicializacaoCompleta) {
                    setImmediate(() => {
                        eventosSocket.atualizacaoDadosGrupo(grupos[0]).catch(() => {})
                    })
                } else {
                    eventosEsperando.push({ evento: 'groups.update', dados: grupos })
                }
            }
        }
    })

    // Backup: fan-out individual (mesmo payload que o process, deduplicado)
    c.ev.on('messages.upsert', (m) => {
        if (sockAtual !== c) return
        encaminharUpsert(m)
    })
}

connectToWhatsApp()

function ehRuidoSessaoSignal(args) {
    const texto = args
        .map((a) => {
            if (a instanceof Error) return `${a.name} ${a.message}`
            if (typeof a === 'string') return a
            try {
                return JSON.stringify(a)
            } catch {
                return String(a)
            }
        })
        .join(' ')
    return /Failed to decrypt message with any known session|Over 2000 messages into the future|SessionError/i.test(
        texto
    )
}

const _log = console.log.bind(console)
const _err = console.error.bind(console)
console.log = (...args) => {
    if (!ehRuidoSessaoSignal(args)) _log(...args)
}
console.error = (...args) => {
    if (!ehRuidoSessaoSignal(args)) _err(...args)
}

process.on('unhandledRejection', (err) => {
    if (ehRuidoSessaoSignal([err])) return
    console.error('[UNHANDLED]', err?.message || err)
})
process.on('uncaughtException', (err) => {
    if (ehRuidoSessaoSignal([err])) return
    console.error('[UNCAUGHT]', err?.message || err)
})

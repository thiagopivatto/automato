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
import { carregarEnv } from './bot/lib/env.js'
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

async function botInfoSafe(bot) {
    try {
        return await Promise.race([
            bot.obterInformacoesBot(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout botInfo')), 4000))
        ])
    } catch (err) {
        console.error('[botInfo]', err?.message || err)
        return null
    }
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

    // ---- listeners individuais (mais estável no Linux que ev.process) ----

    c.ev.on('connection.update', async (update) => {
        if (sockAtual !== c) return
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
            const botInfo = await botInfoSafe(bot)
            if (!botInfo) return

            registrarBootMeta({
                prefixo: botInfo.prefixo,
                numero: botInfo.numero_bot,
                lid: botInfo.lid_bot
            })

            await eventosSocket.conexaoAberta(c, botInfo)
            inicializacaoCompleta = true
            await eventosSocket.atualizacaoDadosGrupos(c, botInfo).catch((e) => {
                console.error('[grupos.init]', e?.message || e)
            })
            await eventosSocket.realizarEventosEspera(c, eventosEsperando, botInfo)
            eventosEsperando = []
        } else if (connection === 'close') {
            const botInfo = (await botInfoSafe(bot)) || {}
            necessarioReconectar = await eventosSocket.conexaoEncerrada(update, botInfo)
        }

        if (necessarioReconectar && !reconectando) {
            reconectando = true
            const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
            const base =
                statusCode == DisconnectReason.connectionReplaced || statusCode == 440 ? 8000 : 2000
            const delay = Math.min(30000, base * 2 ** tentativasReconexao)
            console.log(`[🔄] Reconectando em ${delay / 1000}s...`)
            tentativasReconexao++
            await new Promise((res) => setTimeout(res, delay))
            connectToWhatsApp()
        }
    })

    c.ev.on('creds.update', saveCreds)

    c.ev.on('messages.upsert', async (m) => {
        if (sockAtual !== c) return
        if (!inicializacaoCompleta) {
            eventosEsperando.push({ evento: 'messages.upsert', dados: m })
            return
        }
        const botInfo = await botInfoSafe(bot)
        if (!botInfo) return
        // fora da fila do Baileys — não bloqueia outros eventos
        setImmediate(() => {
            if (sockAtual !== c) return
            eventosSocket.receberMensagem(c, m, botInfo).catch((err) => {
                console.error('[messages.upsert]', err?.message || err)
            })
        })
    })

    c.ev.on('group-participants.update', async (atualizacao) => {
        if (sockAtual !== c) return
        const botInfo = await botInfoSafe(bot)
        if (!botInfo) return
        if (inicializacaoCompleta) {
            await eventosSocket.atualizacaoParticipantesGrupo(c, atualizacao, botInfo)
        } else {
            eventosEsperando.push({ evento: 'group-participants.update', dados: atualizacao })
        }
    })

    c.ev.on('groups.upsert', async (grupo) => {
        if (sockAtual !== c) return
        const botInfo = await botInfoSafe(bot)
        if (!botInfo) return
        if (inicializacaoCompleta) {
            await eventosSocket.adicionadoEmGrupo(c, grupo, botInfo)
        } else {
            eventosEsperando.push({ evento: 'groups.upsert', dados: grupo })
        }
    })

    c.ev.on('groups.update', async (grupos) => {
        if (sockAtual !== c) return
        if (grupos.length == 1 && grupos[0].participants == undefined) {
            if (inicializacaoCompleta) await eventosSocket.atualizacaoDadosGrupo(grupos[0])
            else eventosEsperando.push({ evento: 'groups.update', dados: grupos })
        }
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

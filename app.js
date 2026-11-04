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
import {
    raizProjeto as raizAbs,
    caminhoSessao,
    dirDados,
    garantirPastasRuntime
} from './bot/lib/caminhos.js'
import { BUILD_ID, registrarBootMeta } from './bot/lib/boot.js'
import { incrMetrica, logWarn, logInfo } from './bot/lib/logger.js'
import { filtrarMsgsNovas, carregarDedupDisco, liberarMsgId } from './bot/lib/dedupMsgs.js'
import { createRequire } from 'module'

const raizProjeto = raizAbs || path.dirname(fileURLToPath(import.meta.url))
try {
    chdir(raizProjeto)
} catch {
    /* UNC */
}
carregarEnv(raizProjeto)
await garantirPastasRuntime().catch((e) => console.warn('[pastas]', e?.message || e))

// IA/API: import direto via bot/lib/lbotApi.js (vendor). Sync só se forçado.
if (!/^(1|true|sim|on)$/i.test(String(process.env.ULTRON_SKIP_VENDOR_SYNC || '1'))) {
    try {
        await import('./scripts/sync-vendor.js')
    } catch (err) {
        console.warn(`[sync-vendor] ${err?.message || err}`)
    }
}

// Smoke vendor (fonte única)
try {
    const api = (await import('./bot/lib/lbotApi.js')).default
    if (typeof api?.IA?.obterRespostaIA !== 'function') {
        console.warn('[boot] vendor IA.obterRespostaIA ausente')
    } else {
        logInfo('vendor IA ok', { build: BUILD_ID, data: dirDados })
    }
} catch (err) {
    console.warn(`[boot] vendor: ${err?.message || err}`)
}

// SQLite + migração NeDB (se necessário)
try {
    const { iniciarDb } = await import('./bot/db/sqlite.js')
    await iniciarDb()
} catch (err) {
    console.warn(`[db] ${err?.message || err}`)
}

try {
    const { iniciarHealthLocal } = await import('./bot/lib/health.js')
    iniciarHealthLocal()
} catch (err) {
    console.warn(`[health] ${err?.message || err}`)
}

await carregarDedupDisco().catch((e) => console.warn('[dedup]', e?.message || e))

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

const MAX_EVENTOS_ESPERA = 200

function empilharEventoEspera(arr, item) {
    if (arr.length >= MAX_EVENTOS_ESPERA) {
        arr.shift()
        logWarn('eventosEsperando cheio — descartando o mais antigo', { cap: MAX_EVENTOS_ESPERA })
    }
    arr.push(item)
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

/** Garante dono a partir de DONO / DONO_JID / NUMERO_DONO no .env (obrigatório). */
async function garantirDono() {
    const { UsuarioControle } = await import('./bot/controles/UsuarioControle.js')
    const usuarios = new UsuarioControle()
    const bruto = env('DONO_JID', 'DONO', 'NUMERO_DONO')
    const digits = String(bruto || '').replace(/\D/g, '')
    if (digits.length < 10) {
        console.warn(
            '[dono] DONO ausente ou inválido no .env — defina DONO=5511999999999 (DDI+número, só dígitos). Sem isso, use !admin uma vez no PV para cadastrar.'
        )
        return
    }
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
    const sessaoDir = caminhoSessao()

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
    import('./bot/modelos/HistoricoGrupo.js')
        .then(({ HistoricoGrupo }) => new HistoricoGrupo().podaPeriodica())
        .catch((e) => console.error('[historico poda]', e?.message || e))

    const encaminharUpsert = (m) => {
        if (!m) return
        const filtrado = filtrarMsgsNovas(m)
        if (!filtrado) return
        if (!inicializacaoCompleta) {
            empilharEventoEspera(eventosEsperando, { evento: 'messages.upsert', dados: filtrado })
            return
        }
        const sock = c
        // Não await — libera o buffer do Baileys imediatamente (crítico no Linux)
        setImmediate(() => {
            if (sockAtual !== sock) return
            const bi = botInfoCache
            if (!bi) {
                console.error('[msg] sem botInfo — mensagem adiada')
                incrMetrica('msgs_ignoradas')
                for (const msg of filtrado.messages || []) liberarMsgId(msg?.key?.id)
                return
            }
            incrMetrica('msgs', filtrado.messages?.length || 1)
            eventosSocket.receberMensagem(sock, filtrado, bi).catch((err) => {
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
                let botInfo = await refreshBotInfo(bot)
                if (!botInfo) {
                    logWarn('open sem botInfo — tentando defaults / re-read')
                    try {
                        botInfo = await bot.obterInformacoesBot()
                        botInfoCache = botInfo
                    } catch (e) {
                        console.error('[botInfo.open]', e?.message || e)
                    }
                    if (!botInfo) {
                        // Não ficar preso dropando msgs: força reconnect curto
                        necessarioReconectar = true
                    }
                }

                if (botInfo) {
                    registrarBootMeta({
                        prefixo: botInfo.prefixo,
                        numero: botInfo.numero_bot,
                        lid: botInfo.lid_bot
                    })

                    await garantirDono().catch((e) => console.error('[dono]', e?.message || e))
                    await eventosSocket.conexaoAberta(c, botInfo)
                    inicializacaoCompleta = true
                    logInfo('conexão aberta', { build: BUILD_ID })
                    await eventosSocket.atualizacaoDadosGrupos(c, botInfo).catch((e) => {
                        console.error('[grupos.init]', e?.message || e)
                    })
                    await eventosSocket.realizarEventosEspera(c, eventosEsperando, botInfo)
                    eventosEsperando = []
                }
            } else if (connection === 'close') {
                const botInfo = (await refreshBotInfo(bot)) || {}
                necessarioReconectar = await eventosSocket.conexaoEncerrada(update, botInfo)
            }

            if (necessarioReconectar && !reconectando) {
                reconectando = true
                incrMetrica('reconnects')
                const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
                const base =
                    statusCode == DisconnectReason.connectionReplaced || statusCode == 440
                        ? 12000
                        : 2000
                const delay = Math.min(45000, base * 2 ** tentativasReconexao)
                console.log(`[🔄] Reconectando em ${delay / 1000}s...`)
                tentativasReconexao++
                try {
                    const { deveAlertarOps, alertarDonoSeCritico } = await import('./bot/lib/logger.js')
                    const motivo = deveAlertarOps()
                    if (motivo && sockAtual) {
                        const { UsuarioControle } = await import('./bot/controles/UsuarioControle.js')
                        const dono = await new UsuarioControle().obterIdDono()
                        if (dono) {
                            await alertarDonoSeCritico(
                                (txt) => sockAtual.sendMessage(dono, { text: txt }),
                                `⚠️ Ultron ops: ${motivo}`
                            )
                        }
                    }
                } catch { /* */ }
                try {
                    await new Promise((res) => setTimeout(res, delay))
                    await connectToWhatsApp()
                } catch (err) {
                    console.error('[reconnect]', err?.message || err)
                } finally {
                    reconectando = false
                }
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
                empilharEventoEspera(eventosEsperando, {
                    evento: 'group-participants.update',
                    dados: atualizacao
                })
            }
        }

        if (events['groups.upsert']) {
            const grupo = events['groups.upsert']
            if (inicializacaoCompleta && botInfoCache) {
                setImmediate(() => {
                    eventosSocket.adicionadoEmGrupo(c, grupo, botInfoCache).catch((e) => {
                        console.error('[groups.upsert]', e?.message || e)
                    })
                })
            } else {
                empilharEventoEspera(eventosEsperando, { evento: 'groups.upsert', dados: grupo })
            }
        }

        if (events['groups.update']) {
            const grupos = events['groups.update']
            if (grupos.length == 1 && grupos[0].participants == undefined) {
                if (inicializacaoCompleta) {
                    setImmediate(() => {
                        eventosSocket.atualizacaoDadosGrupo(grupos[0]).catch((e) => {
                            console.error('[groups.update]', e?.message || e)
                        })
                    })
                } else {
                    empilharEventoEspera(eventosEsperando, { evento: 'groups.update', dados: grupos })
                }
            }
        }
    })

    // Backup upsert só se ULTRON_UPSERT_BACKUP=1 (Linux legacy); default = só ev.process
    if (/^(1|true|sim|on)$/i.test(String(process.env.ULTRON_UPSERT_BACKUP || ''))) {
        c.ev.on('messages.upsert', (m) => {
            if (sockAtual !== c) return
            encaminharUpsert(m)
        })
    }
}

connectToWhatsApp().catch((err) => {
    console.error('[boot]', err?.message || err)
    reconectando = false
    setTimeout(() => {
        connectToWhatsApp().catch((e) => console.error('[boot.retry]', e?.message || e))
    }, 5000)
})

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
    return /Failed to decrypt message with any known session|Over 2000 messages into the future|SessionError|Closing session|SessionEntry|_chains|currentRatchet|pendingPreKey|lastRemoteEphemeralKey/i.test(
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
    try {
        incrMetrica('cmds_erro')
    } catch {
        /* */
    }
})
process.on('uncaughtException', (err) => {
    if (ehRuidoSessaoSignal([err])) return
    console.error('[UNCAUGHT]', err?.message || err)
    import('./bot/lib/dedupMsgs.js')
        .then((m) => m.flushDedupDisco())
        .catch(() => {})
        .finally(() => setTimeout(() => process.exit(1), 400))
})
;['SIGINT', 'SIGTERM'].forEach((sig) => {
    process.on(sig, () => {
        import('./bot/lib/dedupMsgs.js')
            .then((m) => m.flushDedupDisco())
            .catch(() => {})
            .finally(() => process.exit(0))
    })
})

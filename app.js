//REQUERINDO MODULOS
import { fileURLToPath } from 'url'
import path from 'path'
import { chdir } from 'process'
import {makeWASocket, useMultiFileAuthState, DisconnectReason} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import * as eventosSocket from './bot/baileys/eventosSocket.js'
import {BotControle} from './bot/controles/BotControle.js'
import {MensagemControle} from './bot/controles/MensagemControle.js'
import configSocket from './bot/baileys/configSocket.js'
import moment from "moment-timezone"
import NodeCache from 'node-cache'
import qrcode from 'qrcode-terminal'
import { carregarEnv } from './bot/lib/env.js'
import { obterVersaoWaWeb } from './bot/lib/baileysVersion.js'

// UNC/CMD no Windows pode iniciar o processo em C:\Windows; fixa a raiz do projeto
const raizProjeto = path.dirname(fileURLToPath(import.meta.url))
try { chdir(raizProjeto) } catch { /* UNC sem drive letter: Node ainda resolve via import.meta.url */ }
carregarEnv(raizProjeto)

moment.tz.setDefault('America/Sao_Paulo')


//Cache de tentativa de envios
const cacheTentativasEnvio = new NodeCache()

// Garante no máximo uma conexão/reconexão ativa
let sockAtual = null
let reconectando = false
let tentativasReconexao = 0

function encerrarSocketAtual(){
    if(!sockAtual) return
    try {
        sockAtual.ev?.removeAllListeners()
        sockAtual.ws?.close()
        sockAtual.end?.()
    } catch {
        // ignore
    }
    sockAtual = null
}

async function connectToWhatsApp(){
    encerrarSocketAtual()

    let inicializacaoCompleta = false, eventosEsperando = []
    const sessaoDir = path.join(raizProjeto, 'sessao')
    // Auth + versão WA em paralelo
    const [auth, versaoInfo] = await Promise.all([
        useMultiFileAuthState(sessaoDir),
        obterVersaoWaWeb()
    ])
    const { state: estadoAuth, saveCreds } = auth
    const versaoWaWeb = versaoInfo.version
    console.log(`[boot] WA Web ${versaoWaWeb.join('.')} | sessao=${sessaoDir}`)
    const c = makeWASocket(configSocket(estadoAuth, cacheTentativasEnvio, versaoWaWeb))
    sockAtual = c
    const bot = new BotControle()

    // Poda em background — não bloqueia o QR/conexão
    new MensagemControle().podarMensagensAntigas().catch((e) => {
        console.error('[cache msgs]', e?.message || e)
    })
    
    //Escutando novos eventos
    c.ev.process(async(events)=>{
        // Ignora eventos de sockets antigos após reconectar
        if(sockAtual !== c) return

        //Obtendo dados do bot
        const botInfo  = await bot.obterInformacoesBot()

        //Atualização na conexão
        if(events['connection.update']){
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
            if (connection) {
                console.log(`[conexão] ${connection}`)
            }
            if (lastDisconnect?.error) {
                console.log(`[⚠️] Desconectado com erro: ${lastDisconnect.error}`);
            }
            let necessarioReconectar = false
            if(connection == 'open'){
                reconectando = false
                tentativasReconexao = 0
                await eventosSocket.conexaoAberta(c, botInfo)
                // Sempre libera a fila de msgs — falha em grupos não pode travar comandos
                inicializacaoCompleta = true
                await eventosSocket.atualizacaoDadosGrupos(c, botInfo).catch((e) => {
                    console.error('[grupos.init]', e?.message || e)
                })
                // Processa fila direto (sem c.ev.emit — no Baileys 7 o re-emit se perde)
                await eventosSocket.realizarEventosEspera(c, eventosEsperando, botInfo)
                eventosEsperando = []
            } else if (connection == 'close'){
                necessarioReconectar = await eventosSocket.conexaoEncerrada(update, botInfo)
            }

            if(necessarioReconectar && !reconectando) {
                reconectando = true
                const statusCode = (new Boom(lastDisconnect?.error))?.output?.statusCode
                // Conflito (outra sessão aberta): espera mais para não disputar a conexão
                const base = (statusCode == DisconnectReason.connectionReplaced || statusCode == 440) ? 8000 : 2000
                const delay = Math.min(30000, base * (2 ** tentativasReconexao))
                console.log(`[🔄] Tentando reconectar em ${delay / 1000} segundos...`)
                tentativasReconexao++
                await new Promise(res => setTimeout(res, delay))
                connectToWhatsApp()
            }

        }

        // Atualização nas credenciais
        if(events['creds.update']){
            await saveCreds()
        }

        // Ao receber novas mensagens — await no ev.process (Baileys 7 exige)
        if(events['messages.upsert']){
            const m = events['messages.upsert']
            if(inicializacaoCompleta) {
                if(sockAtual !== c) return
                await eventosSocket.receberMensagem(c, m, botInfo)
            } else {
                eventosEsperando.push({evento: 'messages.upsert', dados: m})
            }
        }

        //Ao haver mudanças nos participantes de um grupo
        if(events['group-participants.update']){
            const atualizacao = events['group-participants.update']
            if(inicializacaoCompleta) await eventosSocket.atualizacaoParticipantesGrupo(c, atualizacao, botInfo)
            else eventosEsperando.push({evento: 'group-participants.update', dados: atualizacao})
        }

        //Ao ser adicionado em novos grupos
        if(events['groups.upsert']){
            const grupo = events['groups.upsert']
            if(inicializacaoCompleta) await eventosSocket.adicionadoEmGrupo(c, grupo, botInfo)
            else eventosEsperando.push({evento: 'groups.upsert', dados: grupo})
        }

        //Ao atualizar dados do grupo
        if(events['groups.update']){
            const grupos = events['groups.update']
            if (grupos.length == 1 && grupos[0].participants == undefined){
                if(inicializacaoCompleta) await eventosSocket.atualizacaoDadosGrupo(grupos[0])
                else eventosEsperando.push({evento: 'groups.update', dados: grupos})
            }
        }

    })
}

// Execução principal
connectToWhatsApp()

/** Ruído conhecido do libsignal quando a sessão Signal está dessincronizada. */
function ehRuidoSessaoSignal(args) {
    const texto = args.map((a) => {
        if (a instanceof Error) return `${a.name} ${a.message}`
        if (typeof a === 'string') return a
        try { return JSON.stringify(a) } catch { return String(a) }
    }).join(' ')
    return /Failed to decrypt message with any known session|Over 2000 messages into the future|SessionError/i.test(texto)
}

const _log = console.log.bind(console)
const _err = console.error.bind(console)
console.log = (...args) => { if (!ehRuidoSessaoSignal(args)) _log(...args) }
console.error = (...args) => { if (!ehRuidoSessaoSignal(args)) _err(...args) }

// Evita que erros não tratados derrubem o processo
process.on('unhandledRejection', (err) => {
    if (ehRuidoSessaoSignal([err])) return
    console.error('[UNHANDLED]', err?.message || err)
})
process.on('uncaughtException', (err) => {
    if (ehRuidoSessaoSignal([err])) return
    console.error('[UNCAUGHT]', err?.message || err)
})

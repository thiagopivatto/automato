import pino from 'pino'
import { MensagemControle } from '../controles/MensagemControle.js'
import {isJidBroadcast, makeCacheableSignalKeyStore} from '@whiskeysockets/baileys'

export default function configSocket (state, cacheTentativasEnvio, versaoWaWeb){
    return {
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({level : "silent"}))
        },
        version : versaoWaWeb,
        msgRetryCounterCache : cacheTentativasEnvio,
        defaultQueryTimeoutMs: undefined,
        // syncFullHistory:true inundava a sessão Signal e gerava "Over 2000 messages into the future"
        syncFullHistory: false,
        markOnlineOnConnect: false,
        logger: pino({level : "silent"}),
        shouldIgnoreJid: jid => isJidBroadcast(jid) || jid?.endsWith('@newsletter'),
        getMessage: async (key) => {
            try {
                const mensagem = await new MensagemControle().recuperarMensagem(key.remoteJid, key.id)
                return mensagem || undefined
            } catch {
                return undefined
            }
        }
    }
}
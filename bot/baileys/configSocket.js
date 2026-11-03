import pino from 'pino'
import { MensagemControle } from '../controles/MensagemControle.js'
import { isJidBroadcast, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys'

export default function configSocket(state, cacheTentativasEnvio, versaoWaWeb) {
    return {
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        version: versaoWaWeb,
        msgRetryCounterCache: cacheTentativasEnvio,
        defaultQueryTimeoutMs: undefined,
        // syncFullHistory:true inundava a sessão Signal e gerava "Over 2000 messages into the future"
        syncFullHistory: false,
        markOnlineOnConnect: false,
        // browser[1]=Android → platformType ANDROID → servidor entrega mídia de visualização única.
        // Desktop/Chrome costuma receber só stub "Message absent from node".
        // Se VO continuar como stub: apague a pasta sessao e escaneie o QR de novo.
        browser: ['Ubuntu', 'Android', '13'],
        logger: pino({ level: 'silent' }),
        shouldIgnoreJid: (jid) => isJidBroadcast(jid) || jid?.endsWith('@newsletter'),
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

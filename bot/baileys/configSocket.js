import pino from 'pino'
import { MensagemControle } from '../controles/MensagemControle.js'
import { Browsers, isJidBroadcast, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys'

export default function configSocket(state, cacheTentativasEnvio, versaoWaWeb) {
    return {
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        version: versaoWaWeb,
        msgRetryCounterCache: cacheTentativasEnvio,
        defaultQueryTimeoutMs: 60_000,
        syncFullHistory: false,
        // true ajuda a receber msgs de forma estável em VPS/Linux
        markOnlineOnConnect: true,
        // Web padrão para autenticação por QR.
        browser: Browsers.ubuntu('Chrome'),
        printQRInTerminal: false,
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

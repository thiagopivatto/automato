import { Mensagem } from '../modelos/Mensagem.js'
import { WAProto } from '@whiskeysockets/baileys'

export class MensagemControle {
    constructor() {
        this.mensagem = new Mensagem()
    }

    async armazenarMensagem(mensagem) {
        if (!mensagem?.key?.id || !mensagem?.message) return
        const dadosMensagem = {
            chatId: mensagem.key.remoteJid,
            mensagemId: mensagem.key.id,
            mensagem: JSON.stringify(mensagem.message)
        }
        await this.mensagem.armazenarMensagem(dadosMensagem)
    }

    async recuperarMensagem(remoteJid, mensagemId) {
        const dadosMensagem = await this.mensagem.obterMensagem(remoteJid, mensagemId)
        if (!dadosMensagem?.mensagem) return undefined
        try {
            return WAProto.Message.fromObject(JSON.parse(dadosMensagem.mensagem))
        } catch {
            return undefined
        }
    }

    async limparMensagensArmazenadas() {
        await this.mensagem.limparMensagens()
    }

    async podarMensagensAntigas() {
        return this.mensagem.podarAntigas()
    }
}

import { Mensagem } from '../modelos/Mensagem.js'
import { BufferJSON, WAProto } from '@whiskeysockets/baileys'

export class MensagemControle {
    constructor() {
        this.mensagem = new Mensagem()
    }

    async armazenarMensagem(mensagem) {
        if (!mensagem?.key?.id || !mensagem?.message) return
        const dadosMensagem = {
            chatId: mensagem.key.remoteJid,
            mensagemId: mensagem.key.id,
            // BufferJSON preserva mediaKey (JSON.stringify puro zera no fromObject)
            mensagem: JSON.stringify(mensagem.message, BufferJSON.replacer)
        }
        await this.mensagem.armazenarMensagem(dadosMensagem)
    }

    async recuperarMensagem(remoteJid, mensagemId) {
        const dadosMensagem = await this.mensagem.obterMensagem(remoteJid, mensagemId)
        if (!dadosMensagem?.mensagem) return undefined
        try {
            const obj = JSON.parse(dadosMensagem.mensagem, BufferJSON.reviver)
            return WAProto.Message.fromObject(obj)
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

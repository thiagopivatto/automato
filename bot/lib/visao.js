/**
 * Helpers de visão (Gemini) para comandos e histórico.
 */
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import api from '@victorsouzaleal/lbot-api-comandos'
import { tiposMensagem } from '../baileys/mensagem.js'

/** Buffer da imagem da msg atual ou da citação. */
export async function baixarImagemMensagem(mensagemBaileys) {
    const { tipo, mensagem, mensagem_citada, citacao } = mensagemBaileys || {}
    let alvo = null
    if (tipo === tiposMensagem.imagem && mensagem) alvo = mensagem
    else if (citacao?.tipo === tiposMensagem.imagem && (citacao.mensagem || mensagem_citada)) {
        alvo = citacao.mensagem || mensagem_citada
    }
    if (!alvo) return null
    const buf = await downloadMediaMessage(alvo, 'buffer')
    return Buffer.isBuffer(buf) && buf.length ? buf : null
}

/**
 * Descreve imagem (atual ou citada). Retorna string ou lança {erro}.
 */
export async function descreverImagemMensagem(mensagemBaileys, pergunta = '') {
    const buf = await baixarImagemMensagem(mensagemBaileys)
    if (!buf) throw { erro: 'Marque ou envie uma *imagem*.' }
    const { resultado } = await api.IA.analisarImagemIA(buf, pergunta)
    return String(resultado || '').trim()
}

/**
 * Se houver imagem na msg/citação, devolve texto de contexto para o chat.
 */
export async function contextoImagemParaChat(mensagemBaileys, perguntaUsuario = '') {
    try {
        const buf = await baixarImagemMensagem(mensagemBaileys)
        if (!buf) return ''
        const pergunta =
            String(perguntaUsuario || '').trim() ||
            'Descreva o que aparece na imagem de forma objetiva.'
        const { resultado } = await api.IA.analisarImagemIA(
            buf,
            `Com base nesta imagem, responda/analise: ${pergunta}`
        )
        const desc = String(resultado || '').trim()
        if (!desc) return ''
        return `[Conteúdo da imagem]\n${desc}`
    } catch {
        return ''
    }
}

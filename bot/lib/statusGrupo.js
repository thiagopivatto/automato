import {
    downloadMediaMessage,
    generateWAMessageFromContent,
    jidNormalizedUser,
    prepareWAMessageMedia,
    proto
} from '@whiskeysockets/baileys'

/** Publica somente no grupo de origem; nunca usa status@broadcast. */
export async function publicarStatusGrupo(sock, mensagem, {
    baixar = downloadMediaMessage,
    prepararMidia = prepareWAMessageMedia
} = {}) {
    const { id_chat: jid, citacao } = mensagem
    if (!mensagem.mensagem_grupo || !jid?.endsWith('@g.us')) {
        throw new Error('Esse recurso só funciona em grupos.')
    }
    if (!mensagem.mensagem_citada || !citacao) {
        throw new Error('Responda uma mensagem de texto ou imagem com o comando statusgrupo usando o prefixo do bot.')
    }
    if (citacao.mensagem_vunica) {
        throw new Error('Escolha um texto ou uma imagem comum para publicar no status do grupo.')
    }
    const authorJid = jidNormalizedUser(sock.user?.id || '')
    if (!authorJid) throw new Error('O bot ainda não está conectado ao WhatsApp.')
    const contextInfo = {
        isGroupStatus: true,
        featureEligibilities: { canBeReshared: true, canReceiveMultiReact: true },
        statusAttributions: [{ type: proto.StatusAttribution.Type.GROUP_STATUS, groupStatus: { authorJid } }]
    }
    let conteudo
    if (citacao.tipo === 'imageMessage') {
        const buffer = await baixar(citacao.mensagem, 'buffer', {}, {
            logger: sock.logger,
            reuploadRequest: sock.updateMediaMessage?.bind(sock)
        })
        if (!buffer?.length) throw new Error('Não consegui baixar a imagem respondida. Envie a imagem novamente e tente de novo.')
        conteudo = await prepararMidia({
            image: buffer,
            caption: citacao.legenda || '',
            mimetype: citacao.mimetype || 'image/jpeg'
        }, { upload: sock.waUploadToServer, jid })
        conteudo.imageMessage.contextInfo = { ...contextInfo, statusSourceType: proto.ContextInfo.StatusSourceType.IMAGE }
    } else if (['conversation', 'extendedTextMessage'].includes(citacao.tipo)) {
        const texto = String(citacao.corpo || '')
        if (!texto.trim()) throw new Error('A mensagem respondida não tem texto para publicar.')
        conteudo = { extendedTextMessage: {
            text: texto,
            font: 1,
            backgroundArgb: 0xff23313a,
            textArgb: 0xffffffff,
            contextInfo: { ...contextInfo, statusSourceType: proto.ContextInfo.StatusSourceType.TEXT }
        } }
    } else {
        throw new Error('Por enquanto, o status do grupo aceita apenas texto ou imagem neste bot.')
    }
    const gerada = generateWAMessageFromContent(jid, {
        groupStatusMessageV2: { message: conteudo }
    }, { userJid: authorJid })
    // Detecta versões antigas que descartam silenciosamente os campos novos.
    if (!gerada.message?.groupStatusMessageV2?.message) {
        throw new Error('Atualize as dependências do bot: esta versão do Baileys não reconhece status de grupo.')
    }
    await sock.relayMessage(jid, gerada.message, { messageId: gerada.key.id })
    return gerada
}

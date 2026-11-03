import {
    downloadMediaMessage,
    generateWAMessageFromContent,
    getUrlFromDirectPath,
    jidNormalizedUser,
    prepareWAMessageMedia,
    proto
} from '@whiskeysockets/baileys'
import pino from 'pino'

const loggerMidia = pino({ level: 'silent' })

function falhaEtapa(etapa, causa) {
    const err = new Error(`Status do grupo: falha em ${etapa}`, { cause: causa })
    err.etapaStatusGrupo = etapa
    return err
}

export function mensagemErroStatusGrupo(err) {
    const respostas = {
        download: 'Não consegui baixar a imagem respondida. Envie a imagem novamente e responda com o comando. [SG_DOWNLOAD]',
        upload: 'Não consegui preparar ou enviar a imagem aos servidores do WhatsApp. Tente novamente. [SG_UPLOAD]',
        envio: 'Não consegui enviar o status ao grupo. Confira o erro no terminal do bot. [SG_ENVIO]'
    }
    return respostas[err.etapaStatusGrupo] || null
}

export async function baixarImagemStatus(sock, citacao, {
    baixar = downloadMediaMessage,
    opcoesDownload = {}
} = {}) {
    const original = citacao.mensagem
    const imagem = original?.message?.imageMessage
    if (!imagem?.mediaKey || !(imagem.url || imagem.directPath)) {
        throw new Error('A citação não contém os dados para baixar a imagem original; envie a imagem novamente.')
    }
    // downloadMediaMessage rejeita directPath sem url antes mesmo de baixar.
    // A URL é derivada pelo próprio Baileys, preservando chave e caminho originais.
    const baixavel = {
        ...original,
        message: { ...original.message, imageMessage: {
            ...imagem,
            url: imagem.url || getUrlFromDirectPath(imagem.directPath)
        } }
    }
    const contexto = typeof sock.updateMediaMessage === 'function' ? {
        logger: sock.logger || loggerMidia,
        reuploadRequest: sock.updateMediaMessage.bind(sock)
    } : undefined
    return baixar(baixavel, 'buffer', opcoesDownload, contexto)
}

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
        let buffer
        try {
            buffer = await baixarImagemStatus(sock, citacao, { baixar })
            if (!buffer?.length) throw new Error('Download sem conteúdo')
        } catch (err) {
            throw falhaEtapa('download', err)
        }
        try {
            conteudo = await prepararMidia({
                image: buffer,
                caption: citacao.legenda || '',
                mimetype: citacao.mimetype || 'image/jpeg'
            }, { upload: sock.waUploadToServer, jid, logger: sock.logger || loggerMidia })
        } catch (err) {
            throw falhaEtapa('upload', err)
        }
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
    try {
        await sock.relayMessage(jid, gerada.message, { messageId: gerada.key.id })
    } catch (err) {
        throw falhaEtapa('envio', err)
    }
    return gerada
}

import {getContentType } from '@whiskeysockets/baileys'
import {tiposMensagem} from './mensagem.js'
import {delayAleatorio, listaContemJid} from '../lib/util.js'
import api from '@victorsouzaleal/lbot-api-comandos'
import { MensagemControle } from '../controles/MensagemControle.js'

/** Guarda envios do bot p/ getMessage (retries do Baileys/Signal). */
async function guardarEnvio(msg) {
    try {
        if (msg?.key?.id && msg?.message) {
            await new MensagemControle().armazenarMensagem(msg)
        }
    } catch { /* ignore */ }
    return msg
}

// Gerais
export const deletarMensagem = async(c, mensagem, mensagemCitada = false)=>{
    let mensagemDeletada
    if(mensagemCitada){
        mensagemDeletada = {
            remoteJid: mensagem.key.remoteJid,
            fromMe: false,
            id: mensagem.message.extendedTextMessage.contextInfo.stanzaId,
            participant: mensagem.message.extendedTextMessage.contextInfo.participant
        }
    } else{
        const key = mensagem.key || {}
        mensagemDeletada = {
            remoteJid: key.remoteJid,
            fromMe: !!key.fromMe,
            id: key.id,
            participant:
                key.participant ||
                key.participantPn ||
                key.participantAlt ||
                key.participantLid ||
                undefined
        }
        // Em grupos o participant é obrigatório para apagar msg de terceiros
        if (!mensagemDeletada.participant && String(key.remoteJid || '').includes('@g.us')) {
            mensagemDeletada.participant = key.participantPn || key.participantAlt || key.participant
        }
    }
    return await c.sendMessage(mensagem.key.remoteJid, { delete: mensagemDeletada })
}

export const lerMensagem = async(c, id_chat, remetente, id_mensagem) =>{
    return await c.sendReceipt(id_chat, remetente, [id_mensagem], 'read')
}

export const atualizarPresenca = async(c, id_chat, tipo)=>{
    try {
        await c.presenceSubscribe(id_chat)
        await delayAleatorio(200, 400)
        await c.sendPresenceUpdate(tipo, id_chat)
        await delayAleatorio(300, 1000)
        await c.sendPresenceUpdate('paused', id_chat)
    } catch {
        // ignora se a conexão já estiver fechada
    }
}

export const alterarFotoPerfil = async(c, id_chat, bufferImagem)=>{
    return await c.updateProfilePicture(id_chat, bufferImagem)
}

export const alterarStatusPerfil = async(c, status)=>{
    return await c.updateProfileStatus(status)
}

export const encerrarBot = async(c)=>{
    return await c.end(new Error("Comando"))
}

export const obterFotoPerfil = async(c, id_chat)=>{
    return await c.profilePictureUrl(id_chat, "image")
}

export const bloquearContato = async(c, id_usuario)=>{
    return await c.updateBlockStatus(id_usuario, "block")
}

export const desbloquearContato = async(c, id_usuario)=>{
    return await c.updateBlockStatus(id_usuario, "unblock")
}

export const obterNumeroHost = async(c)=>{ 
    let id = c.user.id.replace(/:[0-9]+/ism, '')
    return id
}

export const obterLidHost = async(c)=>{
    try {
        const lid = c.user?.lid || c.user?.idAlt || null
        if (!lid) return null
        return String(lid).replace(/:[0-9]+/ism, '')
    } catch {
        return null
    }
}

/** Verifica se algum JID do usuário está na lista (suporta @lid e @s.whatsapp.net). */
export { listaContemJid }

/** Atualiza flags de admin com metadados ao vivo do WhatsApp (corrige mismatch LID). */
export const atualizarFlagsAdminGrupo = async(c, mensagemBaileys, botInfo)=>{
    if (!mensagemBaileys?.mensagem_grupo || !mensagemBaileys?.grupo) return mensagemBaileys
    try {
        const meta = await c.groupMetadata(mensagemBaileys.id_chat)
        const botJids = [
            botInfo.numero_bot,
            botInfo.lid_bot,
            c.user?.id?.replace(/:[0-9]+/ism, ''),
            c.user?.lid ? String(c.user.lid).replace(/:[0-9]+/ism, '') : null
        ].filter(Boolean)
        const remetente = mensagemBaileys.remetente
        const participantes = []
        const admins = []
        for (const p of (meta.participants || [])) {
            if (p.id) participantes.push(p.id)
            if (p.phoneNumber && p.phoneNumber !== p.id) participantes.push(p.phoneNumber)
            if (p.admin) {
                if (p.id) admins.push(p.id)
                if (p.phoneNumber && p.phoneNumber !== p.id) admins.push(p.phoneNumber)
            }
        }
        mensagemBaileys.grupo.participantes = [...new Set(participantes)]
        mensagemBaileys.grupo.admins = [...new Set(admins)]
        mensagemBaileys.grupo.bot_admin = listaContemJid(admins, ...botJids)
        const msgKey = mensagemBaileys.mensagem?.key || {}
        mensagemBaileys.grupo.usuario_admin = listaContemJid(
            admins,
            remetente,
            msgKey.participant,
            msgKey.participantPn,
            msgKey.participantAlt
        )
    } catch {
        // mantém flags anteriores
    }
    return mensagemBaileys
}

export const obterContatosBloqueados = async (c) => { 
    return await c.fetchBlocklist();
};



// Envio de mensagens
export const enviarTexto = async(c, id_chat, texto)=>{
    await atualizarPresenca(c, id_chat, "composing")
    const enviada = await c.sendMessage(id_chat, { text: String(texto ?? ''), linkPreview: null })
    await guardarEnvio(enviada)
    return enviada
}

export const retransmitirMensagem = async(c, id_chat, mensagem, mensagemCitacao)=>{
    mensagem[Object.keys(mensagem)[0]].contextInfo = {
        stanzaId: mensagemCitacao.key.id,
        remoteJid: mensagemCitacao.key.remoteJid,
        participant: mensagemCitacao.key.participant || mensagemCitacao.key.remoteJid,
        fromMe: mensagemCitacao.key.fromMe,
        quotedMessage: {}
    }
    return await c.relayMessage(id_chat, mensagem, {})
}

export const enviarEnquete = async(c, id_chat, nomeEnquete, valoresEnquete)=>{
    return await c.sendMessage(id_chat, {poll : {name: nomeEnquete, values: valoresEnquete, selectableCount: 1}})
}

export const enviarLinkComPrevia = async(c, id_chat, texto) =>{
    await atualizarPresenca(c, id_chat, "composing")
    return await c.sendMessage(id_chat, {text: texto})
}

export const enviarTextoComMencoes = async(c, id_chat, texto, mencionados)=>{ 
    await atualizarPresenca(c, id_chat, "composing")
    return await c.sendMessage(id_chat, {text : texto , mentions: mencionados})
}

export const retransmitirMensagemMarcando = async(c, id_chat, mensagem, mencionados)=>{
    let tipoMensagem = getContentType(mensagem.message)
    const tags = (mencionados || []).map(j => `@${String(j).split('@')[0]}`).join(' ')
    if(tipoMensagem == "conversation"){
        let textoMensagem = mensagem.message[tipoMensagem]
        mensagem.message = {
            extendedTextMessage : {
                text: `${textoMensagem}\n\n${tags}`,
                contextInfo : {
                    mentionedJid: mencionados,
                    isForwarded: true
                }
            }
        }
    } else if (tipoMensagem == "extendedTextMessage") {
        const textoAtual = mensagem.message.extendedTextMessage?.text || ''
        mensagem.message.extendedTextMessage.text = `${textoAtual}\n\n${tags}`
        mensagem.message.extendedTextMessage.contextInfo = {
            ...(mensagem.message.extendedTextMessage.contextInfo || {}),
            mentionedJid: mencionados,
            isForwarded: true
        }
    } else {
        mensagem.message[tipoMensagem].contextInfo = {
            ...(mensagem.message[tipoMensagem].contextInfo || {}),
            mentionedJid : mencionados,
            isForwarded: true
        } 
    }
    return await c.relayMessage(id_chat, mensagem.message, {})
}

export const enviarFigurinha = async(c, id_chat, sticker)=>{ 
    return await c.sendMessage(id_chat, {sticker})
}

export const enviarArquivoUrl = async(c, tipo, id_chat, url, legenda) =>{ 
    if(tipo == tiposMensagem.imagem){
        return await c.sendMessage(id_chat, {image: {url}, caption: legenda})
    }
}

export const responderTexto = async(c, id_chat, texto, mensagemCitacao)=>{ 
    await atualizarPresenca(c, id_chat, "composing")
    const enviada = await c.sendMessage(
        id_chat,
        { text: String(texto ?? ''), linkPreview: null },
        { quoted: mensagemCitacao }
    )
    await guardarEnvio(enviada)
    return enviada
}

export const responderArquivoLocal = async(c, tipo, id_chat, caminhoArquivo, legenda, mensagemCitacao, mimetype = '') =>{ 
    if(tipo == tiposMensagem.imagem){
        return await c.sendMessage(id_chat, {image: {url: caminhoArquivo}, caption: legenda}, {quoted: mensagemCitacao})
    } else if (tipo == tiposMensagem.video){
        let base64Thumb = (await api.Videos.obterThumbnailVideo(caminhoArquivo)).resultado
        return await c.sendMessage(id_chat, {video: {url: caminhoArquivo}, mimetype, caption: legenda, jpegThumbnail: base64Thumb}, {quoted: mensagemCitacao})
    } else if (tipo == tiposMensagem.audio){
        return await c.sendMessage(id_chat, {audio: {url: caminhoArquivo}, mimetype}, {quoted: mensagemCitacao})
    }
}

export const responderArquivoUrl = async(c, tipo, id_chat, url, legenda, mensagemCitacao, mimetype = '') =>{ 
    if(tipo == tiposMensagem.imagem){
        return await c.sendMessage(id_chat, {image: {url}, caption: legenda}, {quoted: mensagemCitacao})
    } else if (tipo == tiposMensagem.video){
        let base64Thumb = (await api.Videos.obterThumbnailVideo(url, "url")).resultado
        return await c.sendMessage(id_chat, {video: {url}, mimetype, caption: legenda, jpegThumbnail : base64Thumb}, {quoted: mensagemCitacao})
    } else if (tipo == tiposMensagem.audio){
        return await c.sendMessage(id_chat, {audio: {url}, mimetype}, {quoted: mensagemCitacao})
    }
}

export const responderArquivoBuffer = async(c, tipo, id_chat, buffer, legenda, mensagemCitacao, mimetype = '', extras = {})=>{ 
    let enviada
    if(tipo == tiposMensagem.video){
        let base64Thumb = (await api.Videos.obterThumbnailVideo(buffer, "buffer")).resultado
        enviada = await c.sendMessage(id_chat, {video: buffer, caption: legenda, mimetype, jpegThumbnail: base64Thumb}, {quoted: mensagemCitacao})
    } else if(tipo == tiposMensagem.imagem){
        // PNG com alpha precisa de mimetype image/png (rbg / fundo transparente)
        const mimeImg = mimetype || (buffer?.[0] === 0x89 && buffer?.[1] === 0x50 ? 'image/png' : 'image/jpeg')
        enviada = await c.sendMessage(id_chat, {image: buffer, caption: legenda, mimetype: mimeImg}, {quoted: mensagemCitacao})
    } else if (tipo == tiposMensagem.audio){
        const payload = {
            audio: buffer,
            mimetype: mimetype || 'audio/mpeg',
            ptt: !!extras.ptt
        }
        enviada = await c.sendMessage(id_chat, payload, {quoted: mensagemCitacao})
    } else if (tipo == 'documento' || tipo == 'document') {
        enviada = await c.sendMessage(id_chat, {
            document: buffer,
            mimetype: mimetype || 'application/octet-stream',
            fileName: legenda || 'arquivo.bin'
        }, {quoted: mensagemCitacao})
    }
    return guardarEnvio(enviada)
}

/** Envia buffer como nota de voz (PTT / opus). */
export const responderVozBuffer = async(c, id_chat, buffer, mensagemCitacao = null, mimetype = 'audio/ogg; codecs=opus')=>{
    const enviada = await c.sendMessage(id_chat, {
        audio: buffer,
        mimetype,
        ptt: true
    }, mensagemCitacao ? { quoted: mensagemCitacao } : undefined)
    return guardarEnvio(enviada)
}

export const responderComMencoes = async(c, id_chat, texto, mencionados, mensagemCitacao)=>{ 
    await atualizarPresenca(c, id_chat, "composing")
    return await c.sendMessage(id_chat, {text: texto , mentions: mencionados}, {quoted: mensagemCitacao})
}


// Grupos
export const entrarLinkGrupo = async(c, idLink)=>{
    return await c.groupAcceptInvite(idLink)
}

export const revogarLinkGrupo = async(c, id_grupo)=>{
    return await c.groupRevokeInvite(id_grupo)
}

export const obterLinkGrupo = async(c, id_grupo)=>{
    let codigoConvite = await c.groupInviteCode(id_grupo)
    return codigoConvite ? `https://chat.whatsapp.com/${codigoConvite}` : undefined
}


export const sairGrupo = async(c, id_grupo)=>{
    return await c.groupLeave(id_grupo)
}

export const obterInfoConviteGrupo = async(c, link)=>{
    return await c.groupGetInviteInfo(link)
}

export const alterarRestricaoGrupo = async(c, id_grupo, status)=>{
    let config = status ? "announcement" : "not_announcement"
    return await c.groupSettingUpdate(id_grupo, config)
}

export const obterMembrosGrupoPorMetadata = async(grupoMetadata)=>{ 
    let {participants} = grupoMetadata
    let participantes = []
    participants.forEach((participant)=>{
        if (participant.id) participantes.push(participant.id)
        if (participant.phoneNumber && participant.phoneNumber !== participant.id) {
            participantes.push(participant.phoneNumber)
        }
    })
    return [...new Set(participantes)]
}

export const obterAdminsGrupoPorMetadata = async(grupoMetadata)=>{ 
    let {participants} = grupoMetadata
    let grupoAdmins = participants.filter(member => (member.admin != null))
    let admins = []
    grupoAdmins.forEach((admin)=>{
        if (admin.id) admins.push(admin.id)
        if (admin.phoneNumber && admin.phoneNumber !== admin.id) {
            admins.push(admin.phoneNumber)
        }
    })
    return [...new Set(admins)]
}

export const obterTodosGrupos = async(c)=>{ 
    let grupos = await c.groupFetchAllParticipating()
    let gruposInfo = []
    for (let [key, value] of Object.entries(grupos)) {
        gruposInfo.push(value)
    }
    return gruposInfo
}

export const removerParticipante = async(c, id_grupo, participante)=>{
    let resposta = await c.groupParticipantsUpdate(id_grupo, [participante], "remove")
    return resposta[0]
}

export const adicionarParticipante = async(c, id_grupo, participante)=>{
    let resposta = await c.groupParticipantsUpdate(id_grupo, [participante], "add")
    return resposta[0]
}

export const promoverParticipante = async(c, id_grupo, participante)=>{
    let resposta = await c.groupParticipantsUpdate(id_grupo, [participante], "promote")
    return resposta[0]
}

export const rebaixarParticipante = async(c, id_grupo, participante)=>{
    let resposta = await c.groupParticipantsUpdate(id_grupo, [participante], "demote")
    return resposta[0]
}





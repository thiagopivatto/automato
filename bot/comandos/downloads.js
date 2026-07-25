//REQUERINDO MÓDULOS
import {criarTexto, erroComandoMsg, consoleErro} from '../lib/util.js'
import api from '@victorsouzaleal/lbot-api-comandos'
import * as socket from '../baileys/socket.js'
import {tiposMensagem} from '../baileys/mensagem.js'
import duration from 'format-duration-time'
import {comandosInfo} from '../comandos/comandos.js'


export const downloads = async(c, mensagemBaileys, botInfo) => {
    //Atribuição de valores
    const comandos_info = comandosInfo(botInfo)
    const {prefixo} = botInfo
    const {
        texto_recebido,
        comando,
        args,
        mensagem,
        id_chat
    } = mensagemBaileys
    const comandoSemPrefixo = comando.replace(prefixo, "")

    //Comandos de downloads
    try{
        switch(comandoSemPrefixo){      
            case "play":
                try{
                    if(!args.length) return await socket.responderTexto(c, id_chat,erroComandoMsg(comando, botInfo),mensagem)
                    let usuarioTexto = texto_recebido
                    const {resultado: resultadoInfoVideo} = await api.Downloads.obterInfoVideoYT(usuarioTexto)
                    if(resultadoInfoVideo.isLiveContent) return await socket.responderTexto(c, id_chat, comandos_info.downloads.play.msgs.erro_live,mensagem)
                    else if (resultadoInfoVideo.lengthSeconds > 2400) return await socket.responderTexto(c, id_chat, comandos_info.downloads.play.msgs.limite, mensagem)
                    const mensagemEspera = criarTexto(comandos_info.downloads.play.msgs.espera, resultadoInfoVideo.title, resultadoInfoVideo.durationFormatted)
                    await socket.responderTexto(c, id_chat, mensagemEspera, mensagem)
                    const {resultado : resultadoYTMP3} = await api.Downloads.obterYTMP3(usuarioTexto)
                    await socket.responderArquivoBuffer(c, tiposMensagem.audio, id_chat, resultadoYTMP3, '', mensagem, 'audio/mpeg')
                } catch(err){
                    if(!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro) , mensagem)
                }
                break
            
            case "yt":
                try{
                    if(!args.length) return await socket.responderTexto(c,id_chat,erroComandoMsg(comando, botInfo),mensagem)
                    let usuarioTexto = texto_recebido
                    const {resultado : resultadoInfoVideo} = await api.Downloads.obterInfoVideoYT(usuarioTexto)
                    if(resultadoInfoVideo.isLiveContent) return await socket.responderTexto(c, id_chat, comandos_info.downloads.yt.msgs.erro_live, mensagem)
                    else if(resultadoInfoVideo.lengthSeconds > 2400) return await socket.responderTexto(c, id_chat, comandos_info.downloads.yt.msgs.limite, mensagem)
                    const mensagemEspera = criarTexto(comandos_info.downloads.yt.msgs.espera, resultadoInfoVideo.title, resultadoInfoVideo.durationFormatted)
                    await socket.responderTexto(c, id_chat, mensagemEspera, mensagem)
                    const {resultado : resultadoYTMP4} = await api.Downloads.obterYTMP4(usuarioTexto)
                    await socket.responderArquivoBuffer(c, tiposMensagem.video, id_chat, resultadoYTMP4, '', mensagem, 'video/mp4')
                } catch(err){
                    if(!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro) , mensagem)
                }
                break

            case "fb":
                try{
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let usuarioURL = texto_recebido
                    const {resultado: resultadoFB} = await api.Downloads.obterMidiaFacebook(usuarioURL)
                    if(resultadoFB.duration_ms > 180000) return await socket.responderTexto(c, id_chat, comandos_info.downloads.fb.msgs.limite, mensagem)
                    const mensagemEspera = criarTexto(comandos_info.downloads.fb.msgs.espera, resultadoFB.title, duration.default(resultadoFB.duration_ms).format('m:ss'))
                    await socket.responderTexto(c, id_chat, mensagemEspera, mensagem)
                    await socket.responderArquivoUrl(c, tiposMensagem.video, id_chat, resultadoFB.sd, '', mensagem, 'video/mp4')
                } catch(err){
                    if(!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro) , mensagem)
                } 
                break

            case "ig":
                try{
                    if(!args.length) return await socket.responderTexto(c, id_chat,erroComandoMsg(comando, botInfo),mensagem)
                    // Suporta: !ig link  |  !ig link 2  (índice do carrossel, 1-based)
                    let indice = null
                    let partesIg = [...args]
                    const ultimo = partesIg[partesIg.length - 1]
                    if (partesIg.length > 1 && /^\d+$/.test(ultimo)) {
                        indice = parseInt(ultimo, 10)
                        partesIg = partesIg.slice(0, -1)
                    }
                    let linkMidia = partesIg.join(' ').trim()
                    await socket.responderTexto(c, id_chat, comandos_info.downloads.ig.msgs.espera, mensagem)
                    const {resultado: resultadoIG} = await api.Downloads.obterMidiaInstagram(linkMidia)
                    let lista = resultadoIG || []
                    if (indice != null) {
                        if (indice < 1 || indice > lista.length) {
                            return await socket.responderTexto(
                                c,
                                id_chat,
                                `[❗] Índice *${indice}* inválido. Este post tem *${lista.length}* mídia(s).`,
                                mensagem
                            )
                        }
                        lista = [lista[indice - 1]]
                    }
                    for (const midia of lista) {
                        if(midia.tipo == "imagem") await socket.responderArquivoBuffer(c, tiposMensagem.imagem, id_chat, midia.buffer, '', mensagem, 'image/jpeg')
                        if(midia.tipo == "video") await socket.responderArquivoBuffer(c, tiposMensagem.video, id_chat, midia.buffer, '', mensagem, 'video/mp4')
                    }
                } catch(err){
                    if(!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro) , mensagem)
                }
                break

            case "tw":
                try{
                    if(!args.length) return await socket.responderTexto(c, id_chat,erroComandoMsg(comando, botInfo),mensagem)
                    await socket.responderTexto(c, id_chat, comandos_info.downloads.tw.msgs.espera, mensagem)
                    let usuarioTexto = texto_recebido
                    const {resultado: resultadoTW} = await api.Downloads.obterMidiaTwitter(usuarioTexto)
                    for (const midia of resultadoTW.midias) {
                        if(midia.tipo == "imagem") await socket.responderArquivoUrl(c, tiposMensagem.imagem, id_chat, midia.url, resultadoTW.texto, mensagem)
                        else if(midia.tipo == "video") await socket.responderArquivoUrl(c, tiposMensagem.video, id_chat, midia.url, resultadoTW.texto, mensagem, "video/mp4")
                    }
                } catch(err){
                    if(!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro) , mensagem)
                }
                break

            case "tk":
                try{
                    if(!args.length) return await socket.responderTexto(c, id_chat,erroComandoMsg(comando, botInfo),mensagem)
                    let usuarioTexto = texto_recebido
                    await socket.responderTexto(c, id_chat, '🎬 Baixando TikTok…', mensagem)
                    const {resultado : resultadoTK} = await api.Downloads.obterMidiaTiktok(usuarioTexto)
                    const legenda = criarTexto(
                        comandos_info.downloads.tk.msgs.espera,
                        resultadoTK.autor_perfil || '',
                        resultadoTK.descricao || ''
                    ).replace(/\[AGUARDE\].*/i, '').trim()
                    if (resultadoTK.buffer?.length) {
                        const tipoMidia = resultadoTK.tipo === 'imagem' ? tiposMensagem.imagem : tiposMensagem.video
                        const mime = resultadoTK.tipo === 'imagem' ? 'image/jpeg' : 'video/mp4'
                        await socket.responderArquivoBuffer(c, tipoMidia, id_chat, resultadoTK.buffer, legenda || '', mensagem, mime)
                    } else if (resultadoTK.url) {
                        await socket.responderArquivoUrl(c, tiposMensagem.video, id_chat, resultadoTK.url, legenda || '', mensagem, "video/mp4")
                    } else {
                        throw { erro: 'Não foi possível obter a mídia do TikTok.' }
                    }
                } catch(err){
                    if(!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro) , mensagem)
                }
                break
            
            case 'img':
                try{
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let usuarioTexto = texto_recebido, imagensEnviadas = 0
                    let {resultado: resultadoImg} =  await api.Imagens.obterImagens(usuarioTexto)
                    const imagensValidas = (resultadoImg || []).filter(img => img?.url || img?.preview)
                    const pool = imagensValidas.slice(0, Math.min(30, imagensValidas.length))
                    const maxImagem = pool.length < 5 ? pool.length : 5
                    for (let i = 0; i < maxImagem; i++){
                        let indexAleatorio = Math.floor(Math.random() * pool.length)
                        const item = pool.splice(indexAleatorio, 1)[0]
                        const candidatos = [item.url, item.preview].filter(Boolean)
                        let enviou = false
                        for (const imagemEscolhida of candidatos) {
                            try {
                                await socket.enviarArquivoUrl(c, tiposMensagem.imagem, id_chat, imagemEscolhida, usuarioTexto)
                                enviou = true
                                break
                            } catch {
                                // tenta próxima URL
                            }
                        }
                        if (enviou) imagensEnviadas++
                    }
                    if(!imagensEnviadas) await socket.responderTexto(c, id_chat, comandos_info.downloads.img.msgs.erro_imagem, mensagem)
                } catch(err){
                    if(!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro) , mensagem)
                }
                break
        }
    } catch(err){
        await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_comando_codigo, comando), mensagem)
        err.message = `${comando} - ${err.message}`
        consoleErro(err, "DOWNLOADS")
    }
}
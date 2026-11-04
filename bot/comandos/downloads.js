//REQUERINDO MÓDULOS
import {criarTexto, erroComandoMsg, consoleErro} from '../lib/util.js'
import api from '../lib/lbotApi.js'
import * as socket from '../baileys/socket.js'
import {tiposMensagem} from '../baileys/mensagem.js'
import {comandosInfo} from '../comandos/comandos.js'

/** Texto do comando ou da mensagem citada; extrai URL se houver. */
function resolverEntradaDownload(mensagemBaileys) {
    const { texto_recebido, mensagem_citada, citacao, args } = mensagemBaileys
    let texto = String(texto_recebido || '').trim()
    if (!texto && mensagem_citada) {
        texto = String(citacao?.corpo || citacao?.legenda || '').trim()
    }
    const urlMatch = texto.match(/https?:\/\/[^\s<>"']+/i)
    const url = urlMatch ? urlMatch[0].replace(/[),.;!?]+$/g, '') : ''
    return {
        texto: texto || url,
        url: url || texto,
        temArgs: (args && args.length > 0) || !!texto
    }
}

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
    const entrada = resolverEntradaDownload(mensagemBaileys)

    //Comandos de downloads
    try{
        switch(comandoSemPrefixo){      
            case "play":
                try{
                    if(!entrada.temArgs) return await socket.responderTexto(c, id_chat,erroComandoMsg(comando, botInfo),mensagem)
                    let usuarioTexto = entrada.texto
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
                    if(!entrada.temArgs) return await socket.responderTexto(c,id_chat,erroComandoMsg(comando, botInfo),mensagem)
                    let usuarioTexto = entrada.texto
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
                    if(!entrada.temArgs) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let usuarioURL = entrada.url
                    await socket.responderTexto(c, id_chat, '📥 Baixando do Facebook…', mensagem)
                    const {resultado: resultadoFB} = await api.Downloads.obterMidiaFacebook(usuarioURL)
                    if(resultadoFB.duration_ms > 180000) return await socket.responderTexto(c, id_chat, comandos_info.downloads.fb.msgs.limite, mensagem)
                    if (resultadoFB.buffer?.length) {
                        await socket.responderArquivoBuffer(c, tiposMensagem.video, id_chat, resultadoFB.buffer, '', mensagem, 'video/mp4')
                    } else if (resultadoFB.sd || resultadoFB.hd) {
                        await socket.responderArquivoUrl(c, tiposMensagem.video, id_chat, resultadoFB.hd || resultadoFB.sd, '', mensagem, 'video/mp4')
                    } else {
                        throw { erro: 'Não foi possível obter o vídeo do Facebook.' }
                    }
                } catch(err){
                    if(!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro) , mensagem)
                } 
                break

            case "ig":
                try{
                    if(!entrada.temArgs) return await socket.responderTexto(c, id_chat,erroComandoMsg(comando, botInfo),mensagem)
                    // Suporta: !ig link  |  !ig link 2  (índice do carrossel, 1-based) | responder msg com link
                    let indice = null
                    let partesIg = [...(args || [])]
                    if (!partesIg.length && entrada.texto) partesIg = entrada.texto.split(/\s+/).filter(Boolean)
                    const ultimo = partesIg[partesIg.length - 1]
                    if (partesIg.length > 1 && /^\d+$/.test(ultimo)) {
                        indice = parseInt(ultimo, 10)
                        partesIg = partesIg.slice(0, -1)
                    }
                    let linkMidia = entrada.url || partesIg.join(' ').trim()
                    await socket.responderTexto(c, id_chat, comandos_info.downloads.ig.msgs.espera, mensagem)
                    const {resultado: resultadoIG} = await api.Downloads.obterMidiaInstagram(linkMidia)
                    let lista = resultadoIG || []
                    if (!lista.length) throw { erro: 'Nenhuma mídia encontrada nesse link do Instagram.' }
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
                    let enviouIg = 0
                    for (const midia of lista) {
                        if (midia.buffer?.length) {
                            if (midia.tipo == 'imagem') {
                                await socket.responderArquivoBuffer(c, tiposMensagem.imagem, id_chat, midia.buffer, '', mensagem, 'image/jpeg')
                                enviouIg++
                            } else if (midia.tipo == 'video') {
                                await socket.responderArquivoBuffer(c, tiposMensagem.video, id_chat, midia.buffer, '', mensagem, 'video/mp4')
                                enviouIg++
                            }
                        }
                    }
                    if (!enviouIg) throw { erro: 'Baixei o post, mas não consegui enviar a mídia.' }
                } catch(err){
                    if(!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro) , mensagem)
                }
                break

            case "tw":
                try{
                    if(!entrada.temArgs) return await socket.responderTexto(c, id_chat,erroComandoMsg(comando, botInfo),mensagem)
                    await socket.responderTexto(c, id_chat, comandos_info.downloads.tw.msgs.espera, mensagem)
                    let usuarioTexto = entrada.url
                    const {resultado: resultadoTW} = await api.Downloads.obterMidiaTwitter(usuarioTexto)
                    let enviou = 0
                    for (const midia of resultadoTW.midias || []) {
                        if (midia.buffer?.length) {
                            const tipoMidia = midia.tipo == 'imagem' ? tiposMensagem.imagem : tiposMensagem.video
                            const mime = midia.tipo == 'imagem' ? 'image/jpeg' : 'video/mp4'
                            await socket.responderArquivoBuffer(c, tipoMidia, id_chat, midia.buffer, resultadoTW.texto || '', mensagem, mime)
                            enviou++
                        } else if (midia.url) {
                            if(midia.tipo == "imagem") await socket.responderArquivoUrl(c, tiposMensagem.imagem, id_chat, midia.url, resultadoTW.texto, mensagem)
                            else if(midia.tipo == "video") await socket.responderArquivoUrl(c, tiposMensagem.video, id_chat, midia.url, resultadoTW.texto, mensagem, "video/mp4")
                            enviou++
                        }
                    }
                    if (!enviou) throw { erro: 'Não foi possível baixar a mídia do Twitter/X.' }
                } catch(err){
                    if(!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro) , mensagem)
                }
                break

            case "tk":
                try{
                    if(!entrada.temArgs) return await socket.responderTexto(c, id_chat,erroComandoMsg(comando, botInfo),mensagem)
                    let usuarioTexto = entrada.url
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
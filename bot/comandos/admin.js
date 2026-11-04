//REQUERINDO MODULOS
import * as menu from '../lib/menu.js'
import moment from "moment-timezone"
import {criarTexto, erroComandoMsg, timestampParaData, consoleErro, versaoAtual, mencaoNumero} from '../lib/util.js'
import * as socket from '../baileys/socket.js'
import {BotControle} from '../controles/BotControle.js'
import {GrupoControle} from '../controles/GrupoControle.js'
import {UsuarioControle} from '../controles/UsuarioControle.js'
import {tiposMensagem} from '../baileys/mensagem.js'
import {downloadMediaMessage} from '@whiskeysockets/baileys'
import os from 'node:os'
import {comandosInfo} from '../comandos/comandos.js'
import api from '@victorsouzaleal/lbot-api-comandos'


export const admin = async(c, mensagemBaileys, botInfo) => {
    //Atribuição de valores
    const bot = new BotControle()
    const usuarios = new UsuarioControle()
    const grupos = new GrupoControle()
    const comandos_info = comandosInfo(botInfo)
    const numero_dono = await usuarios.obterIdDono()
    const {numero_bot, prefixo, nome_bot, nome_adm} = botInfo
    const {
        mensagem_dono,
        texto_recebido,
        comando,
        args,
        mensagem,
        id_chat,
        mensagem_grupo,
        t,
        tipo,
        mensagem_midia,
        mensagem_citada,
        mencionados,
        midia,
        citacao
    } = mensagemBaileys
    const {mimetype} = {...midia}
    const usuariosBloqueados = await socket.obterContatosBloqueados(c)
    const comandoSemPrefixo = comando.replace(prefixo, "")

    //Verificando se é mensagem do dono do bot
    if (!mensagem_dono) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_dono_bot, mensagem)
    
    // Comandos de admin
    try{
        switch(comandoSemPrefixo){
            case "admin":
                try{
                    await socket.enviarTexto(c, id_chat, menu.menuAdmin(botInfo))
                } catch(err){
                    throw err
                }
                break

            case "infobot":
                try{
                    let version = versaoAtual()
                    let infoBot = botInfo
                    let expiracaoLimiteDiario = timestampParaData(infoBot.limite_diario.expiracao * 1000)
                    let botInicializacaoData = timestampParaData(infoBot.iniciado)
                    let resposta = criarTexto(comandos_info.admin.infobot.msgs.resposta_superior, nome_adm?.trim(), nome_bot?.trim(), botInicializacaoData, version)
                    // AUTO-STICKER
                    resposta += (infoBot.autosticker) ? comandos_info.admin.infobot.msgs.resposta_variavel.autosticker.on: comandos_info.admin.infobot.msgs.resposta_variavel.autosticker.off
                    // AUTO-REVELAR
                    resposta += (infoBot.autorevelar) ? comandos_info.admin.infobot.msgs.resposta_variavel.autorevelar.on: comandos_info.admin.infobot.msgs.resposta_variavel.autorevelar.off
                    // PV LIBERADO
                    resposta += (infoBot.pvliberado) ? comandos_info.admin.infobot.msgs.resposta_variavel.pvliberado.on: comandos_info.admin.infobot.msgs.resposta_variavel.pvliberado.off
                    // LIMITE COMANDOS DIARIO
                    resposta += (infoBot.limite_diario.status) ? criarTexto(comandos_info.admin.infobot.msgs.resposta_variavel.limite_diario.on,  expiracaoLimiteDiario) : comandos_info.admin.infobot.msgs.resposta_variavel.limite_diario.off
                    // LIMITE COMANDOS POR MINUTO
                    resposta += (infoBot.limitecomandos.status) ? criarTexto(comandos_info.admin.infobot.msgs.resposta_variavel.taxa_comandos.on, infoBot.limitecomandos.cmds_minuto_max, infoBot.limitecomandos.tempo_bloqueio) : comandos_info.admin.infobot.msgs.resposta_variavel.taxa_comandos.off
                    // BLOQUEIO DE COMANDOS
                    let comandosBloqueados = []
                    for(let comandoBloqueado of infoBot.bloqueio_cmds){
                        comandosBloqueados.push(prefixo+comandoBloqueado)
                    }
                    resposta += (infoBot.bloqueio_cmds.length != 0) ? criarTexto(comandos_info.admin.infobot.msgs.resposta_variavel.bloqueiocmds.on, comandosBloqueados.toString()) : comandos_info.admin.infobot.msgs.resposta_variavel.bloqueiocmds.off
                    resposta += criarTexto(comandos_info.admin.infobot.msgs.resposta_inferior, usuariosBloqueados.length, infoBot.cmds_executados, mencaoNumero(numero_dono))
                    await socket.obterFotoPerfil(c, numero_bot).then(async (fotoBot)=>{
                        await socket.responderArquivoUrl(c, tiposMensagem.imagem, id_chat, fotoBot, resposta, mensagem)
                    }).catch(async ()=>{
                        await socket.responderTexto(c, id_chat, resposta, mensagem)
                    })
                } catch(err){
                    throw err
                }

                break
                
            case 'entrargrupo':
                try{
                    if (!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let linkGrupo = texto_recebido
                    let linkValido = linkGrupo.match(/(https:\/\/chat.whatsapp.com)/gi)
                    if (!linkValido) return await socket.responderTexto(c, id_chat, comandos_info.admin.entrargrupo.msgs.link_invalido, mensagem)
                    let idLink = linkGrupo.replace(/(https:\/\/chat.whatsapp.com\/)/gi, '')
                    await socket.entrarLinkGrupo(c, idLink).then(async (res)=>{
                        if (res == undefined) await socket.responderTexto(c, id_chat, comandos_info.admin.entrargrupo.msgs.pendente, mensagem)
                        else await socket.responderTexto(c, id_chat, comandos_info.admin.entrargrupo.msgs.entrar_sucesso,mensagem)
                    }).catch(async ()=>{
                        await socket.responderTexto(c, id_chat, comandos_info.admin.entrargrupo.msgs.entrar_erro, mensagem)
                    })
                } catch(err){
                    throw err
                }

                break

            case 'sair':
                try{
                    if(args.length){
                        let gruposAtuais = await grupos.obterTodosGruposInfo()
                        let indexGrupo = texto_recebido
                        if(isNaN(indexGrupo)) return await socket.responderTexto(c, id_chat, comandos_info.admin.sair.msgs.nao_encontrado, mensagem)
                        indexGrupo = parseInt(indexGrupo) - 1
                        if(!gruposAtuais[indexGrupo]) return await socket.responderTexto(c, id_chat, comandos_info.admin.sair.msgs.nao_encontrado, mensagem)
                        await socket.sairGrupo(c, gruposAtuais[indexGrupo].id_grupo)
                        await socket.enviarTexto(c, numero_dono, comandos_info.admin.sair.msgs.resposta_admin)
                    } else if(!args.length && mensagem_grupo){
                        await socket.sairGrupo(c, id_chat)
                        await socket.enviarTexto(c, numero_dono, comandos_info.admin.sair.msgs.resposta_admin)
                    } else{
                        await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo) ,mensagem)
                    }
                } catch(err){
                    throw err
                }
                break

            case 'listablock':
                try{
                    if(usuariosBloqueados.length == 0) return await socket.responderTexto(c, id_chat, comandos_info.admin.listablock.msgs.lista_vazia, mensagem)
                    let resposta = criarTexto(comandos_info.admin.listablock.msgs.resposta_titulo, usuariosBloqueados.length)
                    for (let i of usuariosBloqueados) resposta += criarTexto(comandos_info.admin.listablock.msgs.resposta_itens, mencaoNumero(i))
                    await socket.responderTexto(c, id_chat, resposta, mensagem)
                } catch(err){
                    throw err
                }
                break

            case "bcmdglobal":
                try{
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo) ,mensagem)
                    let usuarioComandos = args, respostaBloqueio = await bot.bloquearComandosGlobal(usuarioComandos, botInfo)
                    await socket.responderTexto(c, id_chat, respostaBloqueio, mensagem)
                } catch(err){
                    throw err
                }
                break
            
            case "dcmdglobal":
                try{
                    if(!args.length) return await socket.responderTexto(c, id_chat,erroComandoMsg(comando, botInfo),mensagem)
                    let usuarioComandos = args, respostaDesbloqueio = await bot.desbloquearComandosGlobal(usuarioComandos, botInfo)
                    await socket.responderTexto(c, id_chat, respostaDesbloqueio, mensagem)
                } catch(err){
                    throw err
                }
                break
            
            case 'sairgrupos':
                try{
                    let gruposAtuais = await grupos.obterTodosGruposInfo()
                    for (let grupo of gruposAtuais) await socket.sairGrupo(c, grupo.id_grupo)
                    let resposta = criarTexto(comandos_info.admin.sairgrupos.msgs.resposta, gruposAtuais.length)
                    await socket.responderTexto(c, numero_dono, resposta, mensagem)
                } catch(err){
                    throw err
                }
                break

            case "bloquear":
                try{
                    let listaBloqueio = []
                    if(mensagem_citada){
                        listaBloqueio.push(citacao.remetente)
                    } else if(mencionados.length > 1) {
                        listaBloqueio = mencionados
                    } else {
                        let numeroInserido = texto_recebido
                        if(numeroInserido.length == 0) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                        listaBloqueio.push(numeroInserido.replace(/\W+/g,"")+"@s.whatsapp.net")
                    }
                    for (let usuario of listaBloqueio){
                        if(numero_dono == usuario){
                            await socket.responderTexto(c, id_chat, criarTexto(comandos_info.admin.bloquear.msgs.erro_donoerro_dono, mencaoNumero(usuario)), mensagem)
                        } else {
                            if(usuariosBloqueados.includes(usuario)) {
                                await socket.responderTexto(c, id_chat, criarTexto(comandos_info.admin.bloquear.msgs.ja_bloqueado, mencaoNumero(usuario)), mensagem)
                            } else {
                                await socket.bloquearContato(c, usuario)
                                await socket.responderTexto(c, id_chat, criarTexto(comandos_info.admin.bloquear.msgs.sucesso, mencaoNumero(usuario)), mensagem)
                            }
                        }
                    }
                } catch(err){
                    throw err
                }
                break 
                     
            case "desbloquear":
                try{
                    let listaDesbloqueio = []
                    if(mensagem_citada){
                        listaDesbloqueio.push(citacao.remetente)
                    } else if(mencionados.length > 1) {
                        listaDesbloqueio = mencionados
                    } else {
                        let numeroInserido = texto_recebido
                        if(numeroInserido.length == 0) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                        listaDesbloqueio.push(numeroInserido.replace(/\W+/g,"")+"@s.whatsapp.net")
                    }
                    for (let usuario of listaDesbloqueio){
                        if(!usuariosBloqueados.includes(usuario)) {
                            await socket.responderTexto(c, id_chat, criarTexto(comandos_info.admin.desbloquear.msgs.ja_desbloqueado, mencaoNumero(usuario)), mensagem)
                        } else {
                            await socket.desbloquearContato(c, usuario)
                            await socket.responderTexto(c, id_chat, criarTexto(comandos_info.admin.desbloquear.msgs.sucesso, mencaoNumero(usuario)), mensagem)
                        }
                    }
                } catch(err){
                    throw err
                }
                break

            case "autostickerpv":
                try{
                    let novoEstado = !botInfo.autosticker
                    if(novoEstado){
                        await bot.alterarAutoSticker(true, botInfo)
                        await socket.responderTexto(c, id_chat, comandos_info.admin.autostickerpv.msgs.ativado,mensagem)
                    } else {
                        await bot.alterarAutoSticker(false, botInfo)
                        await socket.responderTexto(c, id_chat, comandos_info.admin.autostickerpv.msgs.desativado,mensagem)
                    } 
                } catch(err){
                    throw err
                }
                break

            case "autorevelar":
                try{
                    let novoEstado = !botInfo.autorevelar
                    if(novoEstado){
                        await bot.alterarAutoRevelar(true, botInfo)
                        await socket.responderTexto(c, id_chat, comandos_info.admin.autorevelar.msgs.ativado, mensagem)
                    } else {
                        await bot.alterarAutoRevelar(false, botInfo)
                        await socket.responderTexto(c, id_chat, comandos_info.admin.autorevelar.msgs.desativado, mensagem)
                    } 
                } catch(err){
                    throw err
                }
                break

            case "pvliberado":
                try{
                    let novoEstado = !botInfo.pvliberado
                    if(novoEstado){
                        await bot.alterarPvLiberado(true, botInfo)
                        await socket.responderTexto(c, id_chat, comandos_info.admin.pvliberado.msgs.ativado,mensagem)
                    } else {
                        await bot.alterarPvLiberado(false, botInfo)
                        await socket.responderTexto(c, id_chat, comandos_info.admin.pvliberado.msgs.desativado,mensagem)
                    } 
                } catch(err){
                    throw err
                }
                break

            case "fotobot":
                try{
                    if(!mensagem_midia && !mensagem_citada) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo) , mensagem)
                    let dadosMensagem = {
                        tipo : (mensagem_midia) ? tipo : citacao.tipo,
                        mimetype : (mensagem_midia)? mimetype : citacao.mimetype,
                        mensagem: (mensagem_midia) ? mensagem : citacao.mensagem
                    }
                    if(dadosMensagem.tipo != tiposMensagem.imagem) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo) , mensagem)
                    let fotoBuffer = await downloadMediaMessage(dadosMensagem.mensagem, "buffer")
                    await socket.alterarFotoPerfil(c, numero_bot, fotoBuffer)
                    await socket.responderTexto(c, id_chat, comandos_info.admin.fotobot.msgs.sucesso, mensagem)
                } catch(err){
                    throw err
                }
                break

            case "limitediario":
                try{
                    let novoEstado = !botInfo.limite_diario.status
                    if(novoEstado){
                        await bot.alterarLimiteDiario(true, botInfo)
                        await socket.responderTexto(c, id_chat, comandos_info.admin.limitediario.msgs.ativado, mensagem)
                    } else {
                        await bot.alterarLimiteDiario(false, botInfo)
                        await socket.responderTexto(c, id_chat, comandos_info.admin.limitediario.msgs.desativado, mensagem)
                    } 
                } catch(err){
                    throw err
                }

                break

            case "taxacomandos":
                try{
                    let novoEstado = !botInfo.limitecomandos.status
                    if(novoEstado){
                        if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                        let [qtd_max_minuto, tempo_bloqueio] = args
                        if(!tempo_bloqueio) tempo_bloqueio = 60
                        if(isNaN(qtd_max_minuto) || qtd_max_minuto < 3) return await socket.responderTexto(c, id_chat, comandos_info.admin.taxacomandos.msgs.qtd_invalida, mensagem)
                        if(isNaN(tempo_bloqueio) || tempo_bloqueio < 10) return await socket.responderTexto(c, id_chat, comandos_info.admin.taxacomandos.msgs.tempo_invalido, mensagem)
                        await bot.alterarLimitador(botInfo, true, parseInt(qtd_max_minuto), parseInt(tempo_bloqueio))
                        await socket.responderTexto(c, id_chat, comandos_info.admin.taxacomandos.msgs.ativado, mensagem)
                    } else {
                        await bot.alterarLimitador(botInfo, false)
                        await socket.responderTexto(c, id_chat, comandos_info.admin.taxacomandos.msgs.desativado, mensagem)
                    }
                } catch(err){
                    throw err
                }
                break

            case "nomebot":
                try{
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let usuarioTexto = texto_recebido
                    await bot.alterarNomeBot(usuarioTexto, botInfo)
                    await socket.responderTexto(c, id_chat, comandos_info.admin.nomebot.msgs.sucesso, mensagem)
                } catch(err){
                    throw err
                }
                break
            
            case "nomeadm":
                try{
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let usuarioTexto = texto_recebido
                    await bot.alterarNomeAdm(usuarioTexto, botInfo)
                    await socket.responderTexto(c, id_chat, comandos_info.admin.nomeadm.msgs.sucesso, mensagem)
                } catch(err){
                    throw err
                }
                break

            case "nomesticker":
                try{
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let usuarioTexto = texto_recebido
                    await bot.alterarNomeFigurinhas(usuarioTexto, botInfo)
                    await socket.responderTexto(c, id_chat, comandos_info.admin.nomesticker.msgs.sucesso, mensagem)
                } catch(err){
                    throw err
                }
                break

            case "prefixo":
                try{
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let usuarioTexto = texto_recebido, prefixosSuportados = ["!", "#", ".", "*", "-", "+", "/", "$", "&"]
                    if(!prefixosSuportados.includes(usuarioTexto)) return await socket.responderTexto(c, id_chat, comandos_info.admin.prefixo.msgs.nao_suportado, mensagem)
                    await bot.alterarPrefixo(usuarioTexto, botInfo)
                    await socket.responderTexto(c, id_chat, comandos_info.admin.prefixo.msgs.sucesso, mensagem)
                } catch(err){
                    throw err
                }
                break

            case "novotipo":
                try{
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let [tipoUsuario, tipoTitulo, tipoComandos] = texto_recebido.split(",").map(arg => {return arg.trim()})
                    if(!tipoUsuario || !tipoTitulo || !tipoComandos) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    if(tipoComandos != -1 && (isNaN(tipoComandos) || tipoComandos < 10)) return await socket.responderTexto(c, id_chat, comandos_info.admin.novotipo.msgs.erro_comandos, mensagem) 
                    const sucesso = await bot.adicionarTipoUsuario(botInfo, tipoUsuario, tipoTitulo, tipoComandos)
                    if(sucesso) await socket.responderTexto(c, id_chat, criarTexto(comandos_info.admin.novotipo.msgs.sucesso_criacao, tipoUsuario.toLowerCase().replaceAll(" ", ''), tipoTitulo, tipoComandos == -1 ? "Sem limite" : tipoComandos), mensagem)
                    else await socket.responderTexto(c, id_chat, comandos_info.admin.novotipo.msgs.erro_criacao, mensagem)
                } catch(err){
                    throw err
                }
                break

            case "deltipo":
                try{
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let tipoUsuario = texto_recebido.trim()
                    await usuarios.limparTipo(tipoUsuario, botInfo)
                    const sucesso = await bot.removerTipoUsuario(botInfo, tipoUsuario)
                    if(sucesso)  await socket.responderTexto(c, id_chat, criarTexto(comandos_info.admin.deltipo.msgs.sucesso_remocao, tipoUsuario.toLowerCase().replaceAll(" ", '')), mensagem)
                    else await socket.responderTexto(c, id_chat, comandos_info.admin.deltipo.msgs.erro_remocao, mensagem)
                } catch(err){
                    throw err
                }
                break

            case 'tipotitulo':
                try{
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let [tipoUsuario, tipoTitulo] = texto_recebido.split(",").map(arg => {return arg.trim()})
                    if(!tipoUsuario || !tipoTitulo) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    const sucesso = await bot.alterarTituloTipoUsuario(botInfo, tipoUsuario, tipoTitulo)
                    if(sucesso) await socket.responderTexto(c, id_chat, criarTexto(comandos_info.admin.tipotitulo.msgs.sucesso, tipoUsuario.toLowerCase().replaceAll(" ", ''), tipoTitulo), mensagem)
                    else await socket.responderTexto(c, id_chat, comandos_info.admin.tipotitulo.msgs.erro, mensagem)
                } catch(err){
                    throw err
                }
                break
            
            case "tipocomandos":
                try{
                    if(!botInfo.limite_diario.status) return await socket.responderTexto(c, id_chat, comandos_info.admin.tipocomandos.msgs.erro_limite_diario, mensagem)
                    if(args.length < 2) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let [tipo, qtd] = args
                    if(qtd != -1) if(isNaN(qtd) || qtd < 5) return await socket.responderTexto(c, id_chat, comandos_info.admin.tipocomandos.msgs.invalido, mensagem)
                    let alterou = await bot.alterarComandosTipoUsuario(tipo.toLowerCase(), parseInt(qtd), botInfo)
                    if(!alterou) return await socket.responderTexto(c, id_chat, comandos_info.admin.tipocomandos.msgs.tipo_invalido, mensagem)
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.admin.tipocomandos.msgs.sucesso, tipo.toUpperCase(), qtd == -1 ? "∞" : qtd), mensagem)
                } catch(err){
                    throw err
                }
                break
            
            case "usuarios":
                try{
                    let listaUsuarios, tipoUsuario, respostaTitulo = '', respostaItens = ''
                    if(!args.length) tipoUsuario = 'comum'
                    else tipoUsuario = texto_recebido.toLowerCase()
                    listaUsuarios = await usuarios.obterUsuariosTipo(tipoUsuario)
                    if(!listaUsuarios.length) return await socket.responderTexto(c, id_chat, comandos_info.admin.usuarios.msgs.nao_encontrado, mensagem)
                    respostaTitulo = criarTexto(comandos_info.admin.usuarios.msgs.resposta.titulo, tipoUsuario , listaUsuarios.length)
                    for (let usuario of listaUsuarios) respostaItens += criarTexto(comandos_info.admin.usuarios.msgs.resposta.item, usuario.nome, mencaoNumero(usuario.id_usuario), usuario.comandos_total)
                    const respostaFinal = respostaTitulo + respostaItens
                    await socket.responderTexto(c, id_chat, respostaFinal, mensagem)
                } catch(err){
                    throw err
                }
                break

            case "limpartipo":
                try{
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let tipo = texto_recebido.toLowerCase()
                    let limpou = await usuarios.limparTipo(tipo, botInfo)
                    if(!limpou) return await socket.responderTexto(c, id_chat, comandos_info.admin.limpartipo.msgs.erro, mensagem)
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.admin.limpartipo.msgs.sucesso, tipo.toUpperCase()), mensagem)
                } catch(err){
                    throw err
                }
                break

            case "usuariotipo":
                try{
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let [tipoUsuario, usuarioAlterado] = args
                    if(mensagem_citada) usuarioAlterado = citacao.remetente
                    else if(mencionados.length === 1) usuarioAlterado = mencionados[0]
                    else if(args.length == 2) usuarioAlterado = usuarioAlterado.replace(/\W+/g,"")+"@s.whatsapp.net"
                    else return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo),mensagem)
                    if(numero_dono == usuarioAlterado) return await socket.responderTexto(c, id_chat, comandos_info.admin.usuariotipo.msgs.tipo_dono, mensagem)
                    let c_registrado = await usuarios.verificarRegistro(usuarioAlterado)
                    if(c_registrado){
                        let alterou = await usuarios.alterarTipoUsuario(usuarioAlterado, tipoUsuario.toLowerCase(), botInfo)
                        if(!alterou) return await socket.responderTexto(c, id_chat, comandos_info.admin.usuariotipo.msgs.tipo_invalido, mensagem)
                        await socket.responderTexto(c, id_chat, criarTexto(comandos_info.admin.usuariotipo.msgs.sucesso, tipoUsuario.toUpperCase()), mensagem)
                    } else {
                        await socket.responderTexto(c, id_chat, comandos_info.admin.usuariotipo.msgs.nao_registrado, mensagem)
                    }
                } catch(err){
                    throw err
                }
                break
        
            case "tipos":
                try{
                    let limite_tipos = botInfo.limite_diario.limite_tipos
                    let tipos = Object.keys(limite_tipos)
                    let respostaTitulo = criarTexto(comandos_info.admin.tipos.msgs.resposta.titulo, tipos.length)
                    let respostaItens = ''
                    for (let tipo of tipos) {
                        let usuariosTipo = await usuarios.obterUsuariosTipo(tipo)
                        respostaItens += criarTexto(comandos_info.admin.tipos.msgs.resposta.item, tipo, limite_tipos[tipo].titulo, limite_tipos[tipo].comandos || "∞", usuariosTipo.length) 
                    }
                    const respostaFinal = respostaTitulo + respostaItens
                    await socket.responderTexto(c, id_chat, respostaFinal, mensagem)
                } catch(err){
                    throw err
                }
                break
            
            case "rtodos":
                try{
                    if(!botInfo.limite_diario.status) return await socket.responderTexto(c, id_chat, comandos_info.admin.rtodos.msgs.erro_limite_diario,mensagem)
                    await usuarios.resetarComandosDia()
                    await socket.responderTexto(c, id_chat, comandos_info.admin.rtodos.msgs.sucesso,mensagem)
                } catch(err){
                    throw err
                }
                break

            case "r":
                try{
                    if(!botInfo.limite_diario.status) return await socket.responderTexto(c, id_chat, comandos_info.admin.r.msgs.erro_limite_diario,mensagem)
                    let usuarioResetado
                    if(mensagem_citada) usuarioResetado = citacao.remetente
                    else if(mencionados.length) usuarioResetado = mencionados[0]
                    else if(args.length) usuarioResetado = texto_recebido.replace(/\W+/g,"")+"@s.whatsapp.net"
                    else return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo),mensagem)
                    let usuarioRegistrado = await usuarios.verificarRegistro(usuarioResetado)
                    if(usuarioRegistrado){
                        await usuarios.resetarComandosDiaUsuario(usuarioResetado)
                        await socket.responderTexto(c, id_chat, comandos_info.admin.r.msgs.sucesso,mensagem)
                    } else {
                        await socket.responderTexto(c, id_chat, comandos_info.admin.r.msgs.nao_registrado,mensagem)
                    }
                } catch(err){
                    throw err
                }
                break  
                
            case "verdados":
                try{
                    let idUsuario
                    if(mensagem_citada) idUsuario = citacao.remetente
                    else if(mencionados.length) idUsuario = mencionados[0]
                    else if(args.length) idUsuario =  texto_recebido.replace(/\W+/g,"")+"@s.whatsapp.net"
                    else return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo),mensagem)
                    let usuarioRegistrado = await usuarios.verificarRegistro(idUsuario)
                    if (!usuarioRegistrado) return await socket.responderTexto(c, id_chat, comandos_info.admin.verdados.msgs.nao_registrado, mensagem)
                    let dadosUsuario = await usuarios.obterDadosUsuario(idUsuario)
                    let maxComandosDia = botInfo.limite_diario.limite_tipos[dadosUsuario.tipo].comandos ?? "Sem limite"
                    let tipoUsuario = botInfo.limite_diario.limite_tipos[dadosUsuario.tipo].titulo 
                    let nomeUsuario =  dadosUsuario.nome || "Ainda não obtido"
                    let resposta = criarTexto(comandos_info.admin.verdados.msgs.resposta_superior, nomeUsuario, tipoUsuario, mencaoNumero(dadosUsuario.id_usuario))
                    if(botInfo.limite_diario.status) resposta += criarTexto(comandos_info.admin.verdados.msgs.resposta_variavel.limite_diario.on, dadosUsuario.comandos_dia, maxComandosDia, maxComandosDia)
                    resposta += criarTexto(comandos_info.admin.verdados.msgs.resposta_inferior, dadosUsuario.comandos_total)
                    await socket.responderTexto(c, id_chat, resposta, mensagem)
                } catch(err){
                    throw err
                }
                break
                     
            case 'bcgrupos':
            case 'aviso':
                try{
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let anuncioMensagem = texto_recebido, gruposAtuais = await grupos.obterTodosGruposInfo()
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.admin.bcgrupos.msgs.espera, gruposAtuais.length, gruposAtuais.length) , mensagem)
                    for (let grupo of gruposAtuais) {
                        if (!grupo.restrito_msg) {
                            await new Promise((resolve)=>{
                                setTimeout(async ()=>{
                                    await socket.enviarTexto(c, grupo.id_grupo, criarTexto(comandos_info.admin.bcgrupos.msgs.anuncio, anuncioMensagem)).catch(()=>{})
                                    resolve()
                                }, 1000)
                            })
                        }
                    }
                    await socket.responderTexto(c, id_chat, comandos_info.admin.bcgrupos.msgs.bc_sucesso , mensagem)
                } catch(err){
                    throw err
                }
                break
            
            case "grupos":
                try{
                    let gruposAtuais = await grupos.obterTodosGruposInfo(), resposta = criarTexto(comandos_info.admin.grupos.msgs.resposta_titulo, gruposAtuais.length)
                    let numGrupo = 0
                    for (let grupo of gruposAtuais){
                        numGrupo++
                        let adminsGrupo = grupo.admins
                        let botAdmin = adminsGrupo.includes(numero_bot)
                        let comandoLink = botAdmin ? `${prefixo}linkgrupo ${numGrupo}` : '----'
                        resposta += criarTexto(comandos_info.admin.grupos.msgs.resposta_itens, numGrupo, grupo.nome, grupo.participantes.length, adminsGrupo.length,  botAdmin ? "Sim" : "Não",  comandoLink)
                    }
                    await socket.responderTexto(c, id_chat, resposta, mensagem)
                } catch(err){
                    throw err
                }
                break

            case 'linkgrupo':
                try{
                    let gruposAtuais = await grupos.obterTodosGruposInfo()
                    let indexGrupo = texto_recebido
                    if(isNaN(indexGrupo)) return await socket.responderTexto(c, id_chat, comandos_info.admin.linkgrupo.msgs.nao_encontrado, mensagem)
                    indexGrupo = parseInt(indexGrupo) - 1
                    if(!gruposAtuais[indexGrupo]) return await socket.responderTexto(c, id_chat, comandos_info.admin.linkgrupo.msgs.nao_encontrado, mensagem)
                    let botAdmin = gruposAtuais[indexGrupo].admins.includes(numero_bot)
                    if(!botAdmin) return await socket.responderTexto(c, id_chat, comandos_info.admin.linkgrupo.msgs.nao_admin, mensagem)
                    let link = await socket.obterLinkGrupo(c, gruposAtuais[indexGrupo].id_grupo)
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.admin.linkgrupo.msgs.resposta, link), mensagem)               
                } catch(err){
                    throw err
                }
                break

            case 'estado':
                try{
                    const { alterarEstado } = await import('./admin/estado.js')
                    await alterarEstado({
                        c, id_chat, args, texto_recebido, comandos_info, mensagem, comando, botInfo
                    })
                } catch(err){
                    throw err
                }
                break

            case 'desligar':
                try{
                    await socket.responderTexto(c, id_chat, comandos_info.admin.desligar.msgs.sucesso, mensagem).then(async()=>{
                        await socket.encerrarBot(c)
                    })
                } catch(err){
                    throw err
                }
                break
            
            case "ping":
                try{
                    const tempoResposta = (moment.now()/1000) - t
                    const memoriaTotal = os.totalmem()
                    const memoriaLivre = os.freemem()
                    const memoriaUsada = memoriaTotal - memoriaLivre
                    const cpus = os.cpus() || []
                    const nomeProcessador = cpus[0]?.model || 'N/A'
                    const nucleos = cpus.length
                    const load = typeof os.loadavg === 'function' ? os.loadavg() : [0, 0, 0]
                    const uptimeOs = os.uptime()
                    const uptimeProc = process.uptime()
                    const fmtUptime = (seg) => {
                        const d = Math.floor(seg / 86400)
                        const h = Math.floor((seg % 86400) / 3600)
                        const m = Math.floor((seg % 3600) / 60)
                        const s = Math.floor(seg % 60)
                        return `${d}d ${h}h ${m}m ${s}s`
                    }
                    const toGB = (b) => (b / 1024 / 1024 / 1024).toFixed(2)
                    const memNode = process.memoryUsage()
                    const gruposAtuais = await grupos.obterTodosGruposInfo()
                    const contatos = await usuarios.obterDadosTodosUsuarios()
                    let gpuLinha = 'GPU: não detectada'
                    try {
                        const { detectarGpu, torchTemCuda, deviceDemucs } = await import('../../vendor/lbot-api-comandos/lib/gpu.js')
                        const g = detectarGpu()
                        if (g.disponivel) {
                            gpuLinha = `GPU: ${g.nome}\nTorch CUDA: ${torchTemCuda() ? 'sim' : 'não'} · demucs: ${deviceDemucs()}`
                        }
                    } catch { /* ignore */ }

                    const texto =
                        `🖥️ *INFORMAÇÃO DO SISTEMA*\n\n` +
                        `*Host*: ${os.hostname()}\n` +
                        `*OS*: ${os.type()} ${os.release()} (${os.arch()})\n` +
                        `*Plataforma*: ${os.platform()}\n` +
                        `*CPU*: ${nomeProcessador}\n` +
                        `*Núcleos*: ${nucleos}\n` +
                        `*Load avg*: ${load.map((n) => Number(n).toFixed(2)).join(' / ')}\n` +
                        `*RAM*: ${toGB(memoriaUsada)} / ${toGB(memoriaTotal)} GB (livre ${toGB(memoriaLivre)} GB)\n` +
                        `*Node heap*: ${(memNode.heapUsed / 1024 / 1024).toFixed(1)} / ${(memNode.heapTotal / 1024 / 1024).toFixed(1)} MB\n` +
                        `*RSS*: ${(memNode.rss / 1024 / 1024).toFixed(1)} MB\n` +
                        `*Node*: ${process.version}\n` +
                        `*PID*: ${process.pid}\n` +
                        `*Uptime OS*: ${fmtUptime(uptimeOs)}\n` +
                        `*Uptime bot*: ${fmtUptime(uptimeProc)}\n` +
                        `*Resposta*: ${tempoResposta.toFixed(3)}s\n` +
                        `*Usuários*: ${contatos.length}\n` +
                        `*Grupos*: ${gruposAtuais.length}\n` +
                        `*Cmds executados*: ${botInfo.cmds_executados || 0}\n` +
                        `*Online desde*: ${timestampParaData(botInfo.iniciado)}\n` +
                        `${gpuLinha}`

                    await socket.responderTexto(c, id_chat, texto, mensagem)
                } catch(err){
                    throw err
                }
                break

            case 'limpar':
                try {
                    await socket.responderTexto(c, id_chat, '🧹 Limpando cache, mídias temporárias e mensagens…', mensagem)
                    const { limparCacheBot } = await import('../lib/limparCache.js')
                    const r = await limparCacheBot()
                    const lista = (r.detalhes || []).map((d) => `• ${d}`).join('\n') || '• nada pendente'
                    await socket.responderTexto(
                        c,
                        id_chat,
                        `✅ *Limpeza concluída*\n` +
                            `Liberado ~*${r.liberadoMb} MB*\n\n` +
                            `${lista}\n\n` +
                            `_Mantidos: usuários, grupos, contador, sessão e bot.json._`,
                        mensagem
                    )
                } catch (err) {
                    throw err
                }
                break

            case 'sugestoes':
                try {
                    const { Sugestao } = await import('../modelos/Sugestao.js')
                    const store = new Sugestao()
                    const argsLower = (texto_recebido || '').trim().toLowerCase()
                    if (argsLower === 'limpar' || argsLower === 'clear') {
                        const n = await store.limparLidas()
                        await socket.responderTexto(c, id_chat, `✅ Removidas *${n}* sugestões já lidas.`, mensagem)
                        break
                    }
                    const lista = await store.listar({ limite: 25 })
                    if (!lista.length) {
                        await socket.responderTexto(c, id_chat, '📭 Nenhuma sugestão registrada.', mensagem)
                        break
                    }
                    const abertas = await store.contarAbertas()
                    let texto = `💡 *Sugestões* (${lista.length} recentes · ${abertas} abertas)\n\n`
                    for (let i = 0; i < lista.length; i++) {
                        const s = lista[i]
                        const data = timestampParaData(s.timestamp)
                        const status = s.status === 'aberta' ? '🆕' : '👁'
                        texto += `${status} *${i + 1}.* [${data}] ${s.nome_usuario}\n${s.texto}\n\n`
                        if (s.status === 'aberta') {
                            try { await store.marcarLida(s._id) } catch { /* ignore */ }
                        }
                    }
                    texto += `_Use *${prefixo}sugestoes limpar* para apagar as já lidas._`
                    await socket.responderTexto(c, id_chat, texto.slice(0, 4000), mensagem)
                } catch (err) {
                    throw err
                }
                break

            case 'cotasia':
                try {
                    await socket.responderTexto(
                        c,
                        id_chat,
                        '⏳ Consultando cotas das IAs…',
                        mensagem
                    )
                    let resultado
                    try {
                        if (typeof api?.IA?.consultarCotasIA === 'function') {
                            ;({ resultado } = await api.IA.consultarCotasIA())
                        } else {
                            throw new Error('consultarCotasIA ausente no node_modules')
                        }
                    } catch {
                        const { carregarIaApi } = await import('../lib/iaApi.js')
                        const IA = await carregarIaApi()
                        ;({ resultado } = await IA.consultarCotasIA())
                    }
                    await socket.responderTexto(
                        c,
                        id_chat,
                        resultado || 'Não consegui montar o relatório de cotas agora.',
                        mensagem
                    )
                } catch (err) {
                    await socket.responderTexto(
                        c,
                        id_chat,
                        'Não consegui consultar as cotas agora. Rode `npm run sync:vendor` no servidor e reinicie.',
                        mensagem
                    )
                    consoleErro(err, 'COTASIA')
                }
                break

            case 'devtest':
                try{
                    //PARA TESTES
                } catch(err){
                    throw err
                }
                break
        }
    } catch(err){
        await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_comando_codigo, comando), mensagem)
        err.message = `${comando} - ${err.message}`
        consoleErro(err, "ADMIN")
    }
    
}
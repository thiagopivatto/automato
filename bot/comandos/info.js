//REQUERINDO MÓDULOS
import * as menu from '../lib/menu.js'
import {criarTexto, erroComandoMsg, timestampParaData, consoleErro, versaoAtual} from '../lib/util.js'
import * as socket from '../baileys/socket.js'
import {GrupoControle} from '../controles/GrupoControle.js'
import {UsuarioControle} from '../controles/UsuarioControle.js'
import {tiposMensagem} from '../baileys/mensagem.js'
import {comandosInfo} from '../comandos/comandos.js'



export const info = async(c, mensagemBaileys, botInfo) => {
    //Atribuição de valores
    const usuarios = new UsuarioControle()
    const grupos = new GrupoControle()
    const comandos_info = comandosInfo(botInfo)
    const numero_dono = await usuarios.obterIdDono()
    const {numero_bot, prefixo, nome_bot, nome_adm } = botInfo
    const {
        comando,
        args,
        remetente,
        texto_recebido,
        nome_usuario,
        mensagem,
        id_chat,
        mensagem_grupo,
        grupo
    } = mensagemBaileys
    const { usuario_admin } = {...grupo}
    const comandoSemPrefixo = comando.replace(prefixo, "")

    //Comandos de info
    try{
        switch(comandoSemPrefixo){
            case `info`:
                try{
                    let version = versaoAtual()
                    let infoBot = botInfo
                    let botInicializacaoData = timestampParaData(infoBot.iniciado)
                    let resposta = criarTexto(comandos_info.info.info.msgs.resposta, nome_adm?.trim(), nome_bot?.trim(), botInicializacaoData, infoBot.cmds_executados, numero_dono.replace("@s.whatsapp.net", ""), version)
                    await socket.obterFotoPerfil(c, numero_bot).then( async (botFotoURL)=>{
                        await socket.responderArquivoUrl(c, tiposMensagem.imagem, id_chat, botFotoURL, resposta, mensagem)
                    }).catch(async()=>{
                        await socket.responderTexto(c, id_chat, resposta, mensagem)
                    })
                } catch(err){
                    throw err
                }
                
                break
            
            case `reportar`:
                try{
                    if(!args.length) return socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo) ,mensagem)
                    if(!numero_dono) return socket.responderTexto(c, id_chat, comandos_info.info.reportar.msgs.erro, mensagem)
                    let usuarioMensagem = texto_recebido, resposta = criarTexto(comandos_info.info.reportar.msgs.resposta, nome_usuario, remetente.replace("@s.whatsapp.net",""), usuarioMensagem)
                    await socket.enviarTexto(c,numero_dono, resposta)
                    await socket.responderTexto(c, id_chat, comandos_info.info.reportar.msgs.sucesso, mensagem)
                } catch(err){
                    throw err
                }
                break

            case 'sugerir':
                try {
                    if (!args.length) {
                        return await socket.responderTexto(
                            c,
                            id_chat,
                            `Ex: *${prefixo}sugerir* adicionar comando X\nOu: *${prefixo}sugerir* corrigir o Y`,
                            mensagem
                        )
                    }
                    const { Sugestao } = await import('../modelos/Sugestao.js')
                    const sugestoes = new Sugestao()
                    await sugestoes.adicionar({
                        id_usuario: remetente,
                        nome_usuario,
                        texto: texto_recebido,
                        id_chat
                    })
                    await socket.responderTexto(
                        c,
                        id_chat,
                        '✅ Sugestão enviada! O dono do bot poderá ver na lista.',
                        mensagem
                    )
                    if (numero_dono) {
                        try {
                            await socket.enviarTexto(
                                c,
                                numero_dono,
                                `💡 *Nova sugestão*\nDe: ${nome_usuario}\nContato: ${String(remetente).replace(/@.*/, '')}\n\n${texto_recebido.slice(0, 800)}`
                            )
                        } catch { /* ignore */ }
                    }
                } catch (err) {
                    throw err
                }
                break
            
            case `meusdados`:
                try{
                    let dadosUsuario = await usuarios.obterDadosUsuario(remetente)
                    let maxComandosDia = botInfo.limite_diario.limite_tipos[dadosUsuario.tipo].comandos ||  "Sem limite" 
                    let tipoUsuario = botInfo.limite_diario.limite_tipos[dadosUsuario.tipo].titulo
                    let nomeUsuario = nome_usuario
                    let resposta = criarTexto(comandos_info.info.meusdados.msgs.resposta_geral, tipoUsuario, nomeUsuario, dadosUsuario.comandos_total)
                    if(botInfo.limite_diario.status) resposta += criarTexto(comandos_info.info.meusdados.msgs.resposta_limite_diario, dadosUsuario.comandos_dia, maxComandosDia, maxComandosDia)
                    if(mensagem_grupo){
                        let dadosGrupo = await grupos.obterGrupoInfo(id_chat)
                        if(dadosGrupo.contador.status){
                            let usuarioAtividade = await grupos.obterAtividadeParticipante(id_chat, remetente)
                            resposta += criarTexto(comandos_info.info.meusdados.msgs.resposta_grupo, usuarioAtividade.msg)
                        }   
                    }
                    await socket.responderTexto(c, id_chat, resposta, mensagem)
                } catch(err){
                    throw err
                }
                break
            
            case 'menu':
            case 'comandos':
                try{
                    let dadosUsuario = await usuarios.obterDadosUsuario(remetente)
                    let maxComandosDia = botInfo.limite_diario.limite_tipos[dadosUsuario.tipo].comandos || "Sem limite"
                    let totalComandos = dadosUsuario.comandos_total
                    let tipoUsuario = botInfo.limite_diario.limite_tipos[dadosUsuario.tipo].titulo
                    let nomeUsuario = nome_usuario
                    let dadosResposta = ''
                    
                    if(botInfo.limite_diario.status){
                        dadosResposta = criarTexto(comandos_info.info.menu.msgs.resposta_limite_diario, nomeUsuario, dadosUsuario.comandos_dia, maxComandosDia, tipoUsuario, totalComandos)
                    } else {
                        dadosResposta = criarTexto(comandos_info.info.menu.msgs.resposta_comum, nomeUsuario, tipoUsuario, totalComandos)
                    }

                    const catalogo = menu.menuCompleto(botInfo)
                    // Uma única mensagem (WhatsApp aguenta o catálogo completo)
                    await socket.enviarTexto(c, id_chat, `${dadosResposta.trim()}\n\n${catalogo}`)
                } catch(err){
                    throw err
                }
                break
        }
    } catch(err){
        await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_comando_codigo, comando), mensagem)
        err.message = `${comando} - ${err.message}`
        consoleErro(err, "INFO")
    }
    

}
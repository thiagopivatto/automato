//REQUERINDO MODULOS
import {criarTexto, mencaoNumero} from './util.js'
import * as socket from '../baileys/socket.js'
import {BotControle} from '../controles/BotControle.js'
import {GrupoControle} from '../controles/GrupoControle.js'
import {UsuarioControle} from '../controles/UsuarioControle.js'
import {comandosInfo, mensagemEhComando, verificarComandoExiste} from '../comandos/comandos.js'


export const checagemMensagem = async (c, mensagemBaileys, botInfo) => {
    try {
        // Eco fromMe: não processa como comando/usuário
        if (mensagemBaileys?.mensagem_bot || mensagemBaileys?.fromMe) return false

        //Atribuição de valores
        const bot = new BotControle()
        const usuarios = new UsuarioControle()
        const grupos = new GrupoControle()
        const {prefixo, nome_bot} = botInfo
        const numero_dono = await usuarios.obterIdDono()
        const comandos_info = comandosInfo(botInfo)
        let {
            comando,
            args,
            remetente,
            mensagem_dono,
            mensagem_grupo,
            tipo,
            mensagem,
            id_chat,
            nome_usuario,
            id_mensagem,
            mensagem_vunica,
            grupo,
            citacao,
            aliases_remetente
        } = mensagemBaileys
        const {id_grupo, usuario_admin, bot_admin} = {...grupo}
        const msgGuia = (!args.length) ? false : args[0] === "guia"
        let usuarioBloqueado = false
        try {
            const usuariosBloqueados = await Promise.race([
                socket.obterContatosBloqueados(c),
                new Promise((resolve) => setTimeout(() => resolve([]), 2500))
            ])
            usuarioBloqueado = Array.isArray(usuariosBloqueados) && usuariosBloqueados.includes(remetente)
        } catch {
            // Baileys 7 / LID: blocklist pode falhar/hang — não bloqueia comandos
        }
        const comandoExiste = mensagemEhComando(botInfo, comando)

        // Identidade canônica (PN) + promove dono; evita "Comum" / "Olá null" com LID
        const { usuario: dadosUsuarioGarantido, idCanonico } = await usuarios.garantirIdentidade({
            remetente,
            aliases: aliases_remetente || [],
            nome: nome_usuario,
            mensagem_dono
        })
        remetente = idCanonico
        mensagemBaileys.remetente = idCanonico
        if ((!nome_usuario || nome_usuario === 'null') && dadosUsuarioGarantido?.nome) {
            nome_usuario = dadosUsuarioGarantido.nome
            mensagemBaileys.nome_usuario = nome_usuario
        }
        if (mensagem_dono) mensagemBaileys.mensagem_dono = true

        //Se não houver um usuário do tipo 'dono' e o comando for !admin, altere o tipo de quem fez o comando como dono.
        if(!numero_dono && comando == `${prefixo}admin`) {
            await usuarios.cadastrarDono(remetente)
            await socket.responderTexto(c, id_chat, comandos_info.outros.dono_cadastrado, mensagem)
            return false
        }

        // OBTENDO DADOS ATUALIZADOS DO USUÁRIO
        const dadosUsuario = dadosUsuarioGarantido || await usuarios.obterDadosUsuario(remetente)

        //SE O CONTADOR TIVER ATIVADO E FOR UMA MENSAGEM DE GRUPO, VERIFICA SE O USUARIO EXISTE NO CONTADOR , REGISTRA ELE E ADICIONA A CONTAGEM
        if(mensagem_grupo && grupo?.contador.status) {
            await grupos.verificarRegistrarContagemParticipante(id_grupo, remetente)
            await grupos.adicionarContagemParticipante(id_grupo, remetente, tipo)
        }

        //SE FOR BLOQUEADO RETORNE
        if (usuarioBloqueado) return false
        //SE O PV DO BOT NÃO ESTIVER LIBERADO
        if(!mensagem_grupo && !mensagem_dono && !botInfo.pvliberado) return false
        //SE O GRUPO ESTIVER COM O RECURSO 'MUTADO' LIGADO E USUARIO NÃO FOR ADMINISTRADOR
        if(mensagem_grupo && !usuario_admin && grupo?.mutar) return false
        //SE FOR MENSAGEM DE GRUPO, O BOT NÃO FOR ADMIN E ESTIVER COM RESTRIÇÃO DE MENSAGENS PARA ADMINS
        if(mensagem_grupo && !bot_admin && grupo?.restrito_msg) return false

        //SE O USUÁRIO MANDAR MENSAGEM NO PV E AINDA NÃO TIVER RECEBIDO A MENSAGEM DE BOAS VINDAS, ENVIE.
        if(!mensagem_grupo && dadosUsuario && !dadosUsuario.recebeuBoasVindas && botInfo.pvliberado){
            const nomeBv = nome_usuario || dadosUsuario.nome || 'usuário'
            await socket.enviarTexto(c, id_chat, criarTexto(comandos_info.outros.usuario_novo, nome_bot?.trim(), nomeBv), mensagem)
            await usuarios.recebeuBoasVindas(remetente)
        }

        //ENVIE QUE LEU A MENSAGEM (não pode derrubar o comando se falhar)
        try {
            await socket.lerMensagem(c, id_chat, remetente, id_mensagem)
        } catch { /* */ }
        //ATUALIZE NOME DO USUÁRIO (não grava null)
        try {
            if (nome_usuario && nome_usuario !== 'null') await usuarios.atualizarNome(remetente, nome_usuario)
        } catch { /* */ }

        // Autorevelar (cópia pro dono) — reenvio no grupo já ocorre em receberMensagem
        if(mensagem_vunica && botInfo.autorevelar && numero_dono){
            await bot.redirecionarMensagemRevelada(c, mensagemBaileys, botInfo)
        }

        //SE FOR ALGUM COMANDO EXISTENTE
        if(comandoExiste){
            //SE NÃO FOR DONO DO BOT OU ADMIN DO GRUPO E TENTAR USAR COMANDO EM UMA MENSAGEM UNICA, DÊ UMA MENSAGEM DE ERRO.
            if(!mensagem_dono && mensagem_grupo && !usuario_admin && (mensagem_vunica || citacao?.mensagem_vunica)){
                await socket.responderTexto(c, id_chat, comandos_info.outros.visualizacao_unica, mensagem)
                return false
            }
            //LIMITACAO DE COMANDO POR MINUTO
            if(botInfo.limitecomandos.status){
                let limiteComando = await bot.verificarLimiteComando(remetente, dadosUsuario.tipo, usuario_admin, botInfo)
                if(limiteComando.comando_bloqueado) {
                    if(limiteComando.msg != undefined) await socket.responderTexto(c,id_chat, limiteComando.msg, mensagem)
                    return false
                }
            }
            //BLOQUEIO GLOBAL DE COMANDOS
            if(await bot.verificarComandosBloqueadosGlobal(comando, botInfo, prefixo) && !mensagem_dono){
                await socket.responderTexto(c, id_chat, criarTexto(comandos_info.admin.bcmdglobal.msgs.resposta_cmd_bloqueado, comando), mensagem)
                return false
            }
            //SE FOR MENSAGEM DE GRUPO , COMANDO ESTIVER BLOQUEADO E O USUARIO NAO FOR ADMINISTRADOR DO GRUPO
            if(mensagem_grupo && await grupos.verificarComandosBloqueadosGrupo(comando, grupo, prefixo) && !usuario_admin) {
                await socket.responderTexto(c,id_chat,criarTexto(comandos_info.grupo.bcmd.msgs.resposta_cmd_bloqueado, comando), mensagem)
                return false
            }
            // Contadores só após sucesso do handler (fila). Aqui só valida limite diário.
            if(botInfo.limite_diario.status){
                await bot.verificarExpiracaoLimite(botInfo)
                if(!verificarComandoExiste(botInfo, comando, 'admin') && !verificarComandoExiste(botInfo, comando, 'grupo') && !verificarComandoExiste(botInfo, comando, 'info') && !msgGuia){
                    let ultrapassou = await usuarios.verificarUltrapassouLimiteComandos(remetente, botInfo)
                    if(ultrapassou) {
                        await socket.responderTexto(c, id_chat, criarTexto(comandos_info.admin.limitediario.msgs.resposta_excedeu_limite, nome_usuario, mencaoNumero(numero_dono)), mensagem)
                        return false
                    }
                    mensagemBaileys._contarPosSucesso = true
                    mensagemBaileys._contagemDiaria = true
                } else {
                    mensagemBaileys._contarPosSucesso = true
                    mensagemBaileys._contagemDiaria = false
                }
            } else {
                mensagemBaileys._contarPosSucesso = true
                mensagemBaileys._contagemDiaria = false
            }
        }

        return true
    } catch (err) {
        err.message = `checagemMensagem - ${err.message}`
        throw err
    }
}

// REQUERINDO MODULOS
import { criarTexto, primeiraLetraMaiuscula, erroComandoMsg, consoleErro, mencaoNumero, sortearMembros, participantesSemBot } from '../lib/util.js'
import path from 'node:path'
import fs from 'fs-extra'
import api from '../lib/lbotApi.js'
import * as socket from '../baileys/socket.js'
import { tiposMensagem } from '../baileys/mensagem.js'
import { comandosInfo } from '../comandos/comandos.js'
import { UsuarioControle } from '../controles/UsuarioControle.js'
import axios from 'axios'
import translate from '@vitalets/google-translate-api'
import { handlersSorteios } from './diversao/sorteios.js'

export const diversao = async (c, mensagemBaileys, botInfo) => {
    // Atribuição de valores
    const comandos_info = comandosInfo(botInfo)
    const numero_dono = await new UsuarioControle().obterIdDono()
    const { prefixo, numero_bot, lid_bot } = botInfo
    const botsJid = [numero_bot, lid_bot].filter(Boolean)
    await socket.atualizarFlagsAdminGrupo(c, mensagemBaileys, botInfo)
    const {
        comando,
        texto_recebido,
        args,
        mensagem,
        id_chat,
        mensagem_grupo,
        mensagem_citada,
        mencionados,
        citacao,
        grupo,
        remetente
    } = mensagemBaileys
    const { dono, usuario_admin, bot_admin } = { ...grupo }
    const comandoSemPrefixo = comando.replace(prefixo, "")

    // Comandos de diversão
    try {
        switch (comandoSemPrefixo) {
            case 'detector':
                try {
                    if (!mensagem_grupo) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.grupo, mensagem)
                    if (!mensagem_citada) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let imgsDetector = ['verdade', 'vaipra', 'mentiroso', 'meengana', 'kao', 'incerteza', 'estresse', 'conversapraboi']
                    let indexAleatorio = Math.floor(Math.random() * imgsDetector.length)
                    await socket.responderArquivoLocal(c, tiposMensagem.imagem, id_chat, './bot/midia/detector/calibrando.png', comandos_info.diversao.detector.msgs.espera, mensagem)
                    await socket.responderArquivoLocal(c, tiposMensagem.imagem, id_chat, `./bot/midia/detector/${imgsDetector[indexAleatorio]}.png`, '', citacao.mensagem)
                } catch (err) {
                    throw err
                }
                break

            case 'chance':
                try {
                    if (!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let num = Math.floor(Math.random() * 100), temaChance = texto_recebido
                    if (mensagem_citada) {
                        await socket.responderTexto(c, id_chat, criarTexto(comandos_info.diversao.chance.msgs.resposta, num, temaChance), citacao.mensagem)
                    } else {
                        await socket.responderTexto(c, id_chat, criarTexto(comandos_info.diversao.chance.msgs.resposta, num, temaChance), mensagem)
                    }
                } catch (err) {
                    throw err
                }
                break

            case "caracoroa":
                try {
                    if (!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let ladosMoeda = ["cara", "coroa"]
                    let textoUsuario = texto_recebido.toLowerCase()
                    if (!ladosMoeda.includes(textoUsuario)) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    await socket.responderTexto(c, id_chat, comandos_info.diversao.caracoroa.msgs.espera, mensagem)
                    let indexAleatorio = Math.floor(Math.random() * ladosMoeda.length)
                    let vitoriaUsuario = ladosMoeda[indexAleatorio] == textoUsuario
                    let textoResultado
                    if (vitoriaUsuario) {
                        textoResultado = criarTexto(comandos_info.diversao.caracoroa.msgs.resposta.vitoria, primeiraLetraMaiuscula(ladosMoeda[indexAleatorio]))
                    } else {
                        textoResultado = criarTexto(comandos_info.diversao.caracoroa.msgs.resposta.derrota, primeiraLetraMaiuscula(ladosMoeda[indexAleatorio]))
                    }
                    await socket.responderArquivoUrl(c, tiposMensagem.imagem, id_chat, path.resolve(`bot/midia/caracoroa/${ladosMoeda[indexAleatorio]}.png`), textoResultado, mensagem)
                } catch (err) {
                    throw err
                }
                break

            case "ppt":
                try {
                    let ppt = ["pedra", "papel", "tesoura"], indexAleatorio = Math.floor(Math.random() * ppt.length)
                    if (!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    if (!ppt.includes(texto_recebido.toLowerCase())) return await socket.responderTexto(c, id_chat, comandos_info.diversao.ppt.msgs.opcao_erro, mensagem)
                    let escolhaBot = ppt[indexAleatorio], iconeEscolhaBot = null, escolhaUsuario = texto_recebido.toLowerCase(), iconeEscolhaUsuario = null, vitoriaUsuario = null
                    if (escolhaBot == "pedra") {
                        iconeEscolhaBot = "✊"
                        if (escolhaUsuario == "pedra") vitoriaUsuario = null, iconeEscolhaUsuario = "✊"
                        if (escolhaUsuario == "tesoura") vitoriaUsuario = false, iconeEscolhaUsuario = "✌️"
                        if (escolhaUsuario == "papel") vitoriaUsuario = true, iconeEscolhaUsuario = "✋"
                    } else if (escolhaBot == "papel") {
                        iconeEscolhaBot = "✋"
                        if (escolhaUsuario == "pedra") vitoriaUsuario = false, iconeEscolhaUsuario = "✊"
                        if (escolhaUsuario == "tesoura") vitoriaUsuario = true, iconeEscolhaUsuario = "✌️"
                        if (escolhaUsuario == "papel") vitoriaUsuario = null, iconeEscolhaUsuario = "✋"
                    } else {
                        iconeEscolhaBot = "✌️"
                        if (escolhaUsuario == "pedra") vitoriaUsuario = true, iconeEscolhaUsuario = "✊"
                        if (escolhaUsuario == "tesoura") vitoriaUsuario = null, iconeEscolhaUsuario = "✌️"
                        if (escolhaUsuario == "papel") vitoriaUsuario = false, iconeEscolhaUsuario = "✋"
                    }
                    let textoResultado = ''
                    if (vitoriaUsuario == true) {
                        textoResultado = criarTexto(comandos_info.diversao.ppt.msgs.resposta.vitoria, iconeEscolhaUsuario, iconeEscolhaBot)
                    } else if (vitoriaUsuario == false) {
                        textoResultado = criarTexto(comandos_info.diversao.ppt.msgs.resposta.derrota, iconeEscolhaUsuario, iconeEscolhaBot)
                    } else {
                        textoResultado = criarTexto(comandos_info.diversao.ppt.msgs.resposta.empate, iconeEscolhaUsuario, iconeEscolhaBot)
                    }
                    await socket.responderTexto(c, id_chat, textoResultado, mensagem)
                } catch (err) {
                    throw err
                }
                break

            case "massacote":
            case 'mascote':
                try {
                    const mascoteLocal = './bot/midia/mascote.png'
                    if (await fs.pathExists(mascoteLocal)) {
                        await socket.responderArquivoLocal(c, tiposMensagem.imagem, id_chat, mascoteLocal, 'Whatsapp Jr.', mensagem)
                    } else {
                        await socket.responderArquivoUrl(c, tiposMensagem.imagem, id_chat, 'https://i.imgur.com/mVwa7q4.png', 'Whatsapp Jr.', mensagem).catch(async () => {
                            await socket.responderTexto(c, id_chat, '⚠️ Não foi possível carregar o mascote agora.', mensagem)
                        })
                    }
                } catch (err) {
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err?.erro || err?.message || 'Erro ao carregar mascote'), mensagem)
                }
                break

            case 'roletarussa':
                try {
                    if (!mensagem_grupo) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.grupo, mensagem)
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin, mensagem)
                    if (!bot_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.bot_admin, mensagem)
                    const { participantesSemBot } = await import('../lib/util.js')
                    let idParticipantesAtuais = participantesSemBot(grupo.participantes, ...botsJid)
                    if (dono && dono != numero_bot) {
                        idParticipantesAtuais = participantesSemBot(idParticipantesAtuais, dono)
                    }
                    if (idParticipantesAtuais.length == 0) return await socket.responderTexto(c, id_chat, comandos_info.diversao.roletarussa.msgs.sem_membros, mensagem)
                    const [participanteEscolhido] = sortearMembros(idParticipantesAtuais, 1)
                    let respostaTexto = criarTexto(comandos_info.diversao.roletarussa.msgs.resposta, mencaoNumero(participanteEscolhido))
                    await socket.responderTexto(c, id_chat, comandos_info.diversao.roletarussa.msgs.espera, mensagem)
                    await socket.enviarTextoComMencoes(c, id_chat, respostaTexto, [participanteEscolhido])
                    await socket.removerParticipante(c, id_chat, participanteEscolhido)
                } catch (err) {
                    throw err
                }
                break

            case 'casal':
                try {
                    await handlersSorteios.casal({
                        c, id_chat, grupo, numero_bot: botsJid, comandos_info, mensagem, mensagem_grupo
                    })
                } catch (err) {
                    throw err
                }
                break

            case 'par':
                try {
                    if (!mensagem_grupo) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.grupo, mensagem)
                    if (mencionados.length !== 2) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let respostas = comandos_info.diversao.par.msgs.respostas
                    let indexAleatorio = Math.floor(Math.random() * respostas.length)
                    let respostaTexto = criarTexto(comandos_info.diversao.par.msgs.resposta, mencaoNumero(mencionados[0]), mencaoNumero(mencionados[1]), respostas[indexAleatorio])
                    await socket.enviarTextoComMencoes(c, id_chat, respostaTexto, mencionados)
                } catch (err) {
                    throw err
                }
                break

            // NOVOS COMANDOS

            case 'trisal':
            case 'top':
            case 'sortear':
                try {
                    await handlersSorteios[comandoSemPrefixo]({
                        c,
                        id_chat,
                        grupo,
                        numero_bot: botsJid,
                        comandos_info,
                        mensagem,
                        mensagem_grupo,
                        args,
                        texto_recebido,
                        comando,
                        botInfo,
                        erroComandoMsg
                    })
                } catch (err) {
                    throw err
                }
                break

            case 'crime':
            case 'tribunal':
            case 'horoscopo':
            case 'cancelado':
                try {
                    if (!mensagem_grupo) {
                        return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.grupo, mensagem)
                    }
                    const { membrosDoGrupo, sortearNomes, listaNomesTexto, PROMPTS } = await import('../lib/dramaGrupo.js')
                    const { aplicarMencoes } = await import('../lib/mencoes.js')
                    const participantes = grupo?.participantes || []
                    const membros = await membrosDoGrupo(id_chat, participantes, ...botsJid)
                    if (membros.length < 1) {
                        return await socket.responderTexto(c, id_chat, 'Preciso de membros no grupo pra isso.', mensagem)
                    }
                    const nomeGrupo = grupo?.nome || 'o grupo'
                    const nomes = listaNomesTexto(membros)

                    let alvo = sortearNomes(membros, 1)[0]
                    if (mencionados?.length) {
                        const m = membros.find((x) => mencionados.includes(x.jid)) || {
                            jid: mencionados[0],
                            nome: membros.find((x) => x.jid === mencionados[0])?.nome || 'Alguém'
                        }
                        alvo = m
                    }

                    let prompt
                    if (comandoSemPrefixo === 'crime') prompt = PROMPTS.crime(nomeGrupo, nomes, alvo.nome)
                    else if (comandoSemPrefixo === 'tribunal') prompt = PROMPTS.tribunal(nomeGrupo, nomes, alvo.nome)
                    else if (comandoSemPrefixo === 'horoscopo') {
                        prompt = PROMPTS.horoscopo(nomeGrupo, nomes, alvo.nome, texto_recebido || '')
                    } else if (comandoSemPrefixo === 'cancelado') prompt = PROMPTS.cancelado(nomeGrupo, nomes, alvo.nome)

                    const { resultado: textoIA } = await api.IA.gerarTextoGrupoIA(prompt.user, prompt.system)
                    if (!textoIA || textoIA.length < 40) {
                        return await socket.responderTexto(
                            c,
                            id_chat,
                            criarTexto(comandos_info.outros.erro_api, comando, 'IA não gerou texto útil.'),
                            mensagem
                        )
                    }

                    const { texto: textoComTags, mentions } = aplicarMencoes(textoIA, membros, participantes)
                    const comAudio = comandoSemPrefixo === 'cancelado'

                    if (mentions.length) {
                        await socket.responderComMencoes(c, id_chat, textoComTags.slice(0, 4000), mentions, mensagem)
                    } else {
                        await socket.responderTexto(c, id_chat, textoComTags.slice(0, 4000), mensagem)
                    }

                    if (comAudio) {
                        const { resultado: audio, mimetype } = await api.IA.gerarAudioNarrado(textoIA, {
                            maxPalavras: 280,
                            preferirEleven: !!mensagemBaileys.mensagem_dono
                        })
                        await socket.responderVozBuffer(c, id_chat, audio, mensagem, mimetype || 'audio/ogg; codecs=opus')
                    }
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro), mensagem)
                }
                break

        }
    } catch (err) {
        await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_comando_codigo, comando), mensagem)
        err.message = `${comando} - ${err.message}`
        consoleErro(err, "DIVERSÃO")
    }

}
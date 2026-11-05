import { criarTexto, erroComandoMsg, consoleErro } from '../lib/util.js'
import api from '../lib/lbotApi.js'
import * as socket from '../baileys/socket.js'
import { tiposMensagem } from '../baileys/mensagem.js'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { comandosInfo } from '../comandos/comandos.js'

/**
 * Comandos de IA / conteúdo gerado.
 * - Gemini + OpenRouter/Rapid backup
 * - SimSimi / Perplexity / Grok / JSearch via RapidAPI
 */
export const ia = async (c, mensagemBaileys, botInfo) => {
    const comandos_info = comandosInfo(botInfo)
    const { prefixo } = botInfo
    const {
        texto_recebido,
        comando,
        tipo,
        mensagem,
        id_chat,
        mensagem_citada,
        citacao,
        mensagem_grupo,
        grupo
    } = mensagemBaileys
    const comandoSemPrefixo = comando.replace(prefixo, '')

    const textoCitado = mensagem_citada ? (citacao?.corpo || citacao?.legenda || '') : ''
    const textoEntrada = (texto_recebido || textoCitado || '').trim()

    const bufferMidiaCitada = async () => {
        const msg = mensagem_citada ? citacao.mensagem : mensagem
        return downloadMediaMessage(msg, 'buffer')
    }

    try {
        switch (comandoSemPrefixo) {
            case 'comofaz':
                try {
                    const { resultado } = await api.IA.obterComoFaz()
                    await socket.responderTexto(c, id_chat, resultado, mensagem)
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro), mensagem)
                }
                break

            case 'playlist':
                try {
                    if (!textoEntrada) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    const { resultado } = await api.IA.obterPlaylist(textoEntrada)
                    await socket.responderTexto(c, id_chat, resultado, mensagem)
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro), mensagem)
                }
                break

            case 'explica':
                try {
                    if (!textoEntrada) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    const { resultado } = await api.IA.explicaTexto(textoEntrada)
                    await socket.responderTexto(c, id_chat, resultado, mensagem)
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro), mensagem)
                }
                break

            case 'spoiler':
                try {
                    if (!textoEntrada) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    const { resultado } = await api.IA.spoilerFilme(textoEntrada)
                    await socket.responderTexto(c, id_chat, `⚠️ *SPOILER*\n\n${resultado}`, mensagem)
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro), mensagem)
                }
                break

            case 'argumentos':
                try {
                    if (!textoEntrada) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    const { resultado } = await api.IA.argumentosTema(textoEntrada)
                    await socket.responderTexto(c, id_chat, resultado, mensagem)
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro), mensagem)
                }
                break

            case 'proscons':
                try {
                    if (!textoEntrada) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    const { resultado } = await api.IA.prosCons(textoEntrada)
                    await socket.responderTexto(c, id_chat, resultado, mensagem)
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro), mensagem)
                }
                break

            case 'comparar':
                try {
                    const partes = textoEntrada.split(/\s+vs\s+|\s+x\s+|,/i).map((s) => s.trim()).filter(Boolean)
                    if (partes.length < 2) {
                        return await socket.responderTexto(c, id_chat, `Use: *${prefixo}comparar* item1 vs item2`, mensagem)
                    }
                    const { resultado } = await api.IA.compararItens(partes[0], partes[1])
                    await socket.responderTexto(c, id_chat, resultado, mensagem)
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro), mensagem)
                }
                break

            case 'cotacao':
                try {
                    if (!textoEntrada) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    const { resultado } = await api.IA.obterCotacao(textoEntrada)
                    await socket.responderTexto(c, id_chat, resultado, mensagem)
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro), mensagem)
                }
                break

            case 'simulado':
                try {
                    if (!textoEntrada) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    const { resultado } = await api.IA.simuladoProva(textoEntrada)
                    await socket.responderTexto(c, id_chat, resultado, mensagem)
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro), mensagem)
                }
                break

            case 'roteiro':
                try {
                    if (!textoEntrada) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    const { resultado } = await api.IA.roteiroVideo(textoEntrada)
                    await socket.responderTexto(c, id_chat, resultado, mensagem)
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro), mensagem)
                }
                break

            case 'resuma':
                try {
                    const texto = (textoCitado || texto_recebido || '').trim()
                    if (!texto) {
                        return await socket.responderTexto(
                            c,
                            id_chat,
                            `Responda uma mensagem com *${prefixo}resuma* (ou envie o texto).`,
                            mensagem
                        )
                    }
                    const { resultado } = await api.IA.resumirTexto(texto)
                    await socket.responderTexto(c, id_chat, `📝 *Resumo*\n\n${resultado}`, mensagem)
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro), mensagem)
                }
                break

            case 'upscale':
                try {
                    const tipoImg = mensagem_citada ? citacao.tipo : tipo
                    if (tipoImg != tiposMensagem.imagem) {
                        return await socket.responderTexto(c, id_chat, `Envie/responda uma *imagem* com *${prefixo}upscale*`, mensagem)
                    }
                    const buffer = await bufferMidiaCitada()
                    const { resultado } = await api.IA.upscaleImagem(buffer)
                    await socket.responderArquivoBuffer(c, tiposMensagem.imagem, id_chat, resultado, '', mensagem)
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro), mensagem)
                }
                break

            case 'criarimg':
            case 'criarimagem':
                try {
                    if (!textoEntrada) {
                        return await socket.responderTexto(
                            c,
                            id_chat,
                            criarTexto(
                                comandos_info.ia.criarimg.msgs.sem_prompt,
                                prefixo
                            ),
                            mensagem
                        )
                    }
                    await socket.responderTexto(
                        c,
                        id_chat,
                        comandos_info.ia.criarimg.msgs.espera,
                        mensagem
                    )
                    const { resultado } = await api.IA.obterImagemIA(textoEntrada)
                    const legenda = `🖼️ ${textoEntrada.slice(0, 200)}`
                    if (Buffer.isBuffer(resultado)) {
                        await socket.responderArquivoBuffer(
                            c,
                            tiposMensagem.imagem,
                            id_chat,
                            resultado,
                            legenda,
                            mensagem
                        )
                    } else if (typeof resultado === 'string' && resultado.startsWith('data:image')) {
                        const b64 = resultado.replace(/^data:image\/\w+;base64,/, '')
                        await socket.responderArquivoBuffer(
                            c,
                            tiposMensagem.imagem,
                            id_chat,
                            Buffer.from(b64, 'base64'),
                            legenda,
                            mensagem
                        )
                    } else {
                        throw { erro: 'Resposta de imagem em formato inesperado.' }
                    }
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(
                        c,
                        id_chat,
                        criarTexto(comandos_info.outros.erro_api, comando, err.erro),
                        mensagem
                    )
                }
                break

            case 'musica':
                try {
                    if (!mensagemBaileys.mensagem_dono) {
                        return await socket.responderTexto(
                            c,
                            id_chat,
                            '[❗] *!musica* (ElevenLabs) só o dono do bot pode usar.',
                            mensagem
                        )
                    }
                    if (!textoEntrada) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    await socket.responderTexto(c, id_chat, '🎵 Gerando música (~60–70s), aguarde…', mensagem)
                    const { resultado } = await api.IA.gerarMusicaIA(textoEntrada)
                    await socket.responderArquivoBuffer(c, tiposMensagem.audio, id_chat, resultado, '', mensagem, 'audio/mpeg')
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro), mensagem)
                }
                break

            case 'resumoportema':
                try {
                    if (!mensagem_grupo) {
                        return await socket.responderTexto(
                            c,
                            id_chat,
                            `O comando *${prefixo}resumoportema* só funciona em *grupos*.`,
                            mensagem
                        )
                    }
                    const idGrupo = grupo?.id_grupo || id_chat
                    const {
                        carregarJanelaResumoPorTema,
                        gerarResumoPorTemaDaJanela
                    } = await import('../servicos/resumoPorTema.js')
                    const janela = await carregarJanelaResumoPorTema(idGrupo, 1000)
                    if (janela.vazio) {
                        return await socket.responderTexto(c, id_chat, janela.avisoVazio, mensagem)
                    }
                    await socket.responderTexto(
                        c,
                        id_chat,
                        `📚 Analisando *${janela.msgs.length}* mensagens (textos + áudios). Montando o resumo por temas…`,
                        mensagem
                    )
                    const { resultado } = await gerarResumoPorTemaDaJanela(janela, grupo?.nome || 'o grupo')
                    const texto = String(resultado || '').trim()
                    await socket.responderTexto(
                        c,
                        id_chat,
                        texto || 'Não achei texto novo pra organizar por tema.',
                        mensagem
                    )
                } catch (err) {
                    let textoLocal = ''
                    try {
                        const { montarResumoTemaLocal } = await import('../../vendor/lbot-api-comandos/api/ia.js')
                        const idGrupo = grupo?.id_grupo || id_chat
                        const { carregarJanelaResumoPorTema } = await import('../servicos/resumoPorTema.js')
                        const janela = await carregarJanelaResumoPorTema(idGrupo, 1000)
                        if (janela?.msgs?.length) {
                            textoLocal = montarResumoTemaLocal(janela.msgs, grupo?.nome || 'o grupo')
                        }
                    } catch { /* histórico indisponível */ }
                    await socket.responderTexto(
                        c,
                        id_chat,
                        textoLocal || 'O histórico desse grupo não abriu agora. Chama de novo que eu leio as mensagens salvas.',
                        mensagem
                    )
                    if (!err?.erro) {
                        err.message = `${comando} - ${err.message}`
                        consoleErro(err, 'IA')
                    }
                }
                break

            case 'resumodogrupo':
                try {
                    if (!mensagem_grupo) {
                        return await socket.responderTexto(c, id_chat, `O comando *${prefixo}resumodogrupo* só funciona em *grupos*.`, mensagem)
                    }
                    const idGrupo = grupo?.id_grupo || id_chat
                    const {
                        carregarJanelaResumo,
                        gerarResumoDaJanela,
                        persistirAposResumo
                    } = await import('../servicos/resumoGrupo.js')
                    const janela = await carregarJanelaResumo(idGrupo, prefixo)
                    if (janela.vazio) {
                        return await socket.responderTexto(c, id_chat, janela.avisoVazio, mensagem)
                    }
                    await socket.responderTexto(
                        c,
                        id_chat,
                        'Tô analisando a bagunça do grupo. Já volto com a nota de voz.',
                        mensagem
                    )
                    let personalidadeGrupo = ''
                    try {
                        const { personaPara } = await import('../lib/ultronPersona.js')
                        personalidadeGrupo = personaPara('resumo', { maxChars: 12000 })
                    } catch { /* ignore */ }
                    try {
                        const { obterPersonalidadeResumo } = await import('../lib/personalidadeResumo.js')
                        const extra = (await obterPersonalidadeResumo(idGrupo)) || ''
                        if (extra) {
                            personalidadeGrupo =
                                (personalidadeGrupo ? `${personalidadeGrupo}\n\n` : '') +
                                `PERSONALIDADE EXTRA DESTE GRUPO (prioridade alta):\n${extra}`
                        }
                    } catch { /* ignore */ }
                    const { gerado, limiteSuperior, periodoInicio, periodoFim } = await gerarResumoDaJanela(
                        janela,
                        grupo?.nome || 'o grupo',
                        personalidadeGrupo,
                        { preferirEleven: !!mensagemBaileys.mensagem_dono }
                    )

                    const audioOk = gerado?.resultado?.length > 200
                    if (audioOk) {
                        await socket.responderVozBuffer(
                            c,
                            id_chat,
                            gerado.resultado,
                            mensagem,
                            gerado.mimetype || 'audio/ogg; codecs=opus'
                        )
                    } else {
                        const roteiro = String(gerado?.roteiro || '').trim()
                        await socket.responderTexto(
                            c,
                            id_chat,
                            roteiro
                                ? `O áudio não saiu. O comentário do grupo:\n\n${roteiro.slice(0, 3500)}`
                                : 'Não deu pra narrar agora, mas o histórico do grupo continua salvo.',
                            mensagem
                        )
                    }

                    try {
                        await persistirAposResumo(idGrupo, limiteSuperior, gerado, { periodoInicio, periodoFim })
                    } catch (erroMarco) {
                        consoleErro(erroMarco, 'RESUMO GRUPO')
                    }
                } catch (err) {
                    await socket.responderTexto(
                        c,
                        id_chat,
                        'O resumo em áudio falhou, mas o grupo continua sendo lido. Chama de novo que eu devolvo o comentário em texto.',
                        mensagem
                    )
                    err.message = `${comando} - ${err?.erro || err?.message || err}`
                    consoleErro(err, 'RESUMO GRUPO')
                }
                break

            case 'personalidaderesumo':
            case 'resumopersona':
                try {
                    if (!mensagem_grupo) {
                        return await socket.responderTexto(
                            c,
                            id_chat,
                            `O comando *${prefixo}personalidaderesumo* só funciona em *grupos*.`,
                            mensagem
                        )
                    }
                    if (!grupo?.usuario_admin && !mensagemBaileys.mensagem_dono) {
                        return await socket.responderTexto(
                            c,
                            id_chat,
                            comandos_info.outros.permissao.apenas_admin,
                            mensagem
                        )
                    }
                    const idGrupoPers = grupo?.id_grupo || id_chat
                    const {
                        obterPersonalidadeResumo,
                        definirPersonalidadeResumo
                    } = await import('../lib/personalidadeResumo.js')
                    const textoPers = String(texto_recebido || '').trim()
                    if (!textoPers || /^ver|atual|mostrar|status$/i.test(textoPers)) {
                        const atual = (await obterPersonalidadeResumo(idGrupoPers)) || ''
                        return await socket.responderTexto(
                            c,
                            id_chat,
                            atual
                                ? `🎭 Personalidade do *resumodogrupo*:\n${atual}\n\n_Use *${prefixo}personalidaderesumo reset* pra voltar ao padrão._`
                                : `🎭 Personalidade do *resumodogrupo*: *padrão*.\nEx: *${prefixo}personalidaderesumo* fala como um tiozão fofoqueiro`,
                            mensagem
                        )
                    }
                    if (/^(padrao|padrão|reset|limpar|default)$/i.test(textoPers)) {
                        await definirPersonalidadeResumo(idGrupoPers, '')
                        return await socket.responderTexto(
                            c,
                            id_chat,
                            '✅ Personalidade do *resumodogrupo* voltou ao padrão.',
                            mensagem
                        )
                    }
                    await definirPersonalidadeResumo(idGrupoPers, textoPers)
                    await socket.responderTexto(
                        c,
                        id_chat,
                        `✅ Personalidade do *resumodogrupo* salva:\n${textoPers.slice(0, 500)}`,
                        mensagem
                    )
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(
                        c,
                        id_chat,
                        criarTexto(comandos_info.outros.erro_api, comando, err.erro),
                        mensagem
                    )
                }
                break
        }
    } catch (err) {
        await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_comando_codigo, comando), mensagem)
        err.message = `${comando} - ${err.message}`
        consoleErro(err, 'IA')
    }
}

import { criarTexto, erroComandoMsg, consoleErro } from '../lib/util.js'
import api from '@victorsouzaleal/lbot-api-comandos'
import * as socket from '../baileys/socket.js'
import { tiposMensagem } from '../baileys/mensagem.js'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { comandosInfo } from '../comandos/comandos.js'

/**
 * Comandos de IA / conteúdo gerado.
 * - ChatGPT-42 RapidAPI (texto/chat): RAPIDAPI_KEY
 * - Gemini / OpenRouter (backup texto)
 * - Flux RapidAPI (criaimg)
 * - SimSimi / Perplexity / Grok / JSearch via RapidAPI
 */
const enviarImagemIA = async (c, id_chat, resultado, legenda, mensagem) => {
    if (Buffer.isBuffer(resultado)) {
        await socket.responderArquivoBuffer(c, tiposMensagem.imagem, id_chat, resultado, legenda, mensagem)
    } else if (typeof resultado === 'string' && resultado.startsWith('data:image')) {
        const b64 = resultado.replace(/^data:image\/\w+;base64,/, '')
        await socket.responderArquivoBuffer(c, tiposMensagem.imagem, id_chat, Buffer.from(b64, 'base64'), legenda, mensagem)
    } else {
        await socket.responderArquivoUrl(c, tiposMensagem.imagem, id_chat, resultado, legenda, mensagem)
    }
}

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

            case 'curiosidade':
                try {
                    const { sortearItem } = await import('../lib/conteudo.js')
                    const local = sortearItem('curiosidades', id_chat)
                    if (local) {
                        return await socket.responderTexto(c, id_chat, `💡 *Curiosidade*\n\n${local}`, mensagem)
                    }
                    const { resultado } = await api.IA.obterCuriosidade()
                    await socket.responderTexto(c, id_chat, `💡 *Curiosidade*\n\n${resultado}`, mensagem)
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

                break

            case 'criaimg':
                try {
                    if (!textoEntrada) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    await socket.responderTexto(c, id_chat, '🖼️ Gerando imagem (Pollinations)…', mensagem)
                    const { resultado } = await api.IA.obterImagemIA(textoEntrada)
                    await enviarImagemIA(c, id_chat, resultado, textoEntrada.slice(0, 80), mensagem)
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro), mensagem)
                }
                break

            case 'criavideo':
                try {
                    if (!textoEntrada) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    await socket.responderTexto(c, id_chat, '🎬 Gerando vídeo (2 cenas)… pode levar ~1 min', mensagem)
                    const { resultado } = await api.IA.obterVideoIA(textoEntrada)
                    if (Buffer.isBuffer(resultado)) {
                        await socket.responderArquivoBuffer(c, tiposMensagem.video, id_chat, resultado, '', mensagem, 'video/mp4')
                    } else {
                        await socket.responderArquivoUrl(c, tiposMensagem.video, id_chat, resultado, '', mensagem, 'video/mp4')
                    }
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro), mensagem)
                }
                break

            case 'i2i':
                try {
                    const tipoImg = mensagem_citada ? citacao.tipo : tipo
                    if (tipoImg != tiposMensagem.imagem) {
                        return await socket.responderTexto(
                            c,
                            id_chat,
                            `Envie/responda uma *imagem* com *${prefixo}i2i* prompt\nEx: *${prefixo}i2i* estilo anime, fundo neon`,
                            mensagem
                        )
                    }
                    if (!textoEntrada) {
                        return await socket.responderTexto(
                            c,
                            id_chat,
                            `Informe o prompt: *${prefixo}i2i* descrição do que mudar`,
                            mensagem
                        )
                    }
                    await socket.responderTexto(c, id_chat, '🖼️ Image-to-image em andamento…', mensagem)
                    const buffer = await bufferMidiaCitada()
                    const { resultado } = await api.IA.imagemParaImagemIA(buffer, textoEntrada)
                    await enviarImagemIA(c, id_chat, resultado, textoEntrada.slice(0, 80), mensagem)
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

            case 'musica':
                try {
                    if (!textoEntrada) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    await socket.responderTexto(c, id_chat, '🎵 Gerando música (~60–70s), aguarde…', mensagem)
                    const { resultado } = await api.IA.gerarMusicaIA(textoEntrada)
                    await socket.responderArquivoBuffer(c, tiposMensagem.audio, id_chat, resultado, '', mensagem, 'audio/mpeg')
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro), mensagem)
                }
                break

            case 'vocalsonly':
                try {
                    const tipoAud = mensagem_citada ? citacao.tipo : tipo
                    if (tipoAud != tiposMensagem.audio && tipoAud != tiposMensagem.video) {
                        return await socket.responderTexto(c, id_chat, `Responda um *áudio/vídeo* com *${prefixo}vocalsonly*`, mensagem)
                    }
                    await socket.responderTexto(c, id_chat, '🎙️ Isolando vocais (UVR)…', mensagem)
                    const buffer = await bufferMidiaCitada()
                    const { resultado } = await api.IA.isolarVocais(buffer)
                    await socket.responderArquivoBuffer(c, tiposMensagem.audio, id_chat, resultado, '', mensagem, 'audio/mpeg')
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro), mensagem)
                }
                break

            case 'instrumentalonly':
                try {
                    const tipoAud = mensagem_citada ? citacao.tipo : tipo
                    if (tipoAud != tiposMensagem.audio && tipoAud != tiposMensagem.video) {
                        return await socket.responderTexto(c, id_chat, `Responda um *áudio/vídeo* com *${prefixo}instrumentalonly*`, mensagem)
                    }
                    await socket.responderTexto(c, id_chat, '🎸 Isolando instrumental (UVR)…', mensagem)
                    const buffer = await bufferMidiaCitada()
                    const { resultado } = await api.IA.isolarInstrumental(buffer)
                    await socket.responderArquivoBuffer(c, tiposMensagem.audio, id_chat, resultado, '', mensagem, 'audio/mpeg')
                } catch (err) {
                    if (!err.erro) throw err
                    await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_api, comando, err.erro), mensagem)
                }
                break

            case 'resumodogrupo':
                try {
                    if (!mensagem_grupo) {
                        return await socket.responderTexto(c, id_chat, `O comando *${prefixo}resumodogrupo* só funciona em *grupos*.`, mensagem)
                    }
                    const idGrupo = grupo?.id_grupo || id_chat
                    const limiteSuperior = Date.now()
                    const { historicoGrupo, obterJanelaResumoGrupo } = await import('../controles/HistoricoGrupoControle.js')
                    const { msgs, teveResumoAnterior, marcoNovo } = await obterJanelaResumoGrupo(idGrupo, prefixo, limiteSuperior)
                    if (!msgs?.length) {
                        const avisoVazio = teveResumoAnterior
                            ? `Desde o último *${prefixo}resumodogrupo* não entrou mensagem nova. Deixa o grupo falar e chama de novo.`
                            : 'Ainda não há mensagens guardadas deste grupo. Deixe o bot online enquanto o pessoal conversa e tente de novo.'
                        return await socket.responderTexto(c, id_chat, avisoVazio, mensagem)
                    }
                    const semVozIa = !(process.env.ELEVENLABS_API_KEY?.trim() || process.env.XI_API_KEY?.trim())
                    let espera = 'Tô montando o comentário do grupo. A nota de voz sai com *5 a 10 minutos*, então espera um pouco.'
                    if (semVozIa) {
                        espera += '\n\n[❗] Erro: a IA de voz não está disponível (ElevenLabs sem chave). O resumo vai no *TTS gratuito*.'
                    }
                    await socket.responderTexto(c, id_chat, espera, mensagem)
                    const nomeGrupo = grupo?.nome || 'o grupo'
                    const { resultado, mimetype, avisoTts } = await api.IA.gerarResumoGrupoAudio({
                        mensagens: msgs,
                        nomeGrupo,
                        teveResumoAnterior,
                        avisarSemVozIa: !semVozIa
                    })
                    if (avisoTts) {
                        await socket.responderTexto(c, id_chat, avisoTts, mensagem)
                    }
                    await socket.responderVozBuffer(
                        c,
                        id_chat,
                        resultado,
                        mensagem,
                        mimetype || 'audio/ogg; codecs=opus'
                    )
                    try {
                        await historicoGrupo.definirMarcoResumo(idGrupo, marcoNovo || limiteSuperior)
                    } catch (erroMarco) {
                        consoleErro(erroMarco, 'RESUMO GRUPO')
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
        consoleErro(err, 'IA')
    }
}

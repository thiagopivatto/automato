import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs-extra'
import axios from 'axios'
import {obterCaminhoTemporario, detectarMimeBuffer} from '../lib/util.js'
import {converterMp4ParaMp3} from './videos.js'
import duration from 'format-duration-time'
import acrcloud from 'acrcloud'
import {createClient} from '@deepgram/sdk'
import { textoParaVozRobusto, OPCOES_TTS_ULTRON } from '../lib/tts-robusto.js'

async function obterChavesApi() {
    try {
        const {data} = await axios.get('https://dub.sh/lbot-api-keys', {responseType: 'json', timeout: 10000})
        return data || {}
    } catch {
        return {}
    }
}

export const textoParaVoz = async (idioma, texto, opts = {}) => {
    try {
        // Padrão Edge; ElevenLabs só se preferirEleven (dono)
        const lang = String(idioma || 'pt').toLowerCase()
        const ehPt = /^(pt|pt-br|br)$/.test(lang)
        const { resultado, mimetype, ptt, fonte } = await textoParaVozRobusto(texto, {
            idioma: lang,
            maxPalavras: 1200,
            somenteEdge: true,
            ...(ehPt ? { ...OPCOES_TTS_ULTRON } : {}),
            ...opts
        })
        if (fonte) console.log(`API textoParaVoz fonte=${fonte}`)
        return { resultado, mimetype, ptt: ptt !== false }
    } catch (err) {
        console.log(`API textoParaVoz - ${err?.erro || err?.message || err}`)
        throw {
            erro: err?.erro || 'Erro na conversão de texto para voz.'
        }
    }
}

export const obterTranscricaoAudio = async (bufferAudio, {deepgram_secret_key} = {}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let resposta = {}
            const chaves = []
            if (deepgram_secret_key) chaves.push(deepgram_secret_key)

            if (!chaves.length) {
                const apiKeys = await obterChavesApi()
                for (const key of (apiKeys.deepgram || [])) {
                    if (key?.secret_key) chaves.push(key.secret_key)
                }
            }

            if (!chaves.length) {
                resposta.erro = 'A chave do DEEPGRAM não foi inserida corretamente.'
                reject(resposta)
                return
            }

            let ultimoErro
            for (const secret of chaves) {
                try {
                    const deepgram = createClient(secret)
                    const {result, error} = await deepgram.listen.prerecorded.transcribeFile(
                        bufferAudio,
                        {
                            model: 'nova-2',
                            language: 'pt-BR',
                            smart_format: true,
                        },
                    )

                    if (error) {
                        ultimoErro = error
                        continue
                    }

                    resposta.resultado = result
                    resolve(resposta)
                    return
                } catch (err) {
                    ultimoErro = err
                }
            }

            console.log(`API obterTranscricaoAudio - ${ultimoErro?.message || ultimoErro}`)
            reject({erro: 'Erro no servidor para obter a transcrição do áudio.'})
        } catch (err) {
            console.log(`API obterTranscricaoAudio - ${err.message}`)
            reject({erro: 'Erro no servidor para obter a transcrição do áudio.'})
        }
    })
}

export const obterAudioModificado = async (bufferAudio, tipo) => {
    return new Promise((resolve, reject) => {
        try {
            let resposta = {}
            let caminhoAudio = obterCaminhoTemporario('mp3')
            let saidaAudio = obterCaminhoTemporario('mp3')
            let ffmpegOpcoes = []
            fs.writeFileSync(caminhoAudio, bufferAudio)
            switch (tipo) {
                case 'estourar':
                    ffmpegOpcoes = ['-y', '-filter_complex', 'acrusher=level_in=3:level_out=5:bits=10:mode=log:aa=1']
                    break
                case 'reverso':
                    ffmpegOpcoes = ['-y', '-filter_complex', 'areverse']
                    break
                case 'grave':
                    ffmpegOpcoes = ['-y', '-af', 'asetrate=44100*0.8']
                    break
                case 'agudo':
                    ffmpegOpcoes = ['-y', '-af', 'asetrate=44100*1.4']
                    break
                case 'x2':
                    ffmpegOpcoes = ['-y', '-filter:a', 'atempo=2.0', '-vn']
                    break
                case 'volume':
                    ffmpegOpcoes = ['-y', '-filter:a', 'volume=4.0']
                    break
                default:
                    fs.unlinkSync(caminhoAudio)
                    resposta.erro = `Esse tipo de edição não é suportado`
                    reject(resposta)
                    return
            }

            ffmpeg(caminhoAudio).outputOptions(ffmpegOpcoes).save(saidaAudio)
                .on('end', async () => {
                    let bufferAudioEditado = fs.readFileSync(saidaAudio)
                    fs.unlinkSync(caminhoAudio)
                    fs.unlinkSync(saidaAudio)
                    resposta.resultado = bufferAudioEditado
                    resolve(resposta)
                })
                .on('error', () => {
                    fs.unlinkSync(caminhoAudio)
                    resposta.erro = `Houve um erro na modificação do áudio`
                    reject(resposta)
                })
        } catch (err) {
            console.log(`API obterAudioModificado - ${err.message}`)
            reject({erro: `Houve um erro na modificação do áudio`})
        }
    })
}

export const obterReconhecimentoMusica = async (bufferMidia, {acr_host, acr_access_key, acr_access_secret} = {}) => {
    return new Promise(async (resolve, reject) => {
        try {
            let resposta = {}
            let bufferAudio
            let tipoArquivo = await detectarMimeBuffer(bufferMidia, 'audio/mpeg')

            const credenciais = []
            if (acr_host && acr_access_key && acr_access_secret) {
                credenciais.push({
                    host: acr_host.trim(),
                    access_key: acr_access_key.trim(),
                    access_secret: acr_access_secret.trim()
                })
            } else {
                const apiKeys = await obterChavesApi()
                for (const key of (apiKeys.acrcloud || [])) {
                    if (key?.host && key?.access_key && key?.secret_key) {
                        credenciais.push({
                            host: key.host,
                            access_key: key.access_key,
                            access_secret: key.secret_key
                        })
                    }
                }
            }

            if (!credenciais.length) {
                resposta.erro = 'As chaves do ACRCloud não foram inseridas corretamente'
                reject(resposta)
                return
            }

            if (tipoArquivo.startsWith('video')) {
                bufferAudio = (await converterMp4ParaMp3(bufferMidia)).resultado
            } else if (tipoArquivo.startsWith('audio')) {
                bufferAudio = bufferMidia
            } else {
                resposta.erro = 'Esse tipo de mensagem não é suportado.'
                reject(resposta)
                return
            }

            let ultimoErro
            for (const cred of credenciais) {
                try {
                    const acr = new acrcloud({
                        host: cred.host,
                        access_key: cred.access_key,
                        access_secret: cred.access_secret
                    })

                    const resp = await acr.identify(bufferAudio)
                    if (resp.status.code == 1001) {
                        resposta.erro = 'Não foi encontrada uma música compatível.'
                        reject(resposta)
                        return
                    }
                    if (resp.status.code == 3003 || resp.status.code == 3015) {
                        ultimoErro = new Error('ACRCloud limit')
                        continue
                    }
                    if (resp.status.code == 3000) {
                        ultimoErro = new Error('ACRCloud server error')
                        continue
                    }

                    const music = resp.metadata.music[0]
                    let arrayDataLancamento = music.release_date ? music.release_date.split('-') : []
                    let artistas = (music.artists || []).map(a => a.name)

                    resposta.resultado = {
                        produtora: music.label || '-----',
                        duracao: duration.default(music.duration_ms).format('m:ss'),
                        lancamento: arrayDataLancamento.length ? `${arrayDataLancamento[2]}/${arrayDataLancamento[1]}/${arrayDataLancamento[0]}` : '-----',
                        album: music.album?.name || '-----',
                        titulo: music.title,
                        artistas: artistas.toString()
                    }
                    resolve(resposta)
                    return
                } catch (err) {
                    ultimoErro = err
                }
            }

            console.log(`API obterReconhecimentoMusica - ${ultimoErro?.message || ultimoErro}`)
            reject({erro: 'Erro na conexão com a API ACRCloud ou sua chave ainda não está configurada para usar este comando.'})
        } catch (err) {
            console.log(`API obterReconhecimentoMusica - ${err.message}`)
            reject({erro: 'Erro na conexão com a API ACRCloud ou sua chave ainda não está configurada para usar este comando.'})
        }
    })
}

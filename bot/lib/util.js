import moment from "moment-timezone"
import {comandosInfo} from '../comandos/comandos.js'
import chalk from 'chalk'
import {BotControle} from '../controles/BotControle.js'
import {UsuarioControle} from "../controles/UsuarioControle.js"
import path from 'node:path'
import fs from 'fs-extra'


export const erroComandoMsg = (comando, botInfo) =>{
  const comandos_info = comandosInfo(botInfo)
  return criarTexto(comandos_info.outros.cmd_erro, comando, comando)
}

export const versaoAtual = () =>{
    return JSON.parse(fs.readFileSync(path.resolve('package.json'))).version
}

export const corTexto = (texto, cor)=>{
    return !cor ? chalk.green(texto) : chalk.hex(cor)(texto)
}

export const criarTexto = (texto, ...params)=>{
  for(let i = 0; i < params.length; i++){
      texto = texto.replace(`{p${i+1}}`, params[i])
  }
  return texto
}

/** Extrai o ID usável em @menção (suporta @s.whatsapp.net e @lid). */
export const mencaoNumero = (jid)=>{
  if(!jid) return ''
  return String(jid).split('@')[0]
}

/** Verifica se algum JID está na lista (suporta @lid e @s.whatsapp.net). */
export const listaContemJid = (lista = [], ...candidatos)=>{
  const set = new Set((lista || []).filter(Boolean).map(String))
  return candidatos.some(j => j && set.has(String(j)))
}

/** Sorteia N membros sem mutar o array original. */
export const sortearMembros = (participantes = [], quantidade = 1)=>{
  const copia = [...participantes]
  const escolhidos = []
  const total = Math.min(quantidade, copia.length)
  for(let i = 0; i < total; i++){
    const idx = Math.floor(Math.random() * copia.length)
    escolhidos.push(copia.splice(idx, 1)[0])
  }
  return escolhidos
}

export const timestampParaData = (timestampMsg)=>{
    return moment(timestampMsg).format('DD/MM HH:mm:ss')
}

export const dataHoraAtual = ()=>{
  return moment(Date.now()).format('DD/MM HH:mm:ss')
}

export const obterTempoRespostaSeg = (timestampMensagem) => {
    let tResposta = moment.now() - timestampMensagem
    return (tResposta/1000).toFixed(2)
}

export const consoleComando = (isGroup, categoria, comando, hex, timestampMsg, nomeUsuario, nomeChat)=>{
    let tMensagem = timestampParaData(timestampMsg)
    let tResposta = obterTempoRespostaSeg(timestampMsg)
    if(isGroup){
      console.log('\x1b[1;31m~\x1b[1;37m>', corTexto(`[GRUPO - ${categoria}]`, hex), tMensagem, corTexto(comando), 'de', corTexto(nomeUsuario), 'em', corTexto(nomeChat), `(${corTexto(`${tResposta}s`)})`)
    } else {
      console.log('\x1b[1;31m~\x1b[1;37m>', corTexto(`[PRIVADO - ${categoria}]`, hex), tMensagem, corTexto(comando), 'de', corTexto(nomeUsuario), `(${corTexto(`${tResposta}s`)})`)
    }
}

export const primeiraLetraMaiuscula = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export const removerNegritoComando = (comando)=>{
    return comando.replace(/\*/gm, "").trim()
}

export const obterNomeAleatorio =(ext = '')=>{
    return `${Math.floor(Math.random() * 10000)}${ext}`
}

export const delayAleatorio = (minDelayMs, maxDelayMs)=>{
   return new Promise((resolve, reject)=>{
      let delayAleatorioMs = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs
      setTimeout(async ()=>{
          resolve()
      }, delayAleatorioMs)
   })
}

export const consoleErro = (msg, tipo_erro = "API")=>{
  console.error(corTexto(`[${tipo_erro}]`,"#d63e3e"), msg)
}

export const criacaoEnv = async ()=>{
    const env = "# CONFIGURAÇÃO DE API KEYS PARA COMANDOS\n\n"+
    "# ACRCLOUD - Coloque abaixo suas chaves do ACRCloud (Reconhecimento de Músicas)\n"+
    "acr_host=??????\n"+
    "acr_access_key=??????\n"+
    "acr_access_secret=??????\n\n"+
    "# DEEPGRAM - Coloque abaixo sua chave do DEEPGRAM (Transcrição de aúdio para texto)\n"+
    "dg_secret_key=??????\n\n"
    await fs.writeFile(path.resolve('.env'), env , 'utf8')
}

export const verificarEnv = async ()=>{
    try{
      const { registrarBootApi } = await import('./boot.js')
      const acrOk = !(
        process.env.acr_host?.trim() == "??????" ||
        process.env.acr_access_key?.trim() == "??????" ||
        process.env.acr_access_secret?.trim() == "??????"
      )
      const dgOk = !!(process.env.dg_secret_key?.trim() && process.env.dg_secret_key.trim() != "??????")
      const elevenOk = !!(process.env.ELEVENLABS_API_KEY?.trim())
      const rapidOk = !!(process.env.RAPIDAPI_KEY?.trim())
      const geminiOk = !!(process.env.GEMINI_API_KEY?.trim())

      registrarBootApi('ACRCloud', acrOk)
      registrarBootApi('Deepgram', dgOk)
      registrarBootApi('ElevenLabs', elevenOk)
      registrarBootApi('RapidAPI', rapidOk)
      registrarBootApi('Gemini', geminiOk)
    } catch(err){
        err.message = `verificarEnv - ${err.message}`
        throw err
    }
  }

export const verificarNumeroDono = async()=>{
    const { registrarBootDono } = await import('./boot.js')
    const numero_dono = await new UsuarioControle().obterIdDono()
    registrarBootDono(!!numero_dono)
}

export async function criarArquivosNecessarios(){
    try {
        const bot = new BotControle()
        const existePastaDados = fs.pathExistsSync(path.resolve("dados"))
        const existeBotJson = fs.existsSync(bot.obterCaminhoJSON())
        const existeEnv = fs.existsSync(path.resolve('.env'))
        if(!existePastaDados) fs.mkdirSync(path.resolve("dados"), {recursive: true})
        if(existeBotJson && existeEnv) return 
        if(!existeBotJson) await bot.criarArquivo()
        if(!existeEnv) await criacaoEnv()
      } catch(err){
          throw new Error(err)
      }
}


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

/** Extrai o ID usável em @menção (PN ou LID — nunca inclui @lid / @s.whatsapp.net). */
export const mencaoNumero = (jid)=>{
  if(!jid) return ''
  return String(jid).split('@')[0].split(':')[0]
}

/**
 * Remove sobras de JID no texto (@123@lid → @123; "@lid" solto some).
 * WhatsApp marca @123 e deixava "@lid" literal na mensagem.
 */
export const sanitizarTextoMencoes = (texto)=>{
  return String(texto ?? '')
    .replace(/@([^\s@]+)@(?:s\.whatsapp\.net|lid|hosted|g\.us)\b/gi, '@$1')
    .replace(/@(?:s\.whatsapp\.net|lid|hosted)\b/gi, '')
}

/** Verifica se algum JID está na lista (suporta @lid e @s.whatsapp.net). */
/** Chaves para comparar LID / PN / user:device. */
export const chavesJid = (jid) => {
  const s = String(jid || '').trim()
  if (!s) return []
  const user = s.split('@')[0].split(':')[0]
  const digits = user.replace(/\D/g, '')
  const out = [s, user]
  if (digits && digits !== user) out.push(digits)
  return out
}

export const listaContemJid = (lista = [], ...candidatos)=>{
  const set = new Set()
  for (const j of lista || []) {
    for (const k of chavesJid(j)) set.add(k)
  }
  return candidatos.some((j) => j && chavesJid(j).some((k) => set.has(k)))
}

/**
 * Dado metadados do grupo (participants com id/phoneNumber),
 * devolve todos os JIDs da mesma pessoa (LID + PN).
 */
export const aliasesParticipanteMeta = (participants = [], ...candidatos) => {
  const out = new Set()
  const cands = candidatos.flat().filter(Boolean)
  for (const j of cands) out.add(j)
  for (const p of participants || []) {
    const ids = [p?.id, p?.phoneNumber, p?.jid].filter(Boolean)
    if (!ids.length) continue
    if (listaContemJid(ids, ...cands)) {
      for (const id of ids) out.add(id)
    }
  }
  return [...out]
}

/**
 * Remove o bot (e JIDs vazios) da lista de participantes/marcações.
 * Aceita vários JIDs do bot (numero @s.whatsapp.net + lid @lid).
 * Também deduplica a mesma pessoa LID/PN.
 */
export const participantesSemBot = (participantes = [], ...botsBot) => {
  const ban = new Set()
  for (const b of botsBot.flat().filter(Boolean)) {
    for (const k of chavesJid(b)) ban.add(k)
  }
  const porNumero = new Map()
  for (const jid of participantes || []) {
    if (!jid) continue
    if (chavesJid(jid).some((k) => ban.has(k))) continue
    const num = String(jid).split('@')[0].split(':')[0].replace(/\D/g, '') || String(jid)
    const atual = porNumero.get(num)
    // Prefere @s.whatsapp.net quando houver duplicata
    if (!atual || String(jid).endsWith('@s.whatsapp.net')) porNumero.set(num, jid)
  }
  return [...porNumero.values()]
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

export const consoleComando = (isGroup, categoria, comando, hex, timestampMsg, nomeUsuario, nomeChat, detalheMs = '')=>{
    let tMensagem = timestampParaData(timestampMsg)
    let tResposta = obterTempoRespostaSeg(timestampMsg)
    void import('./logger.js')
        .then((m) => m.registrarCmdMs?.(comando, Number(tResposta) * 1000))
        .catch(() => {})
    const extra = detalheMs ? ` ${detalheMs}` : ''
    if(isGroup){
      console.log('\x1b[1;31m~\x1b[1;37m>', corTexto(`[GRUPO - ${categoria}]`, hex), tMensagem, corTexto(comando), 'de', corTexto(nomeUsuario), 'em', corTexto(nomeChat), `(${corTexto(`${tResposta}s`)})${extra}`)
    } else {
      console.log('\x1b[1;31m~\x1b[1;37m>', corTexto(`[PRIVADO - ${categoria}]`, hex), tMensagem, corTexto(comando), 'de', corTexto(nomeUsuario), `(${corTexto(`${tResposta}s`)})${extra}`)
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
      const { registrarBootApi, bootMarcarFase } = await import('./boot.js')
      const set = (k) => !!(process.env[k]?.trim() && process.env[k].trim() !== '??????')
      const acrOk = !(
        process.env.acr_host?.trim() == "??????" ||
        process.env.acr_access_key?.trim() == "??????" ||
        process.env.acr_access_secret?.trim() == "??????"
      ) && set('acr_host') && set('acr_access_key')
      const dgOk = set('dg_secret_key')
      const elevenOk = set('ELEVENLABS_API_KEY')
      const rapidOk = set('RAPIDAPI_KEY')
      const geminiOk = set('GEMINI_API_KEY')
      const orOk = set('OPENROUTER_API_KEY')
      const tavilyOk = set('TAVILY_API_KEY') || /^(1|true|sim|on)$/i.test(process.env.TAVILY_KEYLESS || '')
      const braveOk = set('BRAVE_SEARCH_API_KEY') || set('BRAVE_API_KEY')

      registrarBootApi('Gemini', geminiOk, geminiOk ? 'chat/resumo/visão' : 'GEMINI_API_KEY')
      registrarBootApi('OpenRouter', orOk, orOk ? 'pago+:free' : 'OPENROUTER_API_KEY')
      registrarBootApi('RapidAPI', rapidOk, rapidOk ? 'hub (APIs assinadas)' : 'RAPIDAPI_KEY')
      registrarBootApi('Tavily', tavilyOk, tavilyOk ? 'pesquisa web chat' : 'TAVILY_API_KEY')
      registrarBootApi('Brave', braveOk, braveOk ? 'pesquisa web' : 'BRAVE_SEARCH_API_KEY')
      registrarBootApi('ElevenLabs', elevenOk, elevenOk ? 'TTS/música' : 'Edge TTS sem chave')
      registrarBootApi('Deepgram', dgOk, dgOk ? '!ouvir' : 'dg_secret_key')
      registrarBootApi('ACRCloud', acrOk, acrOk ? '!qualmusica' : 'acr_*')
      try { bootMarcarFase('env') } catch { /* */ }
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
        const { raizProjeto, caminhoDados } = await import('./caminhos.js')
        const pastaDados = caminhoDados()
        const existePastaDados = fs.pathExistsSync(pastaDados)
        const existeBotJson = fs.existsSync(bot.obterCaminhoJSON())
        const existeEnv = fs.existsSync(path.join(raizProjeto, '.env'))
        if(!existePastaDados) fs.mkdirSync(pastaDados, {recursive: true})
        if(existeBotJson && existeEnv) return 
        if(!existeBotJson) await bot.criarArquivo()
        if(!existeEnv) await criacaoEnv()
      } catch(err){
          throw new Error(err)
      }
}


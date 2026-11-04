/**
 * TTS unificado (!resumodogrupo, !voz, narrações):
 * Padrão Edge grátis; ElevenLabs só com preferirEleven (dono).
 */
import { textoParaVozRobusto, OPCOES_TTS_ULTRON } from '../lib/tts-robusto.js'

export { OPCOES_TTS_ULTRON }

/** Texto longo → áudio (resumo / jornal / cancelado / voz / etc). */
export const gerarAudioNarrado = async (texto, { maxPalavras = 750, idioma = 'pt', ...extra } = {}) => {
    const lang = String(idioma || 'pt').toLowerCase()
    const ehPt = /^(pt|pt-br|br)$/.test(lang)
    const base = ehPt ? { ...OPCOES_TTS_ULTRON } : {}
    return textoParaVozRobusto(texto, {
        idioma: lang,
        maxPalavras,
        somenteEdge: true,
        ...base,
        ...extra
    })
}

/** Só Edge neural gratuito (voz natural). */
export const gerarAudioNarradoGratis = async (texto, opts = {}) => {
    return gerarAudioNarrado(texto, { ...opts, somenteEdge: true })
}

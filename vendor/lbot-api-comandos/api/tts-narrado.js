/**
 * TTS unificado (mesma pipeline do !resumodogrupo e demais comandos de voz):
 * ElevenLabs → Edge neural natural → OpenAI.
 */
import { textoParaVozRobusto, OPCOES_TTS_ULTRON } from '../lib/tts-robusto.js'

export { OPCOES_TTS_ULTRON }

/** Texto longo → áudio (resumo / jornal / cancelado / voz / etc). */
export const gerarAudioNarrado = async (texto, { maxPalavras = 750, idioma = 'pt', ...extra } = {}) => {
    const lang = String(idioma || 'pt').toLowerCase()
    const ehPt = /^(pt|pt-br|br)$/.test(lang)
    // Em pt usa voz Ultron; em outros idiomas o tts-robusto escolhe neural nativo
    const base = ehPt ? OPCOES_TTS_ULTRON : {}
    return textoParaVozRobusto(texto, {
        idioma: lang,
        maxPalavras,
        ...base,
        ...extra
    })
}

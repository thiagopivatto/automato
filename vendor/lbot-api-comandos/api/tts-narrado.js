/**
 * TTS unificado (mesma lógica/voz do !resumodogrupo).
 */
import { textoParaVozRobusto, OPCOES_TTS_ULTRON } from '../lib/tts-robusto.js'

export { OPCOES_TTS_ULTRON }

/** Texto longo → áudio (jornal / cancelado / voz / etc). */
export const gerarAudioNarrado = async (texto, { maxPalavras = 750, idioma = 'pt', ...extra } = {}) => {
    return textoParaVozRobusto(texto, {
        idioma,
        maxPalavras,
        ...OPCOES_TTS_ULTRON,
        ...extra
    })
}

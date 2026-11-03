/**
 * Extrai bloco de resumo de vendor/.../api/ia.js → api/resumo-grupo.js
 */
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const iaPath = path.join(raiz, 'vendor/lbot-api-comandos/api/ia.js')
const outPath = path.join(raiz, 'vendor/lbot-api-comandos/api/resumo-grupo.js')

const lines = (await fs.readFile(iaPath, 'utf8')).split(/\n/)
const start = lines.findIndex((l) => l.startsWith('function contarPalavras'))
const end = lines.findIndex((l, i) => i > start && l.includes('Gera texto engraçado sobre membros'))
if (start < 0 || end < 0) {
    console.error('marcadores não encontrados', { start, end })
    process.exit(1)
}

const block = lines.slice(start, end).join('\n')
const header = `/**
 * Resumo falado do grupo (!resumodogrupo) — prompts + roteiro + TTS.
 * Fatia de api/ia.js para manutenção.
 */
import { elevenKey } from '../lib/elevenlabs.js'
import { estimarDuracaoSegundos, palavrasParaDuracao, WPM_TTS } from '../lib/tts-robusto.js'
import { gerarTextoIA } from './ia.js'
import { gerarAudioNarrado } from './tts-narrado.js'

const msgErro = (err) => err?.erro || err?.message || err?.response?.status || String(err || 'erro desconhecido')

`

await fs.writeFile(outPath, header + block + '\n', 'utf8')

const before = lines.slice(0, start).join('\n')
let after = lines.slice(end).join('\n')
// Remove exports antigos de TTS no fim do arquivo
after = after.replace(/\nexport \{ OPCOES_TTS_ULTRON \}[\s\S]*$/m, '\n')
after = after.replace(/\n\/\*\* Texto longo → áudio[\s\S]*$/m, '\n')

const novo =
    before +
    '\n\nexport { gerarResumoGrupoAudio } from \'./resumo-grupo.js\'\n' +
    'export { gerarAudioNarrado, OPCOES_TTS_ULTRON } from \'./tts-narrado.js\'\n\n' +
    after

await fs.writeFile(iaPath, novo.replace(/\n{3,}/g, '\n\n'), 'utf8')
console.log('OK: resumo-grupo.js +', end - start, 'linhas movidas; ia.js=', novo.split(/\n/).length)

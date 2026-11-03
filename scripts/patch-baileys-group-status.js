import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Baileys 7.0.0-rc14 reconhece o tipo externo do status, mas calcula
// mediatype a partir do wrapper em vez do conteúdo. Normaliza como getMessageType.
export function corrigirTipoMidiaStatus(src) {
    const antigo = 'const mediaType = getMediaType(message);'
    const corrigido = 'const mediaType = getMediaType(normalizeMessageContent(message) || message);'
    if (src.includes(corrigido)) return src
    if (src.split(antigo).length !== 2) {
        throw new Error('Baileys: trecho de identificação de mídia inesperado. Revise o patch de status antes de atualizar a dependência.')
    }
    return src.replace(antigo, corrigido)
}

export function aplicarPatchStatus() {
    const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
    const pacote = path.join(raiz, 'node_modules/@whiskeysockets/baileys')
    const versao = JSON.parse(fs.readFileSync(path.join(pacote, 'package.json'), 'utf8')).version
    if (versao !== '7.0.0-rc14') {
        throw new Error(`Patch de status validado para Baileys 7.0.0-rc14; encontrado ${versao}. Revise o patch ao atualizar.`)
    }
    const arquivo = path.join(pacote, 'lib/Socket/messages-send.js')
    const antes = fs.readFileSync(arquivo, 'utf8')
    const depois = corrigirTipoMidiaStatus(antes)
    if (antes !== depois) fs.writeFileSync(arquivo, depois)
    console.log(`Baileys: identificação de mídia em status ${antes === depois ? 'já corrigida' : 'corrigida'}.`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) aplicarPatchStatus()

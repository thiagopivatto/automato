import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Baileys 7.0.0-rc14: mediatype do status a partir do conteúdo normalizado.
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
    try {
        const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
        const pacote = path.join(raiz, 'node_modules/@whiskeysockets/baileys')
        if (!fs.existsSync(path.join(pacote, 'package.json'))) {
            console.warn('Baileys: pacote não encontrado — pulando patch de status.')
            return false
        }
        const versao = JSON.parse(fs.readFileSync(path.join(pacote, 'package.json'), 'utf8')).version
        if (versao !== '7.0.0-rc14') {
            console.warn(`Baileys: patch de status é para 7.0.0-rc14 (encontrado ${versao}) — pulando.`)
            return false
        }
        const arquivo = path.join(pacote, 'lib/Socket/messages-send.js')
        const antes = fs.readFileSync(arquivo, 'utf8')
        const depois = corrigirTipoMidiaStatus(antes)
        if (antes !== depois) fs.writeFileSync(arquivo, depois)
        console.log(`Baileys: identificação de mídia em status ${antes === depois ? 'já corrigida' : 'corrigida'}.`)
        return true
    } catch (err) {
        console.warn('Baileys patch:', err?.message || err)
        return false
    }
}

const isMain =
    process.argv[1] &&
    path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (isMain) {
    try {
        aplicarPatchStatus()
    } catch (err) {
        console.warn('Baileys patch:', err?.message || err)
        process.exitCode = 0
    }
}

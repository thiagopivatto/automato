import { gerarImagemMultiFonte } from './imagens-ia.js'
import {
    gerarImagemPollinations,
    gerarVideoPollinations,
    imagemParaImagemPollinations,
    pollinationsKey
} from './pollinations.js'

/**
 * Orquestra imagem: Pollinations (com key) primeiro → outras fontes.
 */
export async function gerarImagemPreferencial(prompt, opts = {}) {
    const p = String(prompt || '').trim()
    if (!p) throw new Error('Prompt vazio')
    const erros = []

    if (pollinationsKey()) {
        try {
            return await gerarImagemPollinations(p, { model: 'flux', ...opts })
        } catch (err) {
            erros.push(`pollinations:${err.message}`)
            console.log(`imagens Pollinations - ${err.message}`)
        }
    }

    try {
        return await gerarImagemMultiFonte(p, opts)
    } catch (err) {
        erros.push(err.message)
        throw new Error(erros.join(' | '))
    }
}

export {
    gerarVideoPollinations,
    pollinationsKey,
    gerarImagemPollinations,
    imagemParaImagemPollinations
}

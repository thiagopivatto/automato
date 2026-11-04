import { gerarImagemMultiFonte } from './imagens-ia.js'

/**
 * Gera imagem free: Pollinations classic / HF / DeepAI / Horde.
 */
export async function gerarImagemPreferencial(prompt, opts = {}) {
    const p = String(prompt || '').trim()
    if (!p) throw new Error('Prompt vazio')
    return gerarImagemMultiFonte(p, opts)
}

export function pollinationsKey() {
    return ''
}

export async function gerarImagemPollinations() {
    throw new Error('Pollinations desativado')
}

export async function gerarVideoPollinations() {
    throw new Error('Pollinations desativado')
}

export async function imagemParaImagemPollinations() {
    throw new Error('Pollinations desativado')
}

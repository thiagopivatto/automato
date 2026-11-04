/**
 * Personalidade por chat (grupo ou PV) — arquivo individual em dados/personalidades/.
 */
import fs from 'fs-extra'
import path from 'node:path'
import { caminhoDados } from './caminhos.js'

const DIR = () => caminhoDados('personalidades')

function chaveArquivo(idChat) {
    const limpo = String(idChat || '')
        .replace(/[^a-zA-Z0-9._@-]/g, '_')
        .slice(0, 180)
    return path.join(DIR(), `${limpo || 'desconhecido'}.txt`)
}

export async function obterPersonalidadeChat(idChat) {
    try {
        const arq = chaveArquivo(idChat)
        if (!(await fs.pathExists(arq))) return ''
        return String(await fs.readFile(arq, 'utf8')).trim().slice(0, 4000)
    } catch {
        return ''
    }
}

export async function definirPersonalidadeChat(idChat, texto) {
    await fs.ensureDir(DIR())
    const arq = chaveArquivo(idChat)
    const limpo = String(texto || '').trim().slice(0, 4000)
    if (!limpo) {
        if (await fs.pathExists(arq)) await fs.remove(arq)
        return ''
    }
    await fs.writeFile(arq, limpo, 'utf8')
    return limpo
}

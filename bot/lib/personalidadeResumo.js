/**
 * Personalidade só do !resumodogrupo — arquivo em dados/personalidades-resumo/.
 * Separado de !personalidade (chat/automsg).
 */
import fs from 'fs-extra'
import path from 'node:path'
import { caminhoDados } from './caminhos.js'

const DIR = () => caminhoDados('personalidades-resumo')

function chaveArquivo(idChat) {
    const limpo = String(idChat || '')
        .replace(/[^a-zA-Z0-9._@-]/g, '_')
        .slice(0, 180)
    return path.join(DIR(), `${limpo || 'desconhecido'}.txt`)
}

export async function obterPersonalidadeResumo(idChat) {
    try {
        const arq = chaveArquivo(idChat)
        if (await fs.pathExists(arq)) {
            return String(await fs.readFile(arq, 'utf8')).trim().slice(0, 4000)
        }
        // Migração one-shot: NeDB personalidade_resumo legado (sem misturar com chat)
        if (String(idChat || '').includes('@g.us')) {
            try {
                const { GrupoControle } = await import('../controles/GrupoControle.js')
                const legado = String(
                    (await new GrupoControle().obterPersonalidadeResumoLegado(idChat)) || ''
                ).trim()
                if (legado) {
                    await definirPersonalidadeResumo(idChat, legado)
                    try {
                        await new GrupoControle().limparPersonalidadeResumoLegado(idChat)
                    } catch { /* ignore */ }
                    return legado.slice(0, 4000)
                }
            } catch { /* ignore */ }
        }
        return ''
    } catch {
        return ''
    }
}

export async function definirPersonalidadeResumo(idChat, texto) {
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

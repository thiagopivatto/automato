/**
 * Caminhos absolutos. Hot path (dados/sessao/temp) pode ir para SSD via env —
 * não use UNC/NAS no caminho quente.
 *
 * ULTRON_DATA_DIR   — pasta de DBs/arquivos (default: <raiz>/dados)
 * ULTRON_SESSAO_DIR — auth Baileys (default: <raiz>/sessao)
 * ULTRON_TEMP_DIR   — temporários (default: <raiz>/temp)
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs-extra'

/** raiz = pasta que contém app.js / package.json */
export const raizProjeto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

function absOuRelativoARaiz(valor, fallbackRel) {
    const v = String(valor || '').trim()
    if (!v) return path.join(raizProjeto, fallbackRel)
    return path.isAbsolute(v) ? path.normalize(v) : path.resolve(raizProjeto, v)
}

export const dirDados = absOuRelativoARaiz(process.env.ULTRON_DATA_DIR, 'dados')
export const dirSessao = absOuRelativoARaiz(process.env.ULTRON_SESSAO_DIR, 'sessao')
export const dirTemp = absOuRelativoARaiz(process.env.ULTRON_TEMP_DIR, 'temp')

export const caminhoDados = (...partes) => path.join(dirDados, ...partes)
export const caminhoSessao = () => dirSessao
export const caminhoTemp = (...partes) => path.join(dirTemp, ...partes)

/** Garante pastas essenciais no boot. */
export async function garantirPastasRuntime() {
    await fs.ensureDir(dirDados)
    await fs.ensureDir(dirSessao)
    await fs.ensureDir(dirTemp)
    await fs.ensureDir(caminhoDados('personalidades'))
    await fs.ensureDir(caminhoDados('personalidades-resumo'))
    await fs.ensureDir(caminhoDados('memoria-usuarios'))
    await fs.ensureDir(caminhoDados('viewonce'))
}

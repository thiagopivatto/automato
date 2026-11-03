/**
 * Caminhos absolutos da raiz do projeto.
 * Não depende de process.cwd() — no Linux/pm2 o cwd costuma ser /, home, etc.
 * e ./dados abria DB vazio → “comandos não funcionam”.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** raiz = pasta que contém app.js / package.json */
export const raizProjeto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export const caminhoDados = (...partes) => path.join(raizProjeto, 'dados', ...partes)

export const caminhoSessao = () => path.join(raizProjeto, 'sessao')

export const caminhoTemp = (...partes) => path.join(raizProjeto, 'temp', ...partes)

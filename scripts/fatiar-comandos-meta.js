/**
 * Fatia bot/comandos/comandos.js em meta/<categoria>.js (one-shot).
 * Uso: node scripts/fatiar-comandos-meta.js
 */
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(raiz, 'bot/comandos/comandos.js')
const metaDir = path.join(raiz, 'bot/comandos/meta')

const text = await fs.readFile(src, 'utf8')
const start = text.indexOf('const comandos = {')
if (start < 0) throw new Error('const comandos = { não encontrado')

let i = text.indexOf('{', start)
let depth = 0
let end = -1
for (let p = i; p < text.length; p++) {
    const ch = text[p]
    if (ch === '{') depth++
    else if (ch === '}') {
        depth--
        if (depth === 0) {
            end = p
            break
        }
    }
}
const body = text.slice(i + 1, end)

function skipString(src, p) {
    const q = src[p]
    p++
    while (p < src.length) {
        if (src[p] === '\\') {
            p += 2
            continue
        }
        if (src[p] === q) return p + 1
        p++
    }
    return p
}

const cats = []
let p = 0
while (p < body.length) {
    while (p < body.length && /[\s,]/.test(body[p])) p++
    if (p >= body.length) break
    if (body.startsWith('//', p)) {
        const nl = body.indexOf('\n', p)
        p = nl < 0 ? body.length : nl + 1
        continue
    }
    if (body.startsWith('/*', p)) {
        const close = body.indexOf('*/', p + 2)
        p = close < 0 ? body.length : close + 2
        continue
    }
    const m = body.slice(p).match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:/)
    if (!m) {
        console.error('Parse stuck em', JSON.stringify(body.slice(p, p + 60)))
        process.exit(1)
    }
    const name = m[1]
    p += m[0].length
    while (p < body.length && /\s/.test(body[p])) p++
    if (body[p] !== '{') {
        console.error('Esperado { para', name)
        process.exit(1)
    }
    let d = 0
    const s = p
    while (p < body.length) {
        const c = body[p]
        if (c === '`' || c === '"' || c === "'") {
            p = skipString(body, p)
            continue
        }
        if (c === '{') d++
        else if (c === '}') {
            d--
            if (d === 0) {
                p++
                break
            }
        }
        p++
    }
    cats.push({ name, content: body.slice(s, p).trim() })
}

await fs.ensureDir(metaDir)

for (const cat of cats) {
    const file = path.join(metaDir, `${cat.name}.js`)
    const code =
        `/** Metadados da categoria \`${cat.name}\` (gerado/fatiado de comandos.js). */\n` +
        `export function meta${cat.name[0].toUpperCase()}${cat.name.slice(1)}({ prefixo, nome_adm, nome_bot }) {\n` +
        `    return ${cat.content}\n` +
        `}\n`
    await fs.writeFile(file, code, 'utf8')
    console.log('wrote', path.relative(raiz, file), cat.content.length, 'chars')
}

const imports = cats
    .map(
        (c) =>
            `import { meta${c.name[0].toUpperCase()}${c.name.slice(1)} } from './meta/${c.name}.js'`
    )
    .join('\n')

const assemble = cats
    .map((c) => `        ${c.name}: meta${c.name[0].toUpperCase()}${c.name.slice(1)}({ prefixo, nome_adm, nome_bot })`)
    .join(',\n')

const novo =
    `${imports}\n\n` +
    `export function comandosInfo(botInfo) {\n` +
    `    const { prefixo, nome_adm, nome_bot } = botInfo\n` +
    `    return {\n${assemble}\n    }\n` +
    `}\n\n` +
    `export function verificarComandoExiste(botInfo, comando, categoria = null) {\n` +
    `    const { prefixo } = botInfo\n` +
    `    const comandosAtuais = comandosInfo(botInfo)\n` +
    `    const categoriasExistentes = Object.keys(comandosAtuais).filter((key) => key != 'outros')\n` +
    `    let comandos\n` +
    `    if (!categoria) {\n` +
    `        comandos = [\n` +
    `            ...Object.keys(comandosAtuais.utilidades),\n` +
    `            ...Object.keys(comandosAtuais.ia || {}),\n` +
    `            ...Object.keys(comandosAtuais.diversao),\n` +
    `            ...Object.keys(comandosAtuais.info),\n` +
    `            ...Object.keys(comandosAtuais.grupo),\n` +
    `            ...Object.keys(comandosAtuais.admin),\n` +
    `            ...Object.keys(comandosAtuais.figurinhas),\n` +
    `            ...Object.keys(comandosAtuais.downloads)\n` +
    `        ].map((cmd) => prefixo + cmd)\n` +
    `    } else {\n` +
    `        if (!categoriasExistentes.includes(categoria)) return []\n` +
    `        comandos = Object.keys(comandosAtuais[categoria] || {}).map((cmd) => prefixo + cmd)\n` +
    `    }\n` +
    `    return comandos.includes(comando)\n` +
    `}\n\n` +
    `export function obterGuiaComando(categoria, comando, botInfo) {\n` +
    `    const cabecalho = comandosInfo(botInfo).outros.cabecalho_guia\n` +
    `    const { prefixo } = botInfo\n` +
    `    comando = comando.replace(prefixo, '')\n` +
    `    const comandosCategoria = comandosInfo(botInfo)[categoria]\n` +
    `    return cabecalho + (comandosCategoria[comando]?.guia ?? '')\n` +
    `}\n`

await fs.writeFile(src, novo, 'utf8')
console.log('rewrote comandos.js aggregator,', cats.length, 'categorias')

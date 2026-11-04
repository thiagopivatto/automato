/**
 * Sobe o patch de package.json (+ package-lock) e a linha de versão no CHANGELOG.md.
 * Usado pelo hook pre-commit. Pule com SKIP_VERSION_BUMP=1.
 *
 * Uso:
 *   node scripts/bump-version.js           # patch (1.1.0 → 1.1.1)
 *   node scripts/bump-version.js minor     # 1.1.0 → 1.2.0
 *   node scripts/bump-version.js major     # 1.1.0 → 2.0.0
 *   node scripts/bump-version.js set 1.2.3
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function lerJson(rel) {
    return JSON.parse(fs.readFileSync(path.join(raiz, rel), 'utf8'))
}

function escreverJson(rel, obj) {
    fs.writeFileSync(path.join(raiz, rel), `${JSON.stringify(obj, null, 2)}\n`, 'utf8')
}

function parseSemver(v) {
    const m = String(v || '')
        .trim()
        .match(/^(\d+)\.(\d+)\.(\d+)/)
    if (!m) throw new Error(`versão inválida: ${v}`)
    return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) }
}

function formatSemver({ major, minor, patch }) {
    return `${major}.${minor}.${patch}`
}

function bump(tipo, atual) {
    const s = parseSemver(atual)
    if (tipo === 'major') return formatSemver({ major: s.major + 1, minor: 0, patch: 0 })
    if (tipo === 'minor') return formatSemver({ major: s.major, minor: s.minor + 1, patch: 0 })
    return formatSemver({ major: s.major, minor: s.minor, patch: s.patch + 1 })
}

function atualizarChangelog(nova) {
    const arq = path.join(raiz, 'CHANGELOG.md')
    if (!fs.existsSync(arq)) return false
    let txt = fs.readFileSync(arq, 'utf8')
    const linha = `**Versão atual / Current version:** \`${nova}\``
    if (/\*\*Versão atual \/ Current version:\*\* `[^`]+`/.test(txt)) {
        txt = txt.replace(/\*\*Versão atual \/ Current version:\*\* `[^`]+`/, linha)
    } else {
        txt = `# Changelog\n\n${linha}\n\n${txt.replace(/^# Changelog\s*/i, '')}`
    }
    fs.writeFileSync(arq, txt, 'utf8')
    return true
}

function main() {
    if (/^(1|true|sim|on)$/i.test(String(process.env.SKIP_VERSION_BUMP || ''))) {
        console.log('[bump-version] pulado (SKIP_VERSION_BUMP)')
        return
    }

    const args = process.argv.slice(2)
    const pkg = lerJson('package.json')
    const atual = pkg.version
    let nova
    if (args[0] === 'set' && args[1]) {
        nova = formatSemver(parseSemver(args[1]))
    } else {
        const tipo = ['major', 'minor', 'patch'].includes(args[0]) ? args[0] : 'patch'
        nova = bump(tipo, atual)
    }

    if (nova === atual) {
        console.log(`[bump-version] já em ${atual}`)
        return
    }

    pkg.version = nova
    escreverJson('package.json', pkg)

    try {
        const lock = lerJson('package-lock.json')
        lock.version = nova
        if (lock.packages?.['']) lock.packages[''].version = nova
        escreverJson('package-lock.json', lock)
    } catch (err) {
        console.warn(`[bump-version] package-lock: ${err.message}`)
    }

    const cl = atualizarChangelog(nova)
    console.log(`[bump-version] ${atual} → ${nova}${cl ? ' (+ CHANGELOG)' : ''}`)
}

main()

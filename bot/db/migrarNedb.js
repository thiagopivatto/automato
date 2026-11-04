/**
 * Migra arquivos NeDB legados → docs SQLite (one-shot).
 */
import fs from 'fs-extra'
import path from 'path'
import { caminhoDados } from '../lib/caminhos.js'
import { logInfo, logWarn } from '../lib/logger.js'

const MAPA = [
    { file: 'usuarios.db', collection: 'usuarios' },
    { file: 'grupos.db', collection: 'grupos' },
    { file: 'contador.db', collection: 'contador' },
    { file: 'historico_grupo.db', collection: 'historico_grupo' },
    { file: 'marco_resumo_grupo.db', collection: 'marco_resumo' },
    { file: 'mensagens.db', collection: 'mensagens' },
    { file: 'sugestoes.db', collection: 'sugestoes' },
    { file: 'memoria_resumo_grupo.db', collection: 'memoria_resumo' },
    { file: 'viewonce_cache.db', collection: 'viewonce' }
]

function parseNedbLines(text) {
    const docs = []
    for (const line of String(text || '').split(/\r?\n/)) {
        const t = line.trim()
        if (!t || t[0] !== '{') continue
        try {
            const doc = JSON.parse(t)
            if (doc.$$deleted) continue
            docs.push(doc)
        } catch {
            /* ignore bad line */
        }
    }
    return docs
}

export async function migrarNedbSeNecessario(db) {
    const insert = db.prepare(
        'INSERT INTO docs (collection, id, data) VALUES (?, ?, ?) ON CONFLICT(collection, id) DO NOTHING'
    )
    let total = 0
    for (const { file, collection } of MAPA) {
        const p = caminhoDados(file)
        if (!(await fs.pathExists(p))) continue
        const text = await fs.readFile(p, 'utf8')
        const docs = parseNedbLines(text)
        if (!docs.length) continue
        db.exec('BEGIN')
        try {
            for (const doc of docs) {
                const id = String(doc._id || doc.id_usuario || doc.id_grupo || `${collection}-${total}`)
                if (!doc._id) doc._id = id
                // viewonce: drop huge buffers from DB — keep meta only
                if (collection === 'viewonce' && doc.buffer) {
                    const dir = caminhoDados('viewonce')
                    fs.ensureDirSync(dir)
                    const fp = path.join(dir, `${id}.bin`)
                    try {
                        const buf = Buffer.isBuffer(doc.buffer)
                            ? doc.buffer
                            : Buffer.from(doc.buffer.data || doc.buffer)
                        fs.writeFileSync(fp, buf)
                        doc.bufferPath = fp
                        delete doc.buffer
                    } catch {
                        delete doc.buffer
                    }
                }
                insert.run(collection, id, JSON.stringify(doc))
                total++
            }
            db.exec('COMMIT')
        } catch (err) {
            try {
                db.exec('ROLLBACK')
            } catch {
                /* */
            }
            throw err
        }
        logInfo('nedb migrado', { file, collection, qtd: docs.length })
        // rename legado
        try {
            await fs.move(p, `${p}.bak`, { overwrite: true })
        } catch (err) {
            logWarn('não renomeou nedb', { file, err: err?.message })
        }
    }
    if (total) logInfo('migração NeDB concluída', { docs: total })
    return total
}

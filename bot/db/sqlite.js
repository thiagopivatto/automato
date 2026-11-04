/**
 * SQLite WAL — store documento (JSON) compatível com a API async do NeDB usada nos modelos.
 * Usa `node:sqlite` (DatabaseSync) — sem native addon / better-sqlite3.
 */
import { DatabaseSync } from 'node:sqlite'
import fs from 'fs-extra'
import crypto from 'crypto'
import { caminhoDados } from '../lib/caminhos.js'
import { incrMetrica, logErro, logWarn } from '../lib/logger.js'

let db = null

export function getDb() {
    if (!db) throw new Error('DB não iniciado — chame iniciarDb()')
    return db
}

export async function iniciarDb() {
    await fs.ensureDir(caminhoDados())
    const file = caminhoDados('ultron.sqlite')
    db = new DatabaseSync(file)
    db.exec('PRAGMA journal_mode = WAL')
    db.exec('PRAGMA synchronous = NORMAL')
    db.exec('PRAGMA busy_timeout = 5000')
    db.exec(`
        CREATE TABLE IF NOT EXISTS docs (
            collection TEXT NOT NULL,
            id TEXT NOT NULL,
            data TEXT NOT NULL,
            PRIMARY KEY (collection, id)
        );
        CREATE INDEX IF NOT EXISTS idx_docs_collection ON docs(collection);
        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `)

    const migrated = db.prepare('SELECT value FROM meta WHERE key = ?').get('nedb_migrated')
    if (!migrated) {
        try {
            const { migrarNedbSeNecessario } = await import('./migrarNedb.js')
            await migrarNedbSeNecessario(db)
            db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(
                'nedb_migrated',
                new Date().toISOString()
            )
        } catch (err) {
            logWarn('migração NeDB pulada/falhou', { err: err?.message || String(err) })
            incrMetrica('db_err')
        }
    }
    return db
}

function matchQuery(doc, query = {}) {
    if (!query || !Object.keys(query).length) return true
    for (const [k, v] of Object.entries(query)) {
        if (k === '$or') {
            if (!Array.isArray(v) || !v.some((sub) => matchQuery(doc, sub))) return false
            continue
        }
        const dv = doc[k]
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            if ('$exists' in v) {
                const ex = doc[k] !== undefined && doc[k] !== null
                if (v.$exists && !ex) return false
                if (!v.$exists && ex) return false
            }
            if ('$lt' in v && !(dv < v.$lt)) return false
            if ('$lte' in v && !(dv <= v.$lte)) return false
            if ('$gt' in v && !(dv > v.$gt)) return false
            if ('$gte' in v && !(dv >= v.$gte)) return false
            if ('$ne' in v && dv === v.$ne) return false
            if ('$in' in v && !v.$in.includes(dv)) return false
        } else if (dv !== v) {
            return false
        }
    }
    return true
}

function applyUpdate(doc, update) {
    const out = { ...doc }
    if (update.$set) Object.assign(out, flattenSet(update.$set))
    if (update.$unset) {
        for (const k of Object.keys(update.$unset)) unsetPath(out, k)
    }
    if (update.$inc) {
        for (const [k, n] of Object.entries(update.$inc)) {
            out[k] = (Number(out[k]) || 0) + Number(n)
        }
    }
    if (update.$push) {
        for (const [k, val] of Object.entries(update.$push)) {
            if (!Array.isArray(out[k])) out[k] = []
            out[k] = [...out[k], val]
        }
    }
    if (update.$pull) {
        for (const [k, val] of Object.entries(update.$pull)) {
            if (!Array.isArray(out[k])) continue
            out[k] = out[k].filter((x) => x !== val)
        }
    }
    // replace document style (rare)
    if (!update.$set && !update.$unset && !update.$inc && !update.$push && !update.$pull) {
        return { ...update, _id: doc._id }
    }
    return out
}

function flattenSet(obj, prefix = '', acc = {}) {
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k
        if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
            // nested path "bemvindo.status"
            if (k.includes('.')) acc[k] = v
            else setPath(acc, key, v)
        } else if (k.includes('.')) {
            setPath(acc, k, v)
        } else {
            acc[k] = v
        }
    }
    // Re-apply dotted keys onto a clone properly
    const base = { ...obj }
    // Actually $set from NeDB uses "bemvindo.status" as flat key in update object
    return obj
}

function setPath(obj, dotted, value) {
    const parts = dotted.split('.')
    let cur = obj
    for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i]
        if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {}
        cur = cur[p]
    }
    cur[parts[parts.length - 1]] = value
}

function unsetPath(obj, dotted) {
    const parts = dotted.split('.')
    let cur = obj
    for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]]) return
        cur = cur[parts[i]]
    }
    delete cur[parts[parts.length - 1]]
}

function applySetDotted(doc, setObj) {
    const out = structuredClone ? structuredClone(doc) : JSON.parse(JSON.stringify(doc))
    for (const [k, v] of Object.entries(setObj || {})) {
        if (k.includes('.')) setPath(out, k, v)
        else out[k] = v
    }
    return out
}

function applyUpdateFixed(doc, update) {
    let out = structuredClone ? structuredClone(doc) : JSON.parse(JSON.stringify(doc))
    if (update.$set) out = applySetDotted(out, update.$set)
    if (update.$unset) {
        for (const k of Object.keys(update.$unset)) unsetPath(out, k)
    }
    if (update.$inc) {
        for (const [k, n] of Object.entries(update.$inc)) {
            out[k] = (Number(out[k]) || 0) + Number(n)
        }
    }
    if (update.$push) {
        for (const [k, val] of Object.entries(update.$push)) {
            if (!Array.isArray(out[k])) out[k] = []
            if (val && typeof val === 'object' && Array.isArray(val.$each)) {
                out[k] = [...out[k], ...val.$each]
            } else {
                out[k] = [...out[k], val]
            }
        }
    }
    if (update.$pull) {
        for (const [k, val] of Object.entries(update.$pull)) {
            if (!Array.isArray(out[k])) continue
            if (val && typeof val === 'object' && Array.isArray(val.$in)) {
                const ban = new Set(val.$in)
                out[k] = out[k].filter((x) => !ban.has(x))
            } else {
                out[k] = out[k].filter((x) => x !== val)
            }
        }
    }
    if (!update.$set && !update.$unset && !update.$inc && !update.$push && !update.$pull) {
        return { ...update, _id: doc._id }
    }
    return out
}

export function createCollection(collectionName, { idField = null } = {}) {
    const col = collectionName

    const all = () => {
        const rows = getDb().prepare('SELECT id, data FROM docs WHERE collection = ?').all(col)
        return rows.map((r) => {
            try {
                return JSON.parse(r.data)
            } catch {
                return null
            }
        }).filter(Boolean)
    }

    const save = (doc) => {
        const id = String(doc._id || (idField && doc[idField]) || crypto.randomBytes(8).toString('hex'))
        doc._id = doc._id || id
        getDb()
            .prepare(
                'INSERT INTO docs (collection, id, data) VALUES (?, ?, ?) ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data'
            )
            .run(col, doc._id, JSON.stringify(doc))
        return doc
    }

    const removeId = (id) => {
        getDb().prepare('DELETE FROM docs WHERE collection = ? AND id = ?').run(col, id)
    }

    const api = {
        ensureIndex() {
            /* no-op — JSON store */
        },
        async insertAsync(doc) {
            try {
                const d = { ...doc }
                if (!d._id) d._id = (idField && d[idField]) || crypto.randomBytes(8).toString('hex')
                save(d)
                return d
            } catch (err) {
                incrMetrica('db_err')
                logErro('insertAsync', err, { col })
                throw err
            }
        },
        async findOneAsync(query = {}) {
            const docs = all().filter((d) => matchQuery(d, query))
            return docs[0] || null
        },
        findAsync(query = {}) {
            let docs = all().filter((d) => matchQuery(d, query))
            const chain = {
                sort(spec = {}) {
                    const [[field, dir]] = Object.entries(spec)
                    docs.sort((a, b) => {
                        const av = a[field]
                        const bv = b[field]
                        if (av === bv) return 0
                        const cmp = av > bv ? 1 : -1
                        return dir < 0 ? -cmp : cmp
                    })
                    return chain
                },
                limit(n) {
                    docs = docs.slice(0, Math.max(0, Number(n) || 0))
                    return chain
                },
                then(resolve, reject) {
                    return Promise.resolve(docs).then(resolve, reject)
                },
                async execAsync() {
                    return docs
                }
            }
            // allow await collection.findAsync(q)
            chain[Symbol.toStringTag] = 'Promise'
            return chain
        },
        async countAsync(query = {}) {
            return all().filter((d) => matchQuery(d, query)).length
        },
        async updateAsync(query, update, opts = {}) {
            const multi = !!opts.multi
            let n = 0
            for (const doc of all()) {
                if (!matchQuery(doc, query)) continue
                const next = applyUpdateFixed(doc, update)
                save(next)
                n++
                if (!multi) break
            }
            return n
        },
        async removeAsync(query = {}, opts = {}) {
            const multi = !!opts.multi
            let n = 0
            for (const doc of all()) {
                if (!matchQuery(doc, query)) continue
                removeId(doc._id)
                n++
                if (!multi) break
            }
            return n
        },
        /** Compat NeDB compact */
        async compactDatafileAsync() {
            try {
                getDb().exec('PRAGMA wal_checkpoint(TRUNCATE)')
            } catch { /* */ }
        },
        compactDatafile() {
            try {
                getDb().exec('PRAGMA wal_checkpoint(TRUNCATE)')
            } catch { /* */ }
        },
        persistence: {
            compactDatafile() {
                try {
                    getDb().exec('PRAGMA wal_checkpoint(TRUNCATE)')
                } catch { /* */ }
            }
        }
    }

    // Make findAsync awaitable when not chained
    const _findAsync = api.findAsync.bind(api)
    api.findAsync = (query = {}) => {
        const chain = _findAsync(query)
        return chain
    }

    return api
}

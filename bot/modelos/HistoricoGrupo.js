import Datastore from '@seald-io/nedb'

const db = new Datastore({ filename: './dados/historico_grupo.db', autoload: true })
db.ensureIndex({ fieldName: 'id_grupo' })
db.ensureIndex({ fieldName: 'timestamp' })

const marcosResumo = new Datastore({ filename: './dados/marco_resumo_grupo.db', autoload: true })
marcosResumo.ensureIndex({ fieldName: 'id_grupo', unique: true })

const TTL_MS = 7 * 24 * 60 * 60 * 1000
const MAX_TEXTO = 1200

export class HistoricoGrupo {
    constructor() {}

    async registrar({ id_grupo, id_usuario, nome_usuario, texto, tipo = 'texto', timestamp = Date.now() }) {
        const body = String(texto || '').trim()
        if (!id_grupo || !body) return

        await db.insertAsync({
            id_grupo,
            id_usuario: id_usuario || '',
            nome_usuario: String(nome_usuario || 'Alguém').slice(0, 80),
            texto: body.slice(0, MAX_TEXTO),
            tipo,
            timestamp: Number(timestamp) || Date.now()
        })
    }

    async limparAntigas(id_grupo = null) {
        const corte = Date.now() - TTL_MS
        const query = id_grupo ? { id_grupo, timestamp: { $lt: corte } } : { timestamp: { $lt: corte } }
        await db.removeAsync(query, { multi: true })
    }

    async obterUltimas(id_grupo, limite = 300) {
        await this.limparAntigas(id_grupo)
        const docs = await db
            .findAsync({ id_grupo })
            .sort({ timestamp: -1 })
            .limit(Math.max(1, Number(limite) || 300))
        return (docs || []).reverse()
    }

    /** Atualiza texto de uma msg recente (ex.: após transcrever áudio). */
    async atualizarTextoPorChave({ id_grupo, id_usuario, timestamp, texto }) {
        const body = String(texto || '').trim().slice(0, MAX_TEXTO)
        if (!id_grupo || !body || !timestamp) return
        await db.updateAsync(
            { id_grupo, id_usuario: id_usuario || '', timestamp: Number(timestamp) },
            { $set: { texto: body } },
            { multi: false }
        )
    }

    /** Mensagens com timestamp estritamente posterior ao corte (0 = todas ainda no TTL). */
    async obterDesde(id_grupo, timestampExclusivo = 0, limite = 1200) {
        await this.limparAntigas(id_grupo)
        const query = { id_grupo }
        const corte = Number(timestampExclusivo) || 0
        if (corte > 0) query.timestamp = { $gt: corte }
        const docs = await db.findAsync(query).sort({ timestamp: 1 })
        const lista = docs || []
        const max = Math.max(1, Number(limite) || 1200)
        if (lista.length <= max) return lista
        return lista.slice(-max)
    }

    async obterMarcoResumo(id_grupo) {
        const doc = await marcosResumo.findOneAsync({ id_grupo })
        return Number(doc?.timestamp) || 0
    }

    async definirMarcoResumo(id_grupo, timestamp) {
        if (!id_grupo) return
        const ts = Number(timestamp) || Date.now()
        const existente = await marcosResumo.findOneAsync({ id_grupo })
        if (existente) {
            const atual = Number(existente.timestamp) || 0
            if (ts <= atual) return
            await marcosResumo.updateAsync({ id_grupo }, { $set: { timestamp: ts } })
        } else {
            await marcosResumo.insertAsync({ id_grupo, timestamp: ts })
        }
    }

    async obterUltimas48h(id_grupo, { limite = 400 } = {}) {
        await this.limparAntigas(id_grupo)
        const corte = Date.now() - TTL_MS
        const docs = await db
            .findAsync({ id_grupo, timestamp: { $gte: corte } })
            .sort({ timestamp: 1 })
            .limit(limite)
        return docs || []
    }

    async contarUltimas48h(id_grupo) {
        await this.limparAntigas(id_grupo)
        const corte = Date.now() - TTL_MS
        return await db.countAsync({ id_grupo, timestamp: { $gte: corte } })
    }

    async limparTudo() {
        await db.removeAsync({}, { multi: true })
        try { await marcosResumo.removeAsync({}, { multi: true }) } catch { /* ignore */ }
        try {
            if (typeof db.compactDatafile === 'function') await db.compactDatafile()
            else await db.persistence.compactDatafile()
        } catch { /* ignore */ }
    }

    async contarTodas() {
        return await db.countAsync({})
    }
}

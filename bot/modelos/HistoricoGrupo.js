import Datastore from '@seald-io/nedb'

const db = new Datastore({ filename: './dados/historico_grupo.db', autoload: true })
db.ensureIndex({ fieldName: 'id_grupo' })
db.ensureIndex({ fieldName: 'timestamp' })

const TTL_MS = 48 * 60 * 60 * 1000
const MAX_TEXTO = 800

export class HistoricoGrupo {
    constructor() {}

    async registrar({ id_grupo, id_usuario, nome_usuario, texto, tipo = 'texto', timestamp = Date.now() }) {
        const body = String(texto || '').trim()
        if (!id_grupo || !body) return
        if (body.startsWith('!') || body.startsWith('/') || body.startsWith('.')) return

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
}

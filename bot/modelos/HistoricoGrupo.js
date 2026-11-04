import { createCollection } from '../db/sqlite.js'

const db = createCollection('historico_grupo')
const marcosResumo = createCollection('marco_resumo', { idField: 'id_grupo' })

const TTL_MS = 7 * 24 * 60 * 60 * 1000
const MAX_TEXTO = 1200

let ultimaPoda = 0
const INTERVALO_PODA_MS = 60 * 60 * 1000

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
        const query = id_grupo
            ? { id_grupo, timestamp: { $lt: corte } }
            : { timestamp: { $lt: corte } }
        const removidos = await db.removeAsync(query, { multi: true })
        if (removidos > 0) await db.compactDatafileAsync()
        return removidos
    }

    async podaPeriodica() {
        const agora = Date.now()
        if (agora - ultimaPoda < INTERVALO_PODA_MS) return
        ultimaPoda = agora
        try {
            await this.limparAntigas(null)
        } catch (err) {
            console.log(`[historico] poda - ${err?.message || err}`)
        }
    }

    async obterUltimas(id_grupo, limite = 300) {
        void this.podaPeriodica()
        const docs = await db
            .findAsync({ id_grupo })
            .sort({ timestamp: -1 })
            .limit(Math.max(1, Number(limite) || 300))
        return (docs || []).reverse()
    }

    async atualizarTextoPorChave({ id_grupo, id_usuario, timestamp, texto }) {
        const body = String(texto || '').trim().slice(0, MAX_TEXTO)
        if (!id_grupo || !body || !timestamp) return
        await db.updateAsync(
            { id_grupo, id_usuario: id_usuario || '', timestamp: Number(timestamp) },
            { $set: { texto: body } },
            { multi: false }
        )
    }

    async obterDesde(id_grupo, timestampExclusivo = 0, limite = 1200) {
        void this.podaPeriodica()
        const corte = Number(timestampExclusivo) || 0
        const query = corte > 0 ? { id_grupo, timestamp: { $gt: corte } } : { id_grupo }
        const max = Math.max(1, Number(limite) || 1200)
        const docs = await db.findAsync(query).sort({ timestamp: -1 }).limit(max)
        return (docs || []).reverse()
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
        void this.podaPeriodica()
        const corte = Date.now() - TTL_MS
        return (
            (await db
                .findAsync({ id_grupo, timestamp: { $gte: corte } })
                .sort({ timestamp: 1 })
                .limit(limite)) || []
        )
    }

    async contarUltimas48h(id_grupo) {
        void this.podaPeriodica()
        const corte = Date.now() - TTL_MS
        return await db.countAsync({ id_grupo, timestamp: { $gte: corte } })
    }

    async limparTudo() {
        await db.removeAsync({}, { multi: true })
        try {
            await marcosResumo.removeAsync({}, { multi: true })
        } catch { /* ignore */ }
        await db.compactDatafileAsync()
    }

    async contarTodas() {
        return await db.countAsync({})
    }
}

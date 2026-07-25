import Datastore from '@seald-io/nedb'

const db = new Datastore({ filename: './dados/sugestoes.db', autoload: true })
db.ensureIndex({ fieldName: 'timestamp' })
db.ensureIndex({ fieldName: 'status' })

export class Sugestao {
    constructor() {}

    async adicionar({ id_usuario, nome_usuario, texto, id_chat = '' }) {
        const body = String(texto || '').trim()
        if (!body) throw new Error('texto vazio')
        const doc = {
            id_usuario: id_usuario || '',
            nome_usuario: String(nome_usuario || 'Alguém').slice(0, 80),
            texto: body.slice(0, 1500),
            id_chat: id_chat || '',
            status: 'aberta',
            timestamp: Date.now()
        }
        return await db.insertAsync(doc)
    }

    async listar({ limite = 30, status = null } = {}) {
        const query = status ? { status } : {}
        return await db
            .findAsync(query)
            .sort({ timestamp: -1 })
            .limit(Math.max(1, Number(limite) || 30))
    }

    async contarAbertas() {
        return await db.countAsync({ status: 'aberta' })
    }

    async marcarLida(id) {
        await db.updateAsync({ _id: id }, { $set: { status: 'lida' } })
    }

    async limparLidas() {
        return await db.removeAsync({ status: 'lida' }, { multi: true })
    }
}

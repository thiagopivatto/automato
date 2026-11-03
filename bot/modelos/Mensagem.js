import Datastore from '@seald-io/nedb'

const db = new Datastore({ filename: './dados/mensagens.db', autoload: true })
db.ensureIndex({ fieldName: 'chatId' })
db.ensureIndex({ fieldName: 'mensagemId' })
db.ensureIndex({ fieldName: 'criado_em' })

const TTL_MS = 48 * 60 * 60 * 1000
const MAX_DOCS = 8000

export class Mensagem {
    constructor() {}

    async armazenarMensagem(dadosMensagem) {
        const chatId = dadosMensagem?.chatId
        const mensagemId = dadosMensagem?.mensagemId
        if (!chatId || !mensagemId || !dadosMensagem?.mensagem) return

        const existente = await db.findOneAsync({ chatId, mensagemId })
        if (existente) {
            await db.updateAsync(
                { _id: existente._id },
                {
                    $set: {
                        mensagem: dadosMensagem.mensagem,
                        criado_em: Date.now()
                    }
                }
            )
            return
        }

        await db.insertAsync({
            chatId,
            mensagemId,
            mensagem: dadosMensagem.mensagem,
            criado_em: Date.now()
        })
    }

    async obterMensagem(chatId, mensagemId) {
        return await db.findOneAsync({ chatId, mensagemId })
    }

    async limparMensagens() {
        await db.removeAsync({}, { multi: true })
    }

    /** Remove msgs velhas / excedentes sem apagar o cache inteiro (necessário p/ getMessage). */
    async podarAntigas({ ttlMs = TTL_MS, maxDocs = MAX_DOCS } = {}) {
        const corte = Date.now() - (Number(ttlMs) || TTL_MS)
        await db.removeAsync(
            {
                $or: [
                    { criado_em: { $lt: corte } },
                    { criado_em: { $exists: false } }
                ]
            },
            { multi: true }
        )

        const total = await db.countAsync({})
        const limite = Math.max(1000, Number(maxDocs) || MAX_DOCS)
        if (total <= limite) return { removidasAntigas: true, total }

        const sobra = total - limite
        const antigas = await db.findAsync({}).sort({ criado_em: 1 }).limit(sobra)
        for (const doc of antigas || []) {
            try { await db.removeAsync({ _id: doc._id }, {}) } catch { /* ignore */ }
        }
        return { removidasAntigas: true, total: await db.countAsync({}) }
    }
}

import Datastore from '@seald-io/nedb'

const db = new Datastore({ filename: './dados/memoria_resumo_grupo.db', autoload: true })
db.ensureIndex({ fieldName: 'id_grupo' })
db.ensureIndex({ fieldName: 'criado_em' })

const MAX_POR_GRUPO = 12
const MAX_ITEM = 180

function limparLista(lista, max = 12) {
    return (Array.isArray(lista) ? lista : [])
        .map((x) => String(x || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .map((x) => x.slice(0, MAX_ITEM))
        .slice(0, max)
}

/**
 * Memória estruturada dos !resumodogrupo — anti-repetição e contexto.
 */
export class MemoriaResumoGrupo {
    constructor() {}

    async registrar({
        id_grupo,
        periodo_inicio = 0,
        periodo_fim = Date.now(),
        assuntos = [],
        acontecimentos = [],
        participantes = [],
        piadas = [],
        provocacoes = [],
        observacoes = [],
        abertura_estilo = '',
        encerramento_estilo = ''
    }) {
        if (!id_grupo) return null
        const doc = {
            id_grupo,
            periodo_inicio: Number(periodo_inicio) || 0,
            periodo_fim: Number(periodo_fim) || Date.now(),
            assuntos: limparLista(assuntos, 10),
            acontecimentos: limparLista(acontecimentos, 12),
            participantes: limparLista(participantes, 16),
            piadas: limparLista(piadas, 10),
            provocacoes: limparLista(provocacoes, 12),
            observacoes: limparLista(observacoes, 8),
            abertura_estilo: String(abertura_estilo || '').slice(0, 120),
            encerramento_estilo: String(encerramento_estilo || '').slice(0, 120),
            criado_em: Date.now()
        }
        await db.insertAsync(doc)
        await this.podarAntigos(id_grupo)
        return doc
    }

    async obterRecentes(id_grupo, limite = 5) {
        if (!id_grupo) return []
        const docs = await db
            .findAsync({ id_grupo })
            .sort({ criado_em: -1 })
            .limit(Math.max(1, Number(limite) || 5))
        return docs || []
    }

    /** Texto compacto para o prompt da IA (anti-repetição). */
    async obterContextoPrompt(id_grupo, limite = 4) {
        const docs = await this.obterRecentes(id_grupo, limite)
        if (!docs.length) return ''
        return docs
            .map((d, i) => {
                const quando = new Date(d.criado_em).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Sao_Paulo'
                })
                const partes = [
                    `#${i + 1} (${quando})`,
                    d.assuntos?.length ? `assuntos: ${d.assuntos.join('; ')}` : '',
                    d.acontecimentos?.length ? `acontecimentos: ${d.acontecimentos.join('; ')}` : '',
                    d.provocacoes?.length ? `provocações já usadas: ${d.provocacoes.join('; ')}` : '',
                    d.piadas?.length ? `piadas/referências: ${d.piadas.join('; ')}` : '',
                    d.observacoes?.length ? `conclusões: ${d.observacoes.join('; ')}` : '',
                    d.abertura_estilo ? `abertura anterior: ${d.abertura_estilo}` : '',
                    d.encerramento_estilo ? `encerramento anterior: ${d.encerramento_estilo}` : ''
                ].filter(Boolean)
                return partes.join('\n')
            })
            .join('\n\n')
    }

    async podarAntigos(id_grupo) {
        const docs = await db.findAsync({ id_grupo }).sort({ criado_em: -1 })
        if ((docs || []).length <= MAX_POR_GRUPO) return
        const remover = docs.slice(MAX_POR_GRUPO)
        for (const d of remover) {
            try { await db.removeAsync({ _id: d._id }, {}) } catch { /* ignore */ }
        }
    }

    async limparGrupo(id_grupo) {
        if (!id_grupo) return
        await db.removeAsync({ id_grupo }, { multi: true })
    }

    async limparTudo() {
        await db.removeAsync({}, { multi: true })
        try {
            if (typeof db.compactDatafile === 'function') await db.compactDatafile()
            else await db.persistence.compactDatafile()
        } catch { /* ignore */ }
    }

    async contarTodas() {
        return await db.countAsync({})
    }
}

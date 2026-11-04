/**
 * Orquestra !resumodogrupo: janela de histórico + memória + adapter TTS/LLM (vendor).
 * Handler só parseia/envia; persistência fica nos controles.
 */
import api from '../lib/lbotApi.js'
import {
    historicoGrupo,
    obterJanelaResumoGrupo,
    registrarMemoriaResumo
} from '../controles/HistoricoGrupoControle.js'

export async function carregarJanelaResumo(idGrupo, prefixo) {
    const limiteSuperior = Date.now()
    const {
        msgs,
        teveResumoAnterior,
        memoriaTexto,
        periodoInicio,
        periodoFim,
        marcoNovo
    } = await obterJanelaResumoGrupo(idGrupo, prefixo, limiteSuperior)

    if (!msgs?.length) {
        const avisoVazio = teveResumoAnterior
            ? `Desde o último *${prefixo}resumodogrupo* não entrou mensagem nova. Deixa o grupo falar e chama de novo.`
            : 'Ainda não há mensagens guardadas deste grupo. Deixe o bot online enquanto o pessoal conversa e tente de novo.'
        return { vazio: true, avisoVazio }
    }

    return {
        vazio: false,
        msgs,
        teveResumoAnterior,
        memoriaTexto,
        periodoInicio,
        periodoFim,
        limiteSuperior: marcoNovo || limiteSuperior
    }
}

export async function gerarResumoDaJanela(janela, nomeGrupo, personalidade = '', { preferirEleven = false } = {}) {
    const gerado = await api.IA.gerarResumoGrupoAudio({
        mensagens: janela.msgs,
        nomeGrupo: nomeGrupo || 'o grupo',
        teveResumoAnterior: janela.teveResumoAnterior,
        memoriaTexto: janela.memoriaTexto,
        personalidade,
        preferirEleven
    })
    return {
        gerado,
        limiteSuperior: janela.limiteSuperior,
        periodoInicio: janela.periodoInicio,
        periodoFim: janela.periodoFim
    }
}

export async function persistirAposResumo(idGrupo, limiteSuperior, gerado, periodo = {}) {
    await historicoGrupo.definirMarcoResumo(idGrupo, limiteSuperior)
    if (gerado?.memoria) {
        await registrarMemoriaResumo(idGrupo, {
            ...gerado.memoria,
            periodo_inicio: periodo.periodoInicio || null,
            periodo_fim: periodo.periodoFim || limiteSuperior
        })
    }
}

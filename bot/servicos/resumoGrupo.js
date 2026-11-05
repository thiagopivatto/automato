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
    const base = {
        limiteSuperior: janela.limiteSuperior,
        periodoInicio: janela.periodoInicio,
        periodoFim: janela.periodoFim
    }
    try {
        const gerado = await api.IA.gerarResumoGrupoAudio({
            mensagens: janela.msgs,
            nomeGrupo: nomeGrupo || 'o grupo',
            teveResumoAnterior: janela.teveResumoAnterior,
            memoriaTexto: janela.memoriaTexto,
            personalidade,
            preferirEleven
        })
        if (gerado?.roteiro || gerado?.resultado) return { gerado, ...base }
    } catch (err) {
        console.log(`resumo grupo áudio/IA - ${err?.erro || err?.message || err}`)
    }
    try {
        const { montarRoteiroLocalFallback } = await import('../../vendor/lbot-api-comandos/api/resumo-grupo.js')
        const roteiro = montarRoteiroLocalFallback(janela.msgs || [], nomeGrupo || 'o grupo', {}, '')
        if (roteiro) {
            return {
                gerado: { resultado: null, roteiro, entrega: 'texto', roteiroLocal: true },
                ...base
            }
        }
    } catch { /* segue */ }
    return {
        gerado: {
            resultado: null,
            roteiro: `Vi ${janela.msgs?.length || 0} mensagens em ${nomeGrupo || 'o grupo'} e não consegui narrar. O histórico está salvo — chama de novo que eu monto o comentário.`,
            entrega: 'texto',
            roteiroLocal: true
        },
        ...base
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

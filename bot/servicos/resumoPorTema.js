/**
 * Orquestra !resumoportema: últimas ~1000 msgs (áudio já no histórico quando transcrito).
 */
import api from '../lib/lbotApi.js'
import { obterJanelaResumoPorTema } from '../controles/HistoricoGrupoControle.js'

export async function carregarJanelaResumoPorTema(idGrupo, limite = 1000) {
    const janela = await obterJanelaResumoPorTema(idGrupo, limite)
    if (!janela.msgs?.length) {
        return {
            vazio: true,
            avisoVazio:
                'Ainda não há mensagens guardadas deste grupo. Deixe o bot online enquanto o pessoal conversa (incluindo áudios) e tente de novo.'
        }
    }
    return { vazio: false, ...janela }
}

export async function gerarResumoPorTemaDaJanela(janela, nomeGrupo) {
    return api.IA.gerarResumoPorTema({
        mensagens: janela.msgs,
        nomeGrupo: nomeGrupo || 'o grupo'
    })
}

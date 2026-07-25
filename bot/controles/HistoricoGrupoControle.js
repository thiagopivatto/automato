import { HistoricoGrupo } from '../modelos/HistoricoGrupo.js'

const historico = new HistoricoGrupo()

/** Registra texto de mensagens de grupo para resumo (48h). */
export async function registrarHistoricoGrupo(mensagemBaileys) {
    try {
        if (!mensagemBaileys?.mensagem_grupo) return
        const {
            id_grupo,
            remetente,
            nome_usuario,
            tipo,
            corpo,
            legenda,
            texto_recebido,
            comando
        } = {
            id_grupo: mensagemBaileys.grupo?.id_grupo || mensagemBaileys.id_chat,
            remetente: mensagemBaileys.remetente,
            nome_usuario: mensagemBaileys.nome_usuario,
            tipo: mensagemBaileys.tipo,
            corpo: mensagemBaileys.corpo,
            legenda: mensagemBaileys.legenda,
            texto_recebido: mensagemBaileys.texto_recebido,
            comando: mensagemBaileys.comando
        }

        // Não loga comandos do bot
        const cmd = String(comando || '').trim()
        const corpoTxt = String(corpo || legenda || texto_recebido || '').trim()
        if (!corpoTxt) return
        if (/^[!./#]/.test(corpoTxt)) return
        if (cmd.length > 1 && corpoTxt.toLowerCase().startsWith(cmd.toLowerCase())) return

        await historico.registrar({
            id_grupo,
            id_usuario: remetente,
            nome_usuario,
            texto: corpoTxt,
            tipo,
            timestamp: Date.now()
        })
    } catch (err) {
        console.log(`HistoricoGrupo - ${err.message}`)
    }
}

export { historico as historicoGrupo }

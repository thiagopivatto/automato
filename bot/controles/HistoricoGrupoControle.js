import { HistoricoGrupo } from '../modelos/HistoricoGrupo.js'
import { tiposMensagem } from '../baileys/mensagem.js'

const historico = new HistoricoGrupo()

function placeholderMidia(tipo) {
    switch (tipo) {
        case tiposMensagem.imagem:
            return '[enviou uma imagem]'
        case tiposMensagem.video:
            return '[enviou um vídeo]'
        case tiposMensagem.sticker:
            return '[enviou um sticker]'
        case tiposMensagem.audio:
            return '[enviou um áudio]'
        case tiposMensagem.documento:
            return '[enviou um documento]'
        default:
            return ''
    }
}

/**
 * Registra TODAS as mensagens de grupo (incluindo comandos e mídias)
 * para !resumodogrupo / jornal / automsg.
 */
export async function registrarHistoricoGrupo(mensagemBaileys) {
    try {
        if (!mensagemBaileys?.mensagem_grupo) return
        // Não grava mensagens do próprio bot (evita loop no resumo)
        if (mensagemBaileys.mensagem_bot || mensagemBaileys.fromMe) return

        const id_grupo = mensagemBaileys.grupo?.id_grupo || mensagemBaileys.id_chat
        const remetente = mensagemBaileys.remetente
        const nome_usuario = mensagemBaileys.nome_usuario
        const tipo = mensagemBaileys.tipo

        // Inclui legendas de mídia e texto completo (comandos também entram no resumo)
        let corpoTxt = String(
            mensagemBaileys.corpo ||
                mensagemBaileys.legenda ||
                (mensagemBaileys.comando
                    ? `${mensagemBaileys.comando} ${mensagemBaileys.texto_recebido || ''}`.trim()
                    : '') ||
                mensagemBaileys.texto_recebido ||
                ''
        ).trim()

        if (!corpoTxt) {
            corpoTxt = placeholderMidia(tipo)
        }
        if (!corpoTxt || !id_grupo) return

        await historico.registrar({
            id_grupo,
            id_usuario: remetente,
            nome_usuario,
            texto: corpoTxt,
            tipo: tipo || 'texto',
            timestamp: Date.now()
        })

        // Atualiza última atividade humana (para automsg)
        try {
            const { GrupoControle } = await import('./GrupoControle.js')
            await new GrupoControle().atualizarUltimaMsgHumana(id_grupo)
        } catch { /* ignore */ }
    } catch (err) {
        console.log(`HistoricoGrupo - ${err.message}`)
    }
}

export { historico as historicoGrupo }

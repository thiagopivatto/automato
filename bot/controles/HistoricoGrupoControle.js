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

/** Mensagem cujo primeiro token é o comando de resumo (não uma citação no meio da frase). */
export function textoEhComandoResumo(texto, prefixo = '!') {
    const bruto = String(texto || '').trim().toLowerCase()
    if (!bruto) return false
    const cmd = `${String(prefixo || '!').toLowerCase()}resumodogrupo`
    const primeira = bruto.split(/\s+/)[0]
    return primeira === cmd
}

/**
 * Esta janela para no envio deste !resumodogrupo.
 * A próxima começa estritamente depois desse envio.
 */
export function filtrarJanelaResumo(brutas, prefixo, limiteSuperior = Date.now()) {
    const limite = Number(limiteSuperior) || Date.now()
    let tsComandoAtual = 0
    const candidatas = []
    for (const m of brutas || []) {
        if (!m?.texto) continue
        const ts = Number(m.timestamp) || 0
        if (ts > limite) continue
        if (textoEhComandoResumo(m.texto, prefixo)) {
            if (ts >= tsComandoAtual) tsComandoAtual = ts
            continue
        }
        candidatas.push(m)
    }
    const msgs = tsComandoAtual
        ? candidatas.filter((m) => Number(m.timestamp) <= tsComandoAtual)
        : candidatas
    return { msgs, marcoNovo: tsComandoAtual || limite }
}

/**
 * Janela do !resumodogrupo: tudo depois do último resumo bem-sucedido
 * e antes do envio deste comando. O próprio comando não entra.
 */
export async function obterJanelaResumoGrupo(id_grupo, prefixo, limiteSuperior = Date.now()) {
    const marco = await historico.obterMarcoResumo(id_grupo)
    const brutas = await historico.obterDesde(id_grupo, marco, 1200)
    const { msgs, marcoNovo } = filtrarJanelaResumo(brutas, prefixo, limiteSuperior)
    return { msgs, marco, teveResumoAnterior: marco > 0, marcoNovo }
}

export { historico as historicoGrupo }

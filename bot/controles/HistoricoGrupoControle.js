import { HistoricoGrupo } from '../modelos/HistoricoGrupo.js'
import { MemoriaResumoGrupo } from '../modelos/MemoriaResumoGrupo.js'
import { tiposMensagem } from '../baileys/mensagem.js'

const historico = new HistoricoGrupo()
const memoriaResumo = new MemoriaResumoGrupo()

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

/** Transcreve áudio em background e atualiza o histórico (não bloqueia o fluxo). */
async function transcreverAudioEmBackground({ id_grupo, id_usuario, timestamp, mensagemWa }) {
    try {
        const { downloadMediaMessage } = await import('@whiskeysockets/baileys')
        const api = (await import('@victorsouzaleal/lbot-api-comandos')).default
        const buffer = await downloadMediaMessage(mensagemWa, 'buffer')
        if (!buffer?.length) return
        const { resultado } = await api.Audios.obterTranscricaoAudio(buffer, {
            deepgram_secret_key: process.env.dg_secret_key?.trim()
        })
        const transcript = String(
            resultado?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
        ).trim()
        if (!transcript) return
        await historico.atualizarTextoPorChave({
            id_grupo,
            id_usuario,
            timestamp,
            texto: `[áudio] ${transcript}`
        })
    } catch (err) {
        console.log(`HistoricoGrupo audio - ${err?.message || err}`)
    }
}

/**
 * Registra TODAS as mensagens de grupo (incluindo comandos e mídias)
 * para !resumodogrupo / !resumoportema / jornal / automsg.
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
        const timestamp = Date.now()

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
            timestamp
        })

        // Áudio: ouve em background e troca o placeholder pela transcrição
        if (tipo === tiposMensagem.audio && mensagemBaileys.mensagem) {
            setImmediate(() => {
                transcreverAudioEmBackground({
                    id_grupo,
                    id_usuario: remetente,
                    timestamp,
                    mensagemWa: mensagemBaileys.mensagem
                })
            })
        }

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
 * Janela do !resumodogrupo: tudo depois do último resumo bem-sucedido
 * e até o instante em que este pedido começou. O próprio comando não entra.
 */
export async function obterJanelaResumoGrupo(id_grupo, prefixo, limiteSuperior = Date.now()) {
    const marco = await historico.obterMarcoResumo(id_grupo)
    const brutas = await historico.obterDesde(id_grupo, marco, 1200)
    const limite = Number(limiteSuperior) || Date.now()
    const msgs = brutas.filter((m) => {
        if (!m?.texto) return false
        if (Number(m.timestamp) > limite) return false
        if (textoEhComandoResumo(m.texto, prefixo)) return false
        return true
    })
    const memoriaTexto = await memoriaResumo.obterContextoPrompt(id_grupo, 4)
    return {
        msgs,
        marco,
        teveResumoAnterior: marco > 0,
        memoriaTexto,
        periodoInicio: msgs[0]?.timestamp || marco || 0,
        periodoFim: limite
    }
}

/** Últimas N mensagens do grupo para !resumoportema (inclui áudios já transcritos). */
export async function obterJanelaResumoPorTema(id_grupo, limite = 1000) {
    const msgs = await historico.obterUltimas(id_grupo, Math.min(Math.max(Number(limite) || 1000, 50), 1200))
    return {
        msgs: (msgs || []).filter((m) => m?.texto),
        periodoInicio: msgs?.[0]?.timestamp || 0,
        periodoFim: msgs?.length ? msgs[msgs.length - 1].timestamp : Date.now()
    }
}

export async function registrarMemoriaResumo(id_grupo, dados) {
    return memoriaResumo.registrar({ id_grupo, ...dados })
}

export { historico as historicoGrupo, memoriaResumo }

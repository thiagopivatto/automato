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

/** Descreve imagem em background e atualiza o histórico. */
async function descreverImagemEmBackground({ id_grupo, id_usuario, timestamp, mensagemWa, legenda }) {
    try {
        const { downloadMediaMessage } = await import('@whiskeysockets/baileys')
        const api = (await import('../lib/lbotApi.js')).default
        const buffer = await downloadMediaMessage(mensagemWa, 'buffer')
        if (!buffer?.length) return
        const pergunta = legenda
            ? `Descreva a imagem em 1-2 frases (pt-BR). Legenda do usuário: ${legenda.slice(0, 200)}`
            : 'Descreva a imagem em 1-2 frases objetivas (pt-BR).'
        const { resultado } = await api.IA.analisarImagemIA(buffer, pergunta)
        const desc = String(resultado || '').trim().slice(0, 400)
        if (!desc) return
        const texto = legenda && legenda !== '[enviou uma imagem]'
            ? `[imagem] ${legenda} — ${desc}`
            : `[imagem] ${desc}`
        await historico.atualizarTextoPorChave({
            id_grupo,
            id_usuario,
            timestamp,
            texto
        })
    } catch (err) {
        console.log(`HistoricoGrupo imagem - ${err?.message || err}`)
    }
}

/** Transcreve áudio em background e atualiza o histórico (não bloqueia o fluxo). */
async function transcreverAudioEmBackground({ id_grupo, id_usuario, timestamp, mensagemWa }) {
    try {
        const { downloadMediaMessage } = await import('@whiskeysockets/baileys')
        const api = (await import('../lib/lbotApi.js')).default
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

        // Visão/STT automático OFF por padrão (custo Gemini/Deepgram).
        // Ative com HISTORICO_AUTO_VISAO=1 / HISTORICO_AUTO_STT=1 no .env
        const autoVisao = /^(1|true|sim|on)$/i.test(String(process.env.HISTORICO_AUTO_VISAO || ''))
        const autoStt = /^(1|true|sim|on)$/i.test(String(process.env.HISTORICO_AUTO_STT || ''))

        if (autoStt && tipo === tiposMensagem.audio && mensagemBaileys.mensagem) {
            setImmediate(() => {
                transcreverAudioEmBackground({
                    id_grupo,
                    id_usuario: remetente,
                    timestamp,
                    mensagemWa: mensagemBaileys.mensagem
                })
            })
        }

        if (autoVisao && tipo === tiposMensagem.imagem && mensagemBaileys.mensagem) {
            const legenda = String(mensagemBaileys.legenda || corpoTxt || '').trim()
            setImmediate(() => {
                descreverImagemEmBackground({
                    id_grupo,
                    id_usuario: remetente,
                    timestamp,
                    mensagemWa: mensagemBaileys.mensagem,
                    legenda
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
    const memoriaTexto = await memoriaResumo.obterContextoPrompt(id_grupo, 4)
    return {
        msgs,
        marco,
        teveResumoAnterior: marco > 0,
        marcoNovo,
        memoriaTexto,
        periodoInicio: msgs[0]?.timestamp || marco || 0,
        periodoFim: marcoNovo || limiteSuperior
    }
}

/** Últimas N mensagens do grupo para !resumoportema (inclui áudios já transcritos). */
export async function obterJanelaResumoPorTema(id_grupo, limite = 1000) {
    const msgs = await historico.obterUltimas(id_grupo, Math.min(Math.max(Number(limite) || 1000, 50), 1200))
    const lista = (msgs || []).filter((m) => m?.texto)
    return {
        msgs: lista,
        periodoInicio: lista[0]?.timestamp || 0,
        periodoFim: lista.length ? lista[lista.length - 1].timestamp : Date.now()
    }
}

export async function registrarMemoriaResumo(id_grupo, dados) {
    return memoriaResumo.registrar({ id_grupo, ...dados })
}

export { historico as historicoGrupo, memoriaResumo }

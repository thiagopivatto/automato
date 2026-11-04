/**
 * Dump global + lista de grupos do painel do dono (!painelbot / !infobot).
 */
import { GrupoControle } from '../controles/GrupoControle.js'
import { timestampParaData, versaoAtual, mencaoNumero } from './util.js'
import {
    montarDumpGrupo,
    fatiarPainel,
    resumoFlagsGrupo,
    idGrupoCurto,
    aplicarTogglePainel
} from './painelGrupo.js'

export { fatiarPainel, montarDumpGrupo, aplicarTogglePainel }

const FLAG_ON = '✅'
const FLAG_OFF = '❌'
const onOff = (v) => (v ? FLAG_ON : FLAG_OFF)

export async function montarDumpGlobal(botInfo, { qtdBloqueados = 0 } = {}) {
    const prefixo = botInfo.prefixo || '!'
    const info = botInfo
    const version = versaoAtual()
    const iniciado = timestampParaData(info.iniciado)
    const expiracaoLimite = info.limite_diario?.expiracao
        ? timestampParaData(info.limite_diario.expiracao * 1000)
        : '?'

    const cmdsBloq = (info.bloqueio_cmds || []).map((x) => `${prefixo}${x}`)
    const estado = info.estado || info.status || 'online'

    let ops = ''
    try {
        const { obterMetricas } = await import('./logger.js')
        const { profundidadeFila } = await import('./filaComandos.js')
        const m = obterMetricas()
        const f = profundidadeFila()
        let erros = ''
        try {
            const { obterErrosRecentes } = await import('./logger.js')
            const lista = obterErrosRecentes(5)
            if (lista.length) {
                erros =
                    `\n*Erros recentes*\n` +
                    lista
                        .map((e) => {
                            const t = new Date(e.ts).toLocaleTimeString('pt-BR')
                            return `• ${t} ${String(e.msg).slice(0, 80)}`
                        })
                        .join('\n') +
                    `\n`
            }
        } catch { /* */ }
        ops =
            `\n*Ops*\n` +
            `• cmds/min ${m.cmds_por_min} · ok ${m.cmds_ok} · err ${m.cmds_erro} · ia_err ${m.ia_erro}\n` +
            `• ia_ms médio ${m.ia_ms_medio} · web ${m.web_ms_medio} · cascade ${m.cascade_ms_medio} · vision ${m.vision_ms_medio}\n` +
            `• recv_ok ${m.recv_ok} · recv_drop ${m.recv_drop}\n` +
            `• fila g=${f.global} chats=${f.chats} · timeouts ${m.fila_timeout} · reconnects ${m.reconnects}\n` +
            `• msgs ${m.msgs} · ignoradas ${m.msgs_ignoradas} · db_err ${m.db_err}\n` +
            (m.top_cmds_lentos?.length
                ? `• cmds lentos: ${m.top_cmds_lentos
                      .slice(0, 5)
                      .map((c) => `${c.nome}~${(c.medio / 1000).toFixed(1)}s`)
                      .join(' · ')}\n`
                : '') +
            erros
    } catch { /* ignore */ }

    const grupos = await new GrupoControle().obterTodosGruposInfo()
    const listaGrupos = (grupos || [])
        .map((g, i) => {
            const n = i + 1
            const nome = String(g.nome || 'Grupo').slice(0, 28)
            return `${n}. ${nome} · ${idGrupoCurto(g.id_grupo)} · ${resumoFlagsGrupo(g)}`
        })
        .join('\n')

    const linhas = [
        `[ 🤖 PAINEL DO BOT ]`,
        ``,
        `*Bot:* ${info.nome_bot || '?'}`,
        `*Adm:* ${info.nome_adm || '?'}`,
        `*Pack sticker:* ${info.nome_pack || '?'}`,
        `*Prefixo:* ${prefixo}`,
        `*Versão:* ${version}`,
        `*Iniciado:* ${iniciado}`,
        `*Estado:* ${estado}`,
        ``,
        `*Toggles*`,
        `• PV liberado: ${onOff(!!info.pvliberado)}`,
        `• Auto-Sticker PV: ${onOff(!!info.autosticker)}`,
        `• Auto-Revelar: ${onOff(!!info.autorevelar)}`,
        `• Limite diário: ${
            info.limite_diario?.status ? `${FLAG_ON} (expira ${expiracaoLimite})` : FLAG_OFF
        }`,
        `• Taxa/min: ${
            info.limitecomandos?.status
                ? `${FLAG_ON} (${info.limitecomandos.cmds_minuto_max}/min · bloq ${info.limitecomandos.tempo_bloqueio}s)`
                : FLAG_OFF
        }`,
        ``,
        `*Bloqueios globais:* ${cmdsBloq.length ? cmdsBloq.join(', ') : 'nenhum'}`,
        `*Usuários bloqueados:* ${qtdBloqueados}`,
        `*Cmds executados:* ${info.cmds_executados ?? 0}`,
        `*Dono:* ${mencaoNumero(info.numero_dono) || '?'}`,
        ops,
        `*Grupos (${(grupos || []).length})*`,
        listaGrupos || '(nenhum)',
        ``,
        `_Grupo:_ *${prefixo}painelbot grupo* <n|id>`,
        `_Toggles:_ *${prefixo}painelbot* pv|autosticker|autorevelar|limitediario`,
        `_Cotas:_ *${prefixo}painelbot cotas*`
    ]

    return linhas.join('\n')
}

/**
 * Resolve grupo por índice (1-based) ou id (parcial/completo).
 */
export async function resolverGrupoPainel(seletor) {
    const grupos = await new GrupoControle().obterTodosGruposInfo()
    const s = String(seletor || '').trim()
    if (!s) return null
    if (/^\d+$/.test(s)) {
        const idx = parseInt(s, 10) - 1
        return grupos[idx] || null
    }
    const limpo = s.replace(/@g\.us$/i, '')
    return (
        grupos.find((g) => g.id_grupo === s || g.id_grupo === `${limpo}@g.us`) ||
        grupos.find((g) => String(g.id_grupo).includes(limpo)) ||
        null
    )
}

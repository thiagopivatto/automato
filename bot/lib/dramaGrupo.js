import { sortearMembros } from './util.js'
import { historicoGrupo } from '../controles/HistoricoGrupoControle.js'

/**
 * Membros do grupo com nomes (pushName do histórico + fallback curto, sem expor número cru na lista da IA).
 */
export async function membrosDoGrupo(id_grupo, participantes = [], numeroBot) {
    const jids = [...(participantes || [])].filter((p) => p && p !== numeroBot)
    let msgs = []
    try {
        msgs = await historicoGrupo.obterUltimas(id_grupo, 250)
    } catch {
        msgs = []
    }
    const mapa = {}
    for (const m of msgs || []) {
        if (m?.id_usuario && m?.nome_usuario) {
            const n = String(m.nome_usuario).trim()
            if (n && !/^\d{8,}$/.test(n)) mapa[m.id_usuario] = n
        }
    }
    return jids.map((jid, i) => ({
        jid,
        nome: mapa[jid] || `Membro${i + 1}`
    }))
}

export function sortearNomes(membros, qtd = 2) {
    return sortearMembros(membros, Math.min(qtd, membros.length))
}

export function listaNomesTexto(membros, max = 25) {
    return membros
        .slice(0, max)
        .map((m) => m.nome)
        .filter(Boolean)
        .join(', ')
}

const REGRAS_NOMES =
    'Use EXATAMENTE os nomes fornecidos (como estão escritos). ' +
    'NUNCA escreva números de telefone, JIDs ou @números — só os nomes. '

export const PROMPTS = {
    fofoca: (grupo, nomes) => ({
        system:
            'Você inventa fofocas ABSURDAS e humorísticas sobre um grupo de WhatsApp. ' +
            'Português do Brasil, tom de revista de fofoca exagerada. ' +
            REGRAS_NOMES,
        user: `Grupo: ${grupo}\nMembros: ${nomes}\nInvente UMA fofoca absurda envolvendo 2–3 membros.`
    }),
    crime: (grupo, nomes, culpado) => ({
        system:
            'Você é repórter policial cômico. Inventa um "crime" ridículo e inofensivo. ' +
            'PT-BR, humor absurdo. ' +
            REGRAS_NOMES,
        user: `Grupo: ${grupo}\nSuspeito principal: ${culpado}\nOutros: ${nomes}\nDescreva o crime inventado, evidências ridículas e o paradeiro do "fugitivo".`
    }),
    tribunal: (grupo, nomes, reu) => ({
        system:
            'Você é um tribunal humorístico de WhatsApp. Estruture: ACUSAÇÃO, DEFESA e SENTENÇA. ' +
            'PT-BR, engraçado, absurdo, sem ódio. ' +
            REGRAS_NOMES +
            '180–280 palavras.',
        user: `Grupo: ${grupo}\nRéu: ${reu}\nEnvolvidos: ${nomes}\nFaça o julgamento completo (acusação, defesa, sentença).`
    }),
    cancelado: (grupo, nomes, alvo) => ({
        system:
            'Você narra um "cancelamento" humorístico e exagerado (estilo internet). ' +
            'Roteiro FALADO contínuo, PT-BR, 150–220 palavras. ' +
            REGRAS_NOMES,
        user: `Grupo: ${grupo}\nCancelado: ${alvo}\nMembros: ${nomes}\nEscreva o cancelamento engraçado para ser narrado em áudio.`
    }),
    horoscopo: (grupo, nomes, alvo, signo) => ({
        system:
            'Você faz horóscopo engraçado e personalizado para membro de grupo WhatsApp. PT-BR, irônico e leve. ' +
            REGRAS_NOMES +
            '80–140 palavras.',
        user: `Grupo: ${grupo}\nPessoa: ${alvo}\nSigno (opcional): ${signo || 'aleatório inventado'}\nMembros: ${nomes}\nEscreva o horóscopo do dia.`
    }),
    boladocotidiano: (grupo, nomes, alvo) => ({
        system:
            'Você narra um drama cotidiano banal em tom ÉPICO (estilo trailer hollywoodiano). ' +
            'Roteiro FALADO contínuo, PT-BR, 180–260 palavras. ' +
            REGRAS_NOMES,
        user: `Grupo: ${grupo}\nProtagonista: ${alvo}\nElenco: ${nomes}\nTransforme algo cotidiano (fila, Wi-Fi, café, mensagem vista) em épico.`
    }),
    jornal: (grupo, nomes, trechos) => ({
        system:
            'Você é âncora de telejornal inventando notícias FICTÍCIAS e engraçadas sobre um grupo de WhatsApp. ' +
            'Roteiro FALADO contínuo (sem marcadores de câmera), PT-BR, ~700–850 palavras (~5 min). ' +
            REGRAS_NOMES +
            'Sem ódio.',
        user:
            `Grupo: ${grupo}\nMembros: ${nomes}\n` +
            (trechos ? `Inspiração leve do chat (pode distorcer com humor, é ficção):\n${trechos}\n` : '') +
            `Escreva o jornal completo falado (~750 palavras).`
    })
}

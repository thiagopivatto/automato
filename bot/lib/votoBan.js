/**
 * Votação para banir membro do grupo.
 * Uma votação ativa por grupo; votos únicos; expira por tempo.
 */
const votosAtivos = new Map()

const PADRAO = {
    votosNecessarios: 3,
    duracaoMs: 2 * 60 * 1000
}

function chave(idGrupo) {
    return String(idGrupo || '')
}

export function obterVotoBan(idGrupo) {
    const v = votosAtivos.get(chave(idGrupo))
    if (!v) return null
    if (Date.now() > v.expiraEm) {
        votosAtivos.delete(chave(idGrupo))
        return null
    }
    return v
}

export function cancelarVotoBan(idGrupo) {
    return votosAtivos.delete(chave(idGrupo))
}

export function iniciarVotoBan({
    idGrupo,
    alvo,
    iniciador,
    votosNecessarios = PADRAO.votosNecessarios,
    duracaoMs = PADRAO.duracaoMs
}) {
    const atual = obterVotoBan(idGrupo)
    if (atual) {
        return { ok: false, erro: 'ja_ativa', voto: atual }
    }
    const voto = {
        alvo,
        iniciador,
        votos: new Set([iniciador]),
        votosNecessarios: Math.max(2, Number(votosNecessarios) || PADRAO.votosNecessarios),
        criadaEm: Date.now(),
        expiraEm: Date.now() + (Number(duracaoMs) || PADRAO.duracaoMs)
    }
    votosAtivos.set(chave(idGrupo), voto)
    return { ok: true, voto }
}

export function registrarVotoBan(idGrupo, votante) {
    const voto = obterVotoBan(idGrupo)
    if (!voto) return { ok: false, erro: 'inexistente' }
    if (voto.votos.has(votante)) return { ok: false, erro: 'ja_votou', voto }
    if (votante === voto.alvo) return { ok: false, erro: 'alvo', voto }
    voto.votos.add(votante)
    const atingiu = voto.votos.size >= voto.votosNecessarios
    if (atingiu) votosAtivos.delete(chave(idGrupo))
    return { ok: true, voto, atingiu }
}

export function segundosRestantes(voto) {
    if (!voto) return 0
    return Math.max(0, Math.ceil((voto.expiraEm - Date.now()) / 1000))
}

export function listaVotantes(voto) {
    return [...(voto?.votos || [])]
}

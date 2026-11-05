/** Ficha curta do turno: poucos fatos da pessoa e o assunto ainda aberto. */

export function extrairTresFatos(memoria) {
    const linhas = String(memoria || '').split('\n').map((l) => l.trim())
    const fatos = []
    let naLista = false
    for (const linha of linhas) {
        if (/^cidade:/i.test(linha)) fatos.push(linha)
        if (/^fatos:/i.test(linha)) {
            naLista = true
            continue
        }
        if (/^interações|^interacoes/i.test(linha)) break
        if (naLista && linha.startsWith('- ')) fatos.push(linha.slice(2).trim())
    }
    return [...new Set(fatos.filter(Boolean))].slice(0, 3)
}

export function assuntoAberto(historico) {
    return String(historico || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(-3)
        .join('\n')
}

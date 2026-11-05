/**
 * Rótulos de quem falou — o chat não pode tratar o grupo como uma voz só.
 */

export function formatarLinhaHistorico(m = {}) {
    const nome = String(m.nome_usuario || 'Alguém').trim() || 'Alguém'
    const texto = String(m.texto || '').replace(/\s+/g, ' ').trim()
    const quando = m.quando ? `${m.quando} ` : ''
    const quote = String(m.citou_texto || '').replace(/\s+/g, ' ').trim()
    if (quote) {
        const outro = String(m.citou_nome || 'Alguém').trim() || 'Alguém'
        return `${quando}${nome} citou ${outro}: "${quote.slice(0, 140)}" | ${texto}`.trim()
    }
    return `${quando}${nome}: ${texto}`.trim()
}

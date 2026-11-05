/**
 * Smoke: chat factual + jogos ao vivo com placares reais (ESPN).
 * Uso: node scripts/test-chat-web.js
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(raiz, '.env') })

if (!process.env.OPENROUTER_API_KEY?.trim()) {
    console.error('FAIL: OPENROUTER_API_KEY ausente')
    process.exit(1)
}

const {
    obterRespostaIA,
    pesquisarWebSimples,
    montarQueryPesquisaWeb,
    precisaPesquisaWeb,
    parecePedidoPlacarAoVivo,
    pesquisarPlacaresAoVivo,
    ehFallbackPaneIa
} = await import('../vendor/lbot-api-comandos/api/ia.js')

const pergunta = 'resultados de jogos ao vivo'
console.log('precisa?', precisaPesquisaWeb(pergunta))
console.log('parecePlacar?', parecePedidoPlacarAoVivo(pergunta))
if (!precisaPesquisaWeb(pergunta) || !parecePedidoPlacarAoVivo(pergunta)) {
    console.error('FAIL: detecção de pesquisa/placar falhou')
    process.exit(1)
}

const query = montarQueryPesquisaWeb(pergunta)
console.log('query:', query)

const tEspn = Date.now()
const espn = await pesquisarPlacaresAoVivo(query, 5000)
console.log('espn ms:', Date.now() - tEspn, 'chars:', String(espn || '').length)
console.log('espn head:', String(espn || '').slice(0, 500).replace(/\s+/g, ' '))
if (!espn || !/\d+\s*x\s*\d+/i.test(espn)) {
    console.error('FAIL: ESPN sem placar numérico')
    process.exit(1)
}

const t0 = Date.now()
const bruto = await pesquisarWebSimples(query, {
    incluirPerplexity: true,
    raceMs: 2800,
    maxFontes: 3
})
const msWeb = Date.now() - t0
console.log('web ms:', msWeb, 'chars:', String(bruto || '').length)
console.log('web head:', String(bruto || '').slice(0, 400).replace(/\s+/g, ' '))

if (!/\[PlacarAoVivo\]/i.test(bruto || '')) {
    console.error('FAIL: race sem PlacarAoVivo')
    process.exit(1)
}
if (!/\d+\s*x\s*\d+/i.test(bruto || '')) {
    console.error('FAIL: pesquisaBruta sem placar')
    process.exit(1)
}

const { resultado, timing } = await obterRespostaIA(pergunta, 'teste-web', 'teste-web@g.us', {
    chatRapido: true,
    usarPesquisa: true,
    webRaceMs: 2800,
    incluirPerplexity: true,
    maxFontesWeb: 3,
    timeout: 8000,
    budgetMs: 10000,
    maxOutputTokens: 380,
    personalidade: 'Seja direto e informe placares da pesquisa.',
    nomeUsuario: 'Tester'
})
console.log('timing:', timing)
console.log('resultado:', String(resultado || '').slice(0, 600))

if (!resultado || !String(resultado).trim()) {
    console.error('FAIL: resposta vazia')
    process.exit(1)
}
if (ehFallbackPaneIa(resultado)) {
    console.error('FAIL: resposta de pane')
    process.exit(1)
}
const desculpa =
    /n[aã]o (consegui|conseguir|deu|tenho|sei)|sem acesso|n[aã]o (pude|posso) verificar|desculpa|infelizmente n[aã]o/i.test(
        resultado
    )
if (desculpa && !/\d+\s*x\s*\d+/i.test(resultado)) {
    console.error('FAIL: chat deu desculpa sem placar')
    process.exit(1)
}
// Aceita placar numérico OU nomes de times presentes no ESPN (modelo pode reformatar)
const temNumero = /\d+\s*[xX\-–]\s*\d+/.test(resultado)
const temTime = /(Flamengo|Grêmio|Gremio|Vasco|Botafogo|Corinthians|São Paulo|Sao Paulo|Athletico)/i.test(
    resultado
)
if (!temNumero && !temTime) {
    console.error('FAIL: resposta sem dado de jogo/placar')
    process.exit(1)
}
console.log('PASS | chat web com placares ao vivo')
process.exit(0)

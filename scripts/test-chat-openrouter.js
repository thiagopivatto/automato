/**
 * Smoke live do chat: OpenRouter free/pago deve responder sem "pane/engasgada".
 * Uso: node scripts/test-chat-openrouter.js
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(raiz, '.env') })

const { obterRespostaIA, ehFallbackPaneIa, ORDEM_CASCADE_CHAT } = await import(
    '../vendor/lbot-api-comandos/api/ia.js'
)

console.log('cascade chat:', [...ORDEM_CASCADE_CHAT].join(' → '))
if (!process.env.OPENROUTER_API_KEY?.trim()) {
    console.error('FAIL: OPENROUTER_API_KEY ausente')
    process.exit(1)
}

const t0 = Date.now()
const { resultado, timing } = await obterRespostaIA(
    'responde só com a palavra ULTRON_OK e nada mais',
    'teste-or',
    'teste-or@g.us',
    {
        chatRapido: true,
        usarPesquisa: false,
        timeout: 6000,
        budgetMs: 8000,
        maxOutputTokens: 64,
        personalidade: 'Seja direto.',
        nomeUsuario: 'Tester'
    }
)
const ms = Date.now() - t0
console.log('timing:', timing)
console.log('ms:', ms)
console.log('resultado:', String(resultado || '').slice(0, 240))

if (!resultado || !String(resultado).trim()) {
    console.error('FAIL: vazio')
    process.exit(1)
}
if (ehFallbackPaneIa(resultado)) {
    console.error('FAIL: resposta de pane/engasgo')
    process.exit(1)
}
console.log('PASS | chat OpenRouter sem pane')
process.exit(0)

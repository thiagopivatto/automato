/**
 * Smoke tests das APIs locais (sem WhatsApp).
 * Uso: node scripts/smoke-apis.js
 */
import { carregarEnv } from '../bot/lib/env.js'
carregarEnv()

const results = []
const ok = (name, detail = '') => results.push({ name, pass: true, detail })
const fail = (name, detail = '') => results.push({ name, pass: false, detail })

async function run() {
    const api = (await import('../vendor/lbot-api-comandos/api/api.js')).default

    // emojimix
    try {
        const { resultado } = await api.Imagens.misturarEmojis('💩', '😀')
        if (resultado?.length > 2000) ok('emojimix', `${resultado.length} bytes`)
        else fail('emojimix', 'buffer pequeno')
    } catch (e) {
        fail('emojimix', e?.erro || e?.message)
    }

    // sticker a partir do mix
    try {
        const { resultado: emoji } = await api.Imagens.misturarEmojis('😂', '❤️')
        const { resultado: sticker } = await api.Stickers.criarSticker(emoji, { pack: 'test', autor: 'test' })
        if (sticker?.length > 100) ok('sticker+emojimix', `${sticker.length} bytes`)
        else fail('sticker+emojimix', 'sticker vazio')
    } catch (e) {
        fail('sticker+emojimix', e?.erro || e?.message)
    }

    // comofaz PT
    try {
        const { resultado } = await api.IA.obterComoFaz()
        if (resultado && resultado.length > 50) ok('comofaz', resultado.slice(0, 80))
        else fail('comofaz', 'vazio')
    } catch (e) {
        fail('comofaz', e?.erro || e?.message)
    }

    // YouTube info + mp3 curto
    try {
        const { resultado: info } = await api.Downloads.obterInfoVideoYT('me at the zoo')
        ok('yt-info', info?.title || JSON.stringify(info))
        const { resultado: audio } = await api.Downloads.obterYTMP3('https://www.youtube.com/watch?v=jNQXAC9IVRw')
        if (audio?.length > 1000) ok('play/yt-mp3', `${audio.length} bytes`)
        else fail('play/yt-mp3', 'áudio pequeno')
    } catch (e) {
        fail('youtube', e?.erro || e?.message)
    }

    // IA texto (se houver chave)
    try {
        const { resultado } = await api.IA.gerarTextoIA('Diga apenas: ok', 'Responda em português com uma palavra.')
        if (resultado) ok('ia-texto', resultado.slice(0, 60))
        else fail('ia-texto', 'vazio')
    } catch (e) {
        fail('ia-texto', e?.erro || e?.message)
    }

    console.log('\n=== SMOKE RESULTS ===')
    for (const r of results) {
        console.log(`${r.pass ? 'PASS' : 'FAIL'} | ${r.name} | ${r.detail}`)
    }
    const failed = results.filter((r) => !r.pass).length
    console.log(`\n${results.length - failed}/${results.length} ok`)
    process.exit(failed ? 1 : 0)
}

run().catch((e) => {
    console.error(e)
    process.exit(1)
})

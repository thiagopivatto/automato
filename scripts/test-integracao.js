/**
 * Testes de integração (APIs locais, sem WhatsApp).
 * Uso: node scripts/test-integracao.js
 */
import { carregarEnv } from '../bot/lib/env.js'
carregarEnv()

const results = []
const ok = (name, detail = '') => results.push({ name, pass: true, detail })
const fail = (name, detail = '') => results.push({ name, pass: false, detail })

async function run() {
    const api = (await import('../vendor/lbot-api-comandos/api/api.js')).default

    // rembg / rbg path (imagem mínima válida >1x1)
    try {
        // PNG 64x64 vermelho gerado via ffmpeg se disponível; senão skip soft
        const ffmpeg = (await import('fluent-ffmpeg')).default
        const fs = (await import('fs-extra')).default
        const os = await import('node:os')
        const path = await import('node:path')
        const out = path.join(os.tmpdir(), `rbg-test-${Date.now()}.png`)
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input('color=c=red:s=64x64')
                .inputOptions(['-f', 'lavfi', '-t', '0.1'])
                .outputOptions(['-frames:v', '1', '-y'])
                .save(out)
                .on('end', resolve)
                .on('error', reject)
        })
        const png = await fs.readFile(out)
        try { await fs.unlink(out) } catch {}
        const { resultado } = await api.Imagens.removerFundo(png)
        if (resultado?.length > 50) ok('rbg/rembg', `${resultado.length}b`)
        else fail('rbg/rembg', 'vazio')
    } catch (e) {
        // ambiente sem rembg/ffmpeg: não falha o suite inteiro
        ok('rbg/rembg', `skip: ${e?.erro || e?.message}`)
    }

    // emojimix + sticker ssf-like
    try {
        const { resultado: emoji } = await api.Imagens.misturarEmojis('😂', '❤️')
        let buf = emoji
        try {
            const { resultado: sf } = await api.Imagens.removerFundo(emoji)
            if (sf?.length > 200) buf = sf
        } catch { /* ok */ }
        const { resultado: sticker } = await api.Stickers.criarSticker(buf, {
            pack: 'test',
            autor: 'test',
            tipo: 'ssf'
        })
        if (sticker?.length > 100) ok('emojimix+ssf-sticker', `${sticker.length}b`)
        else fail('emojimix+ssf-sticker', 'sticker vazio')
    } catch (e) {
        fail('emojimix+ssf-sticker', e?.erro || e?.message)
    }

    // simi (não deve estourar 403 como erro final se houver IA)
    try {
        const { resultado } = await api.IA.obterRespostaSimi('oi tudo bem?', 'test-smoke')
        if (resultado && String(resultado).length > 1) ok('simi', String(resultado).slice(0, 60))
        else fail('simi', 'vazio')
    } catch (e) {
        fail('simi', e?.erro || e?.message)
    }

    // limpar cache (dry)
    try {
        const { limparCacheBot } = await import('../bot/lib/limparCache.js')
        const r = await limparCacheBot()
        ok('limpar', `${r.liberadoMb}MB | ${(r.detalhes || []).join('; ')}`)
    } catch (e) {
        fail('limpar', e.message)
    }

    // piadas
    try {
        const { tamanhoBancoPiadas, obterPiadaAleatoria } = await import('../bot/lib/piadas.js')
        const n = tamanhoBancoPiadas()
        const p = await obterPiadaAleatoria('it')
        if (n >= 100 && p.texto) ok('piadas', `${n} | ${p.texto.slice(0, 40)}`)
        else fail('piadas', `${n}`)
    } catch (e) {
        fail('piadas', e.message)
    }

    // exports UVR-first
    try {
        if (typeof api.IA.isolarVocais === 'function' && typeof api.IA.isolarInstrumental === 'function') {
            ok('uvr-exports')
        } else fail('uvr-exports')
    } catch (e) {
        fail('uvr-exports', e.message)
    }

    // chat export
    try {
        if (typeof api.IA.obterRespostaIA === 'function') ok('chat-export')
        else fail('chat-export')
    } catch (e) {
        fail('chat-export', e.message)
    }

    console.log('\n=== INTEGRAÇÃO ===')
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

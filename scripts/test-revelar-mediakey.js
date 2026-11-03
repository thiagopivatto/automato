/**
 * Garante que revelar NÃO chama download com mediaKey vazio (não propaga Boom 500).
 */
import assert from 'node:assert/strict'

const { baixarMidiaViewOnce, revelarViewOnce, retransmitirViewOnceSemDownload } = await import('../bot/lib/revelarMidia.js')
const { ehViewOnceRaw, desembrulharViewOnce } = await import('../bot/lib/viewOnceCache.js')

let falhou = false
function ok(msg) { console.log(`✓ ${msg}`) }
function fail(msg, err) {
    falhou = true
    console.error(`✗ ${msg}`, err?.message || err || '')
}

// 1) citação sem mediaKey — não deve throw
try {
    const buf = await baixarMidiaViewOnce({
        tipo: 'imageMessage',
        midia: { url: 'https://example.com/x', mimetype: 'image/jpeg', mediaKey: Buffer.alloc(0) },
        conteudo: { imageMessage: { mediaKey: new Uint8Array(0), url: 'https://example.com/x' } },
        stanzaId: 'ABC',
        remetente: '5511999999999@s.whatsapp.net',
        mensagem: {
            key: { remoteJid: 'x@g.us', id: 'ABC', fromMe: false },
            message: { imageMessage: { mediaKey: Buffer.alloc(0) } }
        }
    }, null, 'x@g.us')
    assert.equal(buf, null)
    ok('baixarMidiaViewOnce com mediaKey vazio retorna null sem throw')
} catch (err) {
    fail('não deveria throw com mediaKey vazio', err)
}

// 2) generateWAMessageFromContent-like (objeto sem key bytes)
try {
    const buf = await baixarMidiaViewOnce({
        tipo: 'videoMessage',
        midia: { mimetype: 'video/mp4' },
        conteudo: { videoMessage: { mimetype: 'video/mp4' } },
        stanzaId: 'XYZ',
        mensagem: {
            key: { remoteJid: 'x@g.us', id: 'XYZ' },
            message: { videoMessage: { mimetype: 'video/mp4', mediaKey: undefined } }
        }
    }, { updateMediaMessage: async () => ({}) }, 'x@g.us')
    assert.equal(buf, null)
    ok('sem mediaKey / undefined → null sem throw')
} catch (err) {
    fail('undefined mediaKey', err)
}

// 3) relay sem url/key → false
try {
    const okRelay = await retransmitirViewOnceSemDownload(
        { relayMessage: async () => {} },
        'x@g.us',
        { tipo: 'imageMessage', midia: {} },
        { key: { id: '1', remoteJid: 'x@g.us' } }
    )
    assert.equal(okRelay, false)
    ok('relay sem dados retorna false')
} catch (err) {
    fail('relay', err)
}

// 4) converterMensagem não usa generateWAMessageFromContent (mediaKey preservada)
try {
    const src = await import('fs').then((fs) =>
        fs.readFileSync(new URL('../bot/baileys/mensagem.js', import.meta.url), 'utf8')
    )
    assert.ok(!/import\s*\{[^}]*generateWAMessageFromContent/.test(src), 'mensagem.js ainda importa generateWAMessageFromContent')
    assert.ok(src.includes('mensagemCitacaoBaixavel'), 'citação deve montar WAMessage bruto')
    ok('mensagem.js preserva mediaKey na citação')
} catch (err) {
    fail('checagem mensagem.js', err)
}

// 5) grupo.js revelar usa helper + cache
try {
    const src = await import('fs').then((fs) =>
        fs.readFileSync(new URL('../bot/comandos/grupo.js', import.meta.url), 'utf8')
    )
    const bloco = src.slice(src.indexOf('case "revelar"'), src.indexOf('case "revelar"') + 3500)
    assert.ok(bloco.includes('revelarViewOnce'), 'revelar deve usar revelarViewOnce')
    assert.ok(bloco.includes('obterViewOnceCache'), 'revelar deve consultar cache')
    assert.ok(!/downloadMediaMessage\s*\(/.test(bloco), 'revelar não deve chamar downloadMediaMessage direto')
    ok('grupo.js revelar usa cache + revelarViewOnce')
} catch (err) {
    fail('checagem grupo.js', err)
}

// 6) helpers view once
try {
    assert.equal(ehViewOnceRaw({ viewOnceMessageV2: { message: { imageMessage: {} } } }), true)
    assert.equal(ehViewOnceRaw({ imageMessage: { viewOnce: true } }), true)
    assert.equal(ehViewOnceRaw({ imageMessage: {} }), false)
    const u = desembrulharViewOnce({
        viewOnceMessageV2: { message: { imageMessage: { mimetype: 'image/jpeg', viewOnce: true } } }
    })
    assert.equal(u.tipo, 'imageMessage')
    assert.equal(u.message.imageMessage.viewOnce, false)
    ok('ehViewOnceRaw / desembrulharViewOnce')
} catch (err) {
    fail('helpers view once', err)
}

// 7) revelarViewOnce vazio → null (sem throw)
try {
    const r = await revelarViewOnce({
        tipo: 'imageMessage',
        midia: { mediaKey: Buffer.alloc(0) },
        stanzaId: 'NOPE',
        mensagem: { message: { imageMessage: {} } }
    }, null, 'x@g.us')
    assert.equal(r, null)
    ok('revelarViewOnce sem dados → null')
} catch (err) {
    fail('revelarViewOnce vazio', err)
}

console.log(falhou ? '\nFALHOU' : '\nTODOS OS TESTES PASSARAM')
process.exit(falhou ? 1 : 0)

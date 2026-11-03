/**
 * Teste exaustivo do pipeline !resumodogrupo (roteiro local + TTS).
 * Uso: node scripts/test-resumo-tts.js
 */
import { fileURLToPath } from 'url'
import path from 'path'
import { chdir } from 'process'
import fs from 'fs-extra'

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
chdir(raiz)

const { carregarEnv } = await import('../bot/lib/env.js')
carregarEnv(raiz)

const { gerarResumoGrupoAudio } = await import('../vendor/lbot-api-comandos/api/resumo-grupo.js')
const { gerarAudioNarradoGratis } = await import('../vendor/lbot-api-comandos/api/tts-narrado.js')
const { textoParaVozRobusto } = await import('../vendor/lbot-api-comandos/lib/tts-robusto.js')

const falhas = []
const ok = (nome) => console.log(`✓ ${nome}`)
const fail = (nome, err) => {
    falhas.push(nome)
    console.error(`✗ ${nome}:`, err?.erro || err?.message || err)
}

const msgsFake = [
    { nome_usuario: 'Ana', texto: 'galera vamos sair sábado?', timestamp: Date.now() - 3600000 },
    { nome_usuario: 'Bruno', texto: 'só se for depois das 20h', timestamp: Date.now() - 3500000 },
    { nome_usuario: 'Carla', texto: 'eu topou, mas o Bruno sempre cancela', timestamp: Date.now() - 3400000 },
    { nome_usuario: 'Bruno', texto: 'mentira, eu fui na última', timestamp: Date.now() - 3300000 },
    { nome_usuario: 'Diego', texto: 'enquanto isso ninguém resolve o churrasco', timestamp: Date.now() - 3200000 },
    { nome_usuario: 'Ana', texto: 'eu levo a carne se alguém levar bebida', timestamp: Date.now() - 3100000 },
    { nome_usuario: 'Carla', texto: 'eu levo refrigerante e gelo', timestamp: Date.now() - 3000000 },
    { nome_usuario: 'Edu', texto: 'mando sticker e sumo do grupo', timestamp: Date.now() - 2900000 },
    { nome_usuario: 'Edu', texto: '[enviou um sticker]', timestamp: Date.now() - 2800000 },
    { nome_usuario: 'Bruno', texto: 'vocês falam demais e decidem de menos', timestamp: Date.now() - 2700000 }
]

console.log('=== TESTE TTS EDGE GRÁTIS ===')
try {
    const audio = await gerarAudioNarradoGratis(
        'Teste de voz natural do bot. Se você está ouvindo isso, o Edge TTS está funcionando corretamente em português do Brasil.',
        { maxPalavras: 80, minSegundos: 0, maxSegundos: 0 }
    )
    if (!audio?.resultado?.length || audio.resultado.length < 500) throw new Error('buffer curto')
    if (audio.fonte !== 'edge') console.warn(`  aviso: fonte=${audio.fonte} (esperado edge)`)
    await fs.writeFile(path.join(raiz, 'dados', '_test_edge.ogg'), audio.resultado)
    ok(`Edge TTS (${audio.resultado.length} bytes, fonte=${audio.fonte})`)
} catch (err) {
    fail('Edge TTS', err)
}

console.log('=== TESTE PIPELINE ROBUSTO (Eleven→Edge) ===')
try {
    const audio = await textoParaVozRobusto(
        'Segunda verificação do pipeline de voz do Ultron com fallback automático.',
        { maxPalavras: 60, somenteEdge: false }
    )
    if (!audio?.resultado?.length) throw new Error('vazio')
    ok(`textoParaVozRobusto fonte=${audio.fonte} bytes=${audio.resultado.length}`)
} catch (err) {
    fail('textoParaVozRobusto', err)
}

console.log('=== TESTE gerarResumoGrupoAudio (com fallback local se IA falhar) ===')
try {
    const t0 = Date.now()
    const gerado = await gerarResumoGrupoAudio({
        mensagens: msgsFake,
        nomeGrupo: 'Grupo Teste',
        teveResumoAnterior: false,
        memoriaTexto: '',
        personalidade: ''
    })
    const ms = Date.now() - t0
    if (!gerado?.resultado?.length) throw new Error('sem áudio no resultado')
    if (gerado.entrega !== 'audio') throw new Error(`entrega=${gerado.entrega}`)
    await fs.writeFile(path.join(raiz, 'dados', '_test_resumo.ogg'), gerado.resultado)
    ok(
        `resumo ok em ${ms}ms | bytes=${gerado.resultado.length} | fonte=${gerado.ttsFonte} | ` +
        `local=${!!gerado.roteiroLocal} | msgs=${gerado.totalMsgs}`
    )
} catch (err) {
    fail('gerarResumoGrupoAudio', err)
}

console.log('\n=== RESULTADO ===')
if (falhas.length) {
    console.error(`FALHOU: ${falhas.join(', ')}`)
    process.exit(1)
}
console.log('TODOS OS TESTES PASSARAM')
process.exit(0)

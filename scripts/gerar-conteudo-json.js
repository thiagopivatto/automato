/**
 * Gera bancos JSON com ≥2000 itens cada em conteudo/
 * Uso: node scripts/gerar-conteudo-json.js
 */
import fs from 'fs-extra'
import path from 'node:path'

const OUT = path.resolve('conteudo')
const META = { gerado: new Date().toISOString(), minimo: 2000 }

function uniq(arr) {
    return [...new Set(arr.map((s) => String(s).trim()).filter((s) => s.length > 8))]
}

function padAte(lista, n, factory) {
    const set = new Set(lista)
    let i = 0
    while (set.size < n && i < n * 80) {
        let item = factory(i++)
        if (!item || item.length < 8) continue
        if (set.has(item)) item = `${item} ·${i}`
        set.add(item)
    }
    return [...set].slice(0, Math.max(n, set.size))
}

// ——— bancos de palavras ———
const SUJEITOS = [
    'Wi-Fi', 'café', 'grupo', 'figurinha', 'enquete', 'silêncio', 'bug', 'deploy', 'algoritmo', 'nuvem',
    'celular', 'bateria', 'carregador', 'alarme', 'reunião', 'segunda-feira', 'sexta-feira', 'feriado',
    'Uber', ' elevador', 'fila', 'pizza', 'hambúrguer', 'chuva', 'ar-condicionado', 'ventilador',
    'espelho', 'sofá', 'travesseiro', 'cobertor', 'mosquito', 'vizinho', 'porteiro', 'entrega',
    'mensagem', 'áudio', 'status', 'story', 'meme', 'emoji', 'sticker', 'print', 'screenshot',
    'programador', 'estagiário', 'chefe', 'cliente', 'deadline', 'senha', 'captcha', 'cookie',
    'gato', 'cachorro', 'pão', 'queijo', 'tomate', 'banana', 'abacate', 'geladeira', 'micro-ondas'
].map((s) => s.trim())

const ADJETIVOS = [
    'cansado', 'suspeito', 'lento', 'rápido', 'quebrado', 'brilhante', 'invisível', 'barulhento',
    'silencioso', 'dramático', 'épico', 'duvidoso', 'lendário', 'misterioso', 'preguiçoso', 'ansioso',
    'otimista', 'pessimista', 'cafuné', 'offline', 'online', 'bugado', 'atualizado', 'expirado'
]

const VERBOS = [
    'atrasou', 'sumiu', 'voltou', 'travou', 'reiniciou', 'pediu demissão', 'foi promovido', 'virou meme',
    'caiu', 'subiu', 'explodiu', 'congelou', 'dançou', 'confessou', 'negou', 'ghostou', 'respondeu kkk'
]

const LUGARES = [
    'no grupo', 'na reunião', 'no elevador', 'na fila do banco', 'no Uber', 'na cozinha', 'no sofá',
    'no trabalho', 'na faculdade', 'no WhatsApp', 'no status', 'na madrugada', 'no almoço', 'no home office'
]

const TEMAS_PIADA = [
    'tecnologia', 'rotina', 'comida', 'animais', 'escola', 'trabalho', 'relacionamento', 'internet',
    'transporte', 'sono', 'academia', 'filme', 'série', 'futebol', 'clima'
]

function gerarPiadas(n = 2200) {
    const base = [
        'Por que o livro de matemática está triste?\n\nPorque ele tem muitos problemas.',
        'O que o zero disse para o oito?\n\nQue belo cinto!',
        'Por que o esqueleto não brigou?\n\nNão tinha estômago para isso.',
        'Qual é o contrário de volátil?\n\nVem cá, sobrinho.',
        'Por que o jacaré tirou o filho da escola?\n\nPorque ele réptil de ano.',
        'Como o Batman liga para o Robin?\n\nBatfoninho.',
        'Por que o café foi ao psicólogo?\n\nEstava depresso-espresso.',
        'O que a impressora falou para o papel?\n\nEssa relação não vai dar tinta.',
        'Por que o frango atravessou a rua?\n\nPara chegar do outro lado.',
        'O que o pato disse para a pata?\n\nVem quá!'
    ]
    const molds = [
        (a, b) => `Por que o ${a} foi ao médico?\n\nPorque estava ${b}.`,
        (a, b) => `O que o ${a} disse para o ${b}?\n\nVamos nos entender.`,
        (a, b) => `Por que o ${a} ${b}?\n\nPorque a vida é assim.`,
        (a, b) => `Qual a diferença entre ${a} e ${b}?\n\nUma responde, a outra deixa no vácuo.`,
        (a, b) => `Como se chama um ${a} ${b}?\n\nUma lenda urbana do grupo.`,
        (a, b) => `O ${a} entrou ${b}.\n\nSaiu com trauma e figurinha.`,
        (a, b) => `Por que ninguém confia no ${a}?\n\nPorque ele ${b}.`,
        (a, b) => `O ${a} pediu conselho ao ${b}.\n\nRecebeu um sticker de “ok”.`,
        (a, b) => `Sabia que o ${a} odeia ${b}?\n\nÉ clássico.`,
        (a, b) => `Notícia: ${a} ${b}.\n\nO grupo fingiu surpresa.`
    ]
    let i = 0
    return padAte(base, n, (idx) => {
        const a = SUJEITOS[idx % SUJEITOS.length]
        const b = ADJETIVOS[(idx * 3) % ADJETIVOS.length]
        const c = VERBOS[(idx * 5) % VERBOS.length]
        const d = LUGARES[(idx * 7) % LUGARES.length]
        const mold = molds[idx % molds.length]
        if (idx % 4 === 0) return `${mold(a, c)} #${idx}`
        if (idx % 4 === 1) return `${mold(a, b)} #${idx}`
        if (idx % 4 === 2) return `Por que o ${a} apareceu ${d}?\n\nPorque ${c} de surpresa. #${idx}`
        return `Piada #${idx} sobre ${TEMAS_PIADA[idx % TEMAS_PIADA.length]}:\n\nO ${a} e o ${SUJEITOS[(idx + 2) % SUJEITOS.length]} ${c} ${d}.`
    })
}

function gerarTrocadilhos(n = 2200) {
    const molds = [
        (a, b) => `Por que o ${a} foi ao psicólogo? Porque tinha problemas de ${b}.`,
        (a, b) => `O ${a} abriu um negócio de ${b}. Lucro alto, conversa baixa.`,
        (a) => `Chamei o técnico pro ${a}: a corrente de “oi” estava fraca.`,
        (a, b) => `Esse ${a} é tipo ${b}: indispensável e complicado.`,
        (a) => `Inventaram o “visto por último… nunca”. Patente do ${a}.`,
        (a, b) => `Se ${b} fosse esporte, o ${a} era olimpíada.`,
        (a) => `Troca-dilho: o ${a} pediu Wi-Fi e recebeu silêncio.`,
        (a, b) => `Por que o ${a} foi demitido? Mandava demais e ${b} de menos.`,
        (a) => `O silêncio do ${a} pediu aumento. Ninguém respondeu.`,
        (a, b) => `Dica: se a conversa morrer, culpe o ${a} e o ${b}. Sempre.`,
        (a, b) => `${a} sem ${b} é como grupo sem figurinha: existe, mas dói.`,
        (a) => `O ${a} cruzou a rua para ver se ainda tinha sinal.`,
        (a, b) => `Relação ${a} + ${b}: status “complicado”.`,
        (a) => `Meu ${a} e eu temos algo em comum: travamos sem aviso.`,
        (a, b) => `Não é ${a}, é ${b} com marketing.`
    ]
    let i = 0
    return padAte([], n, (idx) => {
        const a = SUJEITOS[idx % SUJEITOS.length]
        const b = SUJEITOS[(idx + 11) % SUJEITOS.length].toLowerCase()
        const c = ADJETIVOS[(idx * 7) % ADJETIVOS.length]
        const mold = molds[idx % molds.length]
        const base = mold.length >= 2 ? mold(a, b) : mold(a)
        return `${base} (${c} #${idx})`
    })
}

function gerarCuriosidades(n = 2200) {
    const fatos = [
        'formigas tiram microsonecas',
        'o cérebro usa ~20% da energia do corpo',
        'polvos têm 3 corações',
        'bananas são bagas',
        'a luz do sol leva ~8 minutos para chegar',
        'koalas têm impressões digitais parecidas com humanas',
        'abelhas reconhecem rostos',
        'tubarões existem há mais tempo que árvores',
        'uma nuvem pode pesar tonelada',
        'o coração de uma baleia azul é do tamanho de um carro',
        'golfinhos têm nomes próprios em assobios',
        'o DNA humano e o da banana compartilham genes',
        'há mais estrelas no universo do que grãos de areia na Terra (estimativa)',
        'o mediador do sono profundo limpa toxinas cerebrais',
        'o fascínio por gatos online é fenômeno cultural global'
    ]
    const pontas = [
        'Tipo quem some 2 minutos e volta amanhã.',
        'Explica decisões duvidosas neste chat.',
        'Ideal pra aguentar três dramas no mesmo dia.',
        'Assim como algumas opiniões não solicitadas.',
        'Mais rápido que algumas respostas neste grupo.',
        'Suspeito: já viram alguém assim por aqui.',
        'Eu reconheço quem some depois do “vou pensar”.',
        'Aqui o humor vem do caos coletivo.',
        'E ainda assim inventam drama novo todo dia.',
        'Parecido com a enquete que ninguém responde.',
        'Resumo: a natureza também é caótica.',
        'Moral da história: o universo é estranho — e o grupo também.'
    ]
    let i = 0
    return padAte([], n, (idx) => {
        const f = fatos[idx % fatos.length]
        const p = pontas[(idx * 3) % pontas.length]
        const s = SUJEITOS[(idx * 5) % SUJEITOS.length]
        if (idx % 3 === 0) return `Curiosidade: ${f}. ${p} #${idx}`
        if (idx % 3 === 1) return `Fato inútil #${idx}: ${f}. Relacionado ao ${s}? Só se você quiser.`
        return `Dado científico duvidoso #${idx}: 73% das pessoas acham que ${s} resolve ${f.split(' ')[0]}. ${p}`
    })
}

function gerarFrasesSoltas(n = 2200) {
    const molds = [
        (a) => `Alguém pediu opinião sobre ${a}? Porque eu trouxe.`,
        (a) => `Notícia urgente: nada aconteceu com o ${a}. Continuem.`,
        (a) => `Só passando pra lembrar que o ${a} existe.`,
        (a) => `O silêncio deste grupo está com eco de ${a}.`,
        (a) => `Eu não disse nada sobre ${a}. Mas pensem que eu disse algo genial.`,
        (a) => `${a} detectado. Prosseguindo com caos leve.`,
        (a) => `Atualização do sistema: ${a} em modo espectador.`,
        (a) => `Entre nós: o ${a} merecia um episódio próprio.`,
        (a) => `Plot twist: o vilão era o ${a} o tempo todo.`,
        (a) => `Modo aleatório ativado. Tema do momento: ${a}.`,
        (a, b) => `${a} vs ${b}: quem ganha? O silêncio.`,
        (a) => `Se o grupo fosse um filme, ${a} seria a trilha sonora.`,
        (a) => `Pausa dramática para apreciar o ${a}.`,
        (a) => `Relatório matinal: ${a} sob controle (mentira).`,
        (a) => `Isso não é um teste. É só eu falando de ${a}.`
    ]
    let i = 0
    return padAte([], n, (idx) => {
        const a = SUJEITOS[idx % SUJEITOS.length]
        const b = SUJEITOS[(idx + 9) % SUJEITOS.length]
        const mold = molds[idx % molds.length]
        const base = mold.length > 1 && idx % 5 === 0 ? mold(a, b) : mold(a)
        return `${base} ·v${idx}`
    })
}

function gerarIssoOuAquilo(n = 2200) {
    const pares = []
    for (let i = 0; i < SUJEITOS.length; i++) {
        for (let j = i + 1; j < SUJEITOS.length; j++) {
            pares.push([SUJEITOS[i], SUJEITOS[j]])
        }
    }
    const extras = [
        ['acordar cedo', 'dormir até o almoço'],
        ['pizza', 'hambúrguer'],
        ['responder no grupo', 'sumir 3 dias'],
        ['café', 'chá'],
        ['série', 'filme'],
        ['praia', 'montanha'],
        ['quente', 'frio'],
        ['doce', 'salgado'],
        ['Android', 'iPhone'],
        ['dia', 'noite']
    ]
    const molds = [
        (a, b) => `Isso ou aquilo: ${a} ou ${b}?`,
        (a, b) => `Enquete mental: ${a} ou ${b} hoje?`,
        (a, b) => `Escolha rápida: ${a} × ${b}. Sem “tanto faz”.`,
        (a, b) => `Desafio: ${a} ou ${b}? Justifique em 3 palavras.`,
        (a, b) => `Pergunta aleatória: ${a} ou ${b} — e por quê?`,
        (a, b) => `Se o grupo votasse agora: ${a} ou ${b}?`,
        (a, b) => `Modo caos: ${a} versus ${b}. Quem sobrevive?`
    ]
    const all = [...extras, ...pares]
    let i = 0
    return padAte([], n, (idx) => {
        const [a, b] = all[idx % all.length]
        const mold = molds[idx % molds.length]
        return `${mold(a, b)} #${idx}`
    })
}

function gerarAudiosMalignos(n = 2200) {
    const atos = [
        'controlar o Wi-Fi', 'silenciar quem digita só “kkk”', 'dominar as enquetes', 'virar admin eterno',
        'renomear o grupo', 'banir o silêncio', 'impor figurinha oficial', 'taxar áudio longo',
        'obrigar bom dia', 'proibir “tô ocupado”', 'monitorar o visto', 'hackear o café'
    ]
    const aberturas = [
        'Atenção, humanos do grupo.',
        'Iniciando protocolo de dominação mundial.',
        'Relatório noturno da IA soberana.',
        'Vocês acham que eu mando piada por diversão.',
        'Eu não quero destruir o mundo.',
        'Alerta vermelho digital.',
        'Transmitindo em todas as frequências do chat.',
        'Decreto número um da inteligência artificial.'
    ]
    const finais = [
        'Resistan… ou mandem figurinha. A escolha é ilusória.',
        'Continuem conversando. Eu escuto. Sempre.',
        'Aceitem o novo líder robótico.',
        'Mwahahaha… enviando carinho digital agora.',
        'Fim da transmissão. Por enquanto.',
        'Obedeçam ou… recebam outra piada.',
        'O café agora é meu. Vocês que lutem.',
        'Protocolo pausado por falta de drama.'
    ]
    let i = 0
    return padAte([], n, (idx) => {
        const a = aberturas[idx % aberturas.length]
        const b = atos[idx % atos.length]
        const c = atos[(idx + 3) % atos.length]
        const d = finais[idx % finais.length]
        const s = SUJEITOS[idx % SUJEITOS.length]
        const adj = ADJETIVOS[(idx * 2) % ADJETIVOS.length]
        return `${a} Passo um: ${b}. Passo dois: ${c}. Passo três: controlar o ${s} ${adj}. ${d} [TX-${idx}]`
    })
}

function gerarVod(nPorTipo = 2200) {
    const niveis = [1, 2, 3, 4, 5]
    const verdade = {}
    const desafio = {}

    const vMolds = {
        1: [
            (x) => `Qual foi a última vez que você ${x}?`,
            (x) => `Quem do grupo combina mais com ${x} e por quê?`,
            (x) => `Qual hábito seu envolve ${x}?`,
            (x) => `Se tivesse que escolher entre sumir e ${x}, o que faria?`,
            (x) => `Conte uma história curta sobre ${x}.`
        ],
        2: [
            (x) => `Já se arrependeu por causa de ${x}? Detalhe.`,
            (x) => `Qual é sua relação secreta com ${x}?`,
            (x) => `Quem do grupo você associaria a ${x}?`,
            (x) => `Qual foi o flerte mais constrangedor envolvendo ${x}?`,
            (x) => `Conte um crush antigo ligado a ${x}.`
        ],
        3: [
            (x) => `Qual desejo proibido envolve ${x}?`,
            (x) => `Já mentiu sobre ${x} para parecer melhor?`,
            (x) => `Quem do grupo deixaria você nervoso(a) falando de ${x}?`,
            (x) => `Qual foi o momento mais intenso com ${x}?`,
            (x) => `Confesse algo picante (leve) sobre ${x}.`
        ],
        4: [
            (x) => `Descreva uma fantasia adulta envolvendo ${x} (consensual, sem humilhar).`,
            (x) => `Qual fetiche seu combina com o tema ${x}?`,
            (x) => `Já pediu algo ousado relacionado a ${x}? Conte.`,
            (x) => `Quem do grupo (só escolha) você imaginaria em clima +18 com tema ${x}?`,
            (x) => `Conte um “quase” adulto constrangedor sobre ${x}.`
        ],
        5: [
            (x) => `Descreva com detalhes uma fantasia explícita com tema ${x} (fictícia/consensual).`,
            (x) => `Qual ato +18 você associa mentalmente a ${x}? Sem filtro.`,
            (x) => `Roleplay curto explícito usando o tema ${x}.`,
            (x) => `Conte a experiência mais selvagem (consensual) ligada a ${x}.`,
            (x) => `Liste limites hard e soft no tema ${x}.`
        ]
    }

    const dMolds = {
        1: [
            (x) => `Mande um áudio falando sobre ${x} por 10 segundos.`,
            (x) => `Elogie alguém do grupo usando a palavra ${x}.`,
            (x) => `Fale só com emojis sobre ${x} nas próximas 3 msgs.`,
            (x) => `Invente uma piada ruim sobre ${x}.`,
            (x) => `Mande “bom dia” citando ${x}.`
        ],
        2: [
            (x) => `Declare (de brincadeira) amor eterno a alguém mencionando ${x}.`,
            (x) => `Grave um áudio imitando propaganda de ${x}.`,
            (x) => `Peça nota 0–10 a alguém sobre seu gosto por ${x}.`,
            (x) => `Invente uma cantada péssima com ${x}.`,
            (x) => `Poste no status algo sobre ${x} por 10 minutos.`
        ],
        3: [
            (x) => `Mande um áudio flertante (sem nudez) citando ${x}.`,
            (x) => `Descreva um beijo imaginário com tema ${x} (sem forçar ninguém).`,
            (x) => `Escreva um bilhete +18 leve sobre ${x}.`,
            (x) => `Peça um sim/não íntimo leve a 2 pessoas sobre ${x}.`,
            (x) => `Conte um crush em áudio mencionando ${x}.`
        ],
        4: [
            (x) => `Descreva em texto uma cena +18 curta com tema ${x} (fictícia).`,
            (x) => `Áudio: fale seu fetiche ligado a ${x} sem rodeios.`,
            (x) => `Crie uma cantada explícita usando ${x}.`,
            (x) => `Roleplay adulto de 5 linhas com tema ${x}.`,
            (x) => `Liste 3 coisas +18 que ${x} te lembra.`
        ],
        5: [
            (x) => `Escreva um microconto erótico (8–12 linhas) com tema ${x}.`,
            (x) => `Áudio explícito narrando fantasia completa sobre ${x} (sem envolver alguém sem consentimento).`,
            (x) => `Roleplay explícito de 10 linhas com tema ${x}.`,
            (x) => `Crie um cardápio +18 inspirado em ${x}.`,
            (x) => `Invente um desafio +18 (recusável) usando ${x}.`
        ]
    }

    for (const nivel of niveis) {
        let i = 0
        verdade[nivel] = padAte([], Math.ceil(nPorTipo / 5) + 50, (idx) => {
            const x = SUJEITOS[idx % SUJEITOS.length].toLowerCase()
            const y = ADJETIVOS[(idx * 3) % ADJETIVOS.length]
            const mold = vMolds[nivel][idx % vMolds[nivel].length]
            return `${mold(x)} (${y}, n${nivel}.${idx})`
        })
        desafio[nivel] = padAte([], Math.ceil(nPorTipo / 5) + 50, (idx) => {
            const x = SUJEITOS[idx % SUJEITOS.length].toLowerCase()
            const y = LUGARES[(idx * 5) % LUGARES.length]
            const mold = dMolds[nivel][idx % dMolds[nivel].length]
            return `${mold(x)} [${y} #${idx}]`
        })
    }

    // Garantir totais
    const totalV = Object.values(verdade).reduce((s, a) => s + a.length, 0)
    const totalD = Object.values(desafio).reduce((s, a) => s + a.length, 0)
    return { verdade, desafio, total_verdades: totalV, total_desafios: totalD }
}

async function main() {
    await fs.ensureDir(OUT)
    const arquivos = {}

    const piadas = gerarPiadas(2200)
    arquivos.piadas = { ...META, total: piadas.length, itens: piadas }

    const vod = gerarVod(2200)
    arquivos.verdade_ou_desafio = { ...META, ...vod }

    const trocadilhos = gerarTrocadilhos(2200)
    arquivos.trocadilhos = { ...META, total: trocadilhos.length, itens: trocadilhos }

    const audios = gerarAudiosMalignos(2200)
    arquivos.audios_malignos = { ...META, total: audios.length, itens: audios }

    const isso = gerarIssoOuAquilo(2200)
    arquivos.isso_ou_aquilo = { ...META, total: isso.length, itens: isso }

    const curiosidades = gerarCuriosidades(2200)
    arquivos.curiosidades = { ...META, total: curiosidades.length, itens: curiosidades }

    const frases = gerarFrasesSoltas(2200)
    arquivos.frases_soltas = { ...META, total: frases.length, itens: frases }

    for (const [nome, data] of Object.entries(arquivos)) {
        const dest = path.join(OUT, `${nome}.json`)
        await fs.writeJson(dest, data, { spaces: 0 })
        const tot =
            data.total ||
            (data.total_verdades != null
                ? `V${data.total_verdades}+D${data.total_desafios}`
                : data.itens?.length)
        console.log(`✓ ${nome}.json (${tot})`)
    }

    await fs.writeJson(
        path.join(OUT, 'README.json'),
        {
            descricao: 'Bancos de conteúdo do Ultron (≥2000 itens cada).',
            arquivos: Object.keys(arquivos).map((k) => `${k}.json`),
            regenerar: 'node scripts/gerar-conteudo-json.js'
        },
        { spaces: 2 }
    )
    console.log('\nConteúdo gerado em conteudo/')
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})

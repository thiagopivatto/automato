/**
 * Banco de Verdades e Desafios com níveis NSFW 1–5.
 * 1 = leve/seguro · 5 = explícito adulto
 */
const banco = {
    verdade: {
        1: [
            'Qual foi a última mentira “inofensiva” que você contou?',
            'Quem do grupo você acha mais engraçado(a) e por quê?',
            'Qual hábito seu te deixa com vergonha?',
            'Se tivesse que trocar de nome, qual escolheria?',
            'Qual é o seu maior medo infantil até hoje?',
            'Quem aqui você pediria ajuda primeiro numa emergência?',
            'Qual série você fingiu ter assistido?',
            'Qual comida você odeia em silêncio?'
        ],
        2: [
            'Já se apaixonou por alguém do grupo? Se sim, quem?',
            'Qual foi o flerte mais constrangedor da sua vida?',
            'Qual é o seu “tipo” (sem censura leve)?',
            'Já stalkeou ex nas redes? Conte o nível da obsessão.',
            'Quem do grupo você considera mais “perigoso(a)” no bom sentido?',
            'Qual é a maior red flag que você ignora em alguém?',
            'Já mandou mensagem e se arrependeu imediatamente?',
            'Qual segredo bobo você guarda até hoje?'
        ],
        3: [
            'Qual foi o beijo mais intenso que você já teve?',
            'Já ficou com mais de uma pessoa no mesmo dia?',
            'Qual fantasia “picante” você nunca contou pra ninguém do grupo?',
            'Quem do grupo você beijaria agora se não houvesse consequência?',
            'Já mandou nudes? Arrependeu ou orgulhou?',
            'Qual parte do corpo das pessoas você olha primeiro?',
            'Já fez algo íntimo em lugar público (sem detalhes extremos)?',
            'Qual é a sua maior insegurança na cama / no flerte?'
        ],
        4: [
            'Descreva a experiência sexual mais memorável da sua vida (sem nomes se preferir).',
            'Qual fetiche você tem e esconde da maioria?',
            'Já fez ménage ou gostaria? Detalhe o porquê.',
            'Qual é a coisa mais ousada que já pediu pra alguém na cama?',
            'Quem do grupo você imaginaria numa situação +18 (só escolha, sem humilhar)?',
            'Já traiu ou foi traído? Como lidou?',
            'Qual app de relacionamento te deixou com mais histórias quentes?',
            'Conte um “quase” sexual constrangedor.'
        ],
        5: [
            'Descreva com detalhes a fantasia sexual mais explícita que você tem agora.',
            'Qual ato sexual você ama e acharia que o grupo ficaria chocado ao saber?',
            'Já gravou ou pediu conteúdo adulto? Conte a história sem filtro.',
            'Qual é o seu limite “hard” e o que você nunca faria?',
            'Roleplay: diga o cenário +18 mais intenso que te excita.',
            'Conte a experiência mais selvagem (e consensual) da sua vida adulta.',
            'Qual palavrão/frase suja te deixa imediatamente no clima?',
            'Se pudesse passar uma noite sem regras com alguém famoso, o que faria (explícito)?'
        ]
    },
    desafio: {
        1: [
            'Mande um áudio cantando o refrão de uma música aleatória.',
            'Troque a foto de perfil por 10 minutos por um meme.',
            'Elogie a próxima pessoa que falar no grupo.',
            'Fale só com emojis nas próximas 3 mensagens.',
            'Conte uma piada ruim de propósito.',
            'Envie uma selfie fazendo cara engraçada.',
            'Escreva seu nome com o cotovelo (ou digite mal de propósito) e mande.',
            'Mande “bom dia” mesmo que seja de noite.'
        ],
        2: [
            'Declare “amor eterno” (de brincadeira) pra alguém do grupo em voz.',
            'Mande um status/recado flertando com o grupo por 5 minutos.',
            'Peça a alguém do grupo para te dar uma nota de 0 a 10 no charme.',
            'Invente uma cantada péssima e mande no grupo.',
            'Deixe alguém escolher um emoji; use só ele por 5 mensagens.',
            'Grave um áudio imitando alguém do grupo (sem ofender).',
            'Poste no status “estou disponível” por 10 minutos.',
            'Mande 3 qualidades e 1 “defeito gostoso” de alguém (leve).'
        ],
        3: [
            'Mande um áudio “sexy” (sem nudez) lendo uma cantada.',
            'Descreva um beijo imaginário com alguém do grupo (sem forçar a pessoa).',
            'Troque a foto por algo mais “ousado” (ainda seguro) por 15 minutos.',
            'Peça um “sim ou não” íntimo leve pra 2 pessoas do grupo.',
            'Mande um texto de boa noite flertante genérico.',
            'Faça 10 polichinelos e mande áudio ofegante (com humor).',
            'Conte um crush antigo em voz alta no áudio.',
            'Escreva um mini bilhete +18 leve dedicado ao grupo.'
        ],
        4: [
            'Descreva em texto uma cena +18 curta (consensual) envolvendo “alguém imaginário”.',
            'Mande um áudio falando seu fetiche favorito sem rodeios.',
            'Crie uma cantada explícita e mande no grupo.',
            'Faça um desafio: peça pra alguém te dar uma ordem picante (texto) e cumpra se for confortável.',
            'Roleplay curto (5 linhas) em tom adulto no chat.',
            'Confesse o lugar mais indecente onde já pensou em ficar com alguém.',
            'Envie um elogio bem corporal (respeitoso, mas +18) a alguém que aceite.',
            'Liste 3 coisas que te deixam no clima imediatamente.'
        ],
        5: [
            'Escreva um microconto erótico de 8–12 linhas e mande no grupo.',
            'Áudio explícito: narre uma fantasia completa (sem envolver ninguém sem consentimento).',
            'Desafio hard: peça um “verdade +18” a 3 pessoas e responda o seu também.',
            'Descreva o que você faria numa noite sem limites (explícito, consensual, fictício).',
            'Crie um “cardápio” de atos +18 que você topa e não topa.',
            'Roleplay explícito de 10 linhas com personagem fictício.',
            'Mande a frase mais suja que você já falou (ou falaria) na cama.',
            'Invente um desafio +18 para a próxima pessoa (ela pode recusar).'
        ]
    }
}

export function obterVerdadeOuDesafio(tipo, nivel) {
    const t = String(tipo || '').toLowerCase()
    const n = Math.min(5, Math.max(1, Number(nivel) || 1))
    const chave = ['verdade', 'vdd', 'truth', 'v'].includes(t)
        ? 'verdade'
        : ['desafio', 'dsf', 'dare', 'd'].includes(t)
          ? 'desafio'
          : Math.random() < 0.5
            ? 'verdade'
            : 'desafio'
    const lista = banco[chave][n] || banco[chave][1]
    const item = lista[Math.floor(Math.random() * lista.length)]
    return { tipo: chave, nivel: n, texto: item }
}

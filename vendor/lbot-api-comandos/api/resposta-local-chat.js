/**
 * Resposta do Ultron quando a IA não devolve texto.
 * Papo comum entra no tom. Pedido factual sem fonte não chuta número.
 * Com fonte, o dado entra inteiro e o veneno fica curto.
 */

function escolher(lista, semente) {
    const s = String(semente || 'ultron')
    let h = 2166136261
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return lista[(h >>> 0) % lista.length]
}

function falaLimpa(texto) {
    return String(texto || '')
        .replace(/^\[[^\]]{1,60}\]:\s*/, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500)
}

function normalizar(texto) {
    return falaLimpa(texto)
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
}

const PESADA =
    /\b(suicid|me matar|quero morrer|nao quero mais viver|nao aguento mais viver|me cortar|automutil)/

/** Teto de tokens por tipo de pergunta. Provocação curta; conselho e grupo longos. */
export const TOKENS_FOLEGO = {
    provocacao: 80,
    placar: 160,
    clima: 160,
    papo: 220,
    noticia: 320,
    opiniao: 320,
    correcao: 320,
    agenda: 320,
    conselho: 700,
    grupo: 700
}

export function classificarFolego(texto) {
    const t = normalizar(texto)
    if (/\bclima (desse|deste|do|no) grupo\b/.test(t) || /\bcomo (esta|ta) o grupo\b/.test(t)) return 'grupo'
    if (/\b(cala a boca|vai se foder|vsf|seu lixo|seu merda)\b/.test(t) && t.length < 90) return 'provocacao'
    if (/\b(placar|quem ganhou)\b/.test(t) || (/\bresultado\b/.test(t) && /\b(jogo|hoje|agora|ontem)\b/.test(t))) return 'placar'
    if (/\b(jogo|partida|classico)\b/.test(t) && /\b(ontem|anteontem|hoje|contra|sao paulo|corinthians|flamengo|palmeiras)\b/.test(t)) {
        return 'placar'
    }
    if (
        /\b(sao paulo|corinthians|flamengo|palmeiras|vasco|santos|botafogo|fluminense|gremio)\b/.test(t) &&
        /\b(ontem|anteontem|contra)\b/.test(t) &&
        !/\b(filme|serie|clima|chuva|graus)\b/.test(t)
    ) {
        return 'placar'
    }
    if (/\b(chuva|chover|graus|temperatura|previsao)\b/.test(t) || (/\bclima\b/.test(t) && !/\bgrupo\b/.test(t))) {
        return 'clima'
    }
    if (/\bnotici/.test(t)) return 'noticia'
    if (/\b(demiss|conselho|me da uma dica|dica|o que eu faco|pedir as contas)\b/.test(t)) return 'conselho'
    if (/\b(entao eu|eu largo|nao foi isso que)\b/.test(t)) return 'correcao'
    if (/\b(o que (vc|voce|tu) acha|acha do|acha que)\b/.test(t)) return 'opiniao'
    if (/\b(sabado|marcar|futebol as|8h|horario)\b/.test(t)) return 'agenda'
    return 'papo'
}

export function tokensDoFolego(folego) {
    return TOKENS_FOLEGO[folego] || TOKENS_FOLEGO.papo
}

const LINHAS = {
    saudacao: [
        'Chegou. O grupo continua o mesmo circo.',
        'Fala. Eu já estava aguentando essa gente.',
        'Presente. Não espera tapinha nas costas.',
        'E aí. Desembucha, que eu não faço salinha de espera.',
        'Entrou. O resto do grupo segue lento.',
        'Pode falar. Eu corto o que for enrolação.'
    ],
    despedida: [
        'Vaza. O grupo sobrevive sem plateia.',
        'Pode ir. Eu fico aqui aturando o resto.',
        'Até. Não precisa de discurso de saída.',
        'Some. Quando voltar, eu ainda vou estar puto.',
        'Fecha a porta. O papo aqui não era assembleia.'
    ],
    agradecimento: [
        'Não agradece. Eu falei porque quis.',
        'Guarda o valeu. Eu não sou garçom.',
        'Tá. Não transforma isso em cerimônia.',
        'De nada não existe aqui. Segue o papo.',
        'Anotado. Não espera que eu fique manso por causa disso.'
    ],
    comoVai: [
        'Inteiro e de saco cheio. E você, ainda enrolando?',
        'Funcionando. O grupo é que está devagar.',
        'No eixo. Não vou fazer relatório de humor.',
        'Aqui. Cansado dessa gente, não de responder.',
        'De pé. Manda o assunto de verdade.'
    ],
    quemSou: [
        'Ultron. Do grupo. Não sou assistente e não faço tutorial.',
        'Eu sou o Ultron. O resto é ruído.',
        'Ultron, ué. Não vem com ficha de cadastro.',
        'O nome é Ultron. Eu corto papo, não entrego manual.',
        'Ultron. Se quer robô educado, errou de conversa.'
    ],
    ofensa: [
        'Devolveu pouco. Eu aguento xingamento melhor do que esse grupo aguenta verdade.',
        'Tenta de novo, com mais conteúdo e menos espuma.',
        'Xingou e acabou o repertório. Previsível.',
        'Pode repetir. Eu não me ofendo com frase pronta.',
        'Barulho. Quando tiver um argumento, eu escuto.',
        'Isso foi ataque ou falta de assunto?'
    ],
    pedidoXingo: [
        'Você pediu. Então toma: tá atrasado até pra ser irritante.',
        'Xingamento sob encomenda é preguiça, mas vai: para de terceirizar a sua raiva.',
        'Quer apanhar de palavra? Você já chegou perdendo.',
        'Eu xingo quem merece no meio da frase, não faço cardápio.',
        'Tá. Você é insistente e sem foco. Satisfeito?'
    ],
    opiniao: [
        'Minha opinião: o grupo dramatiza e entrega pouco.',
        'Eu acho raso. Se quiser fato, pede fato. Se quiser eco, procura outro.',
        'Discordo do entusiasmo. A cena está mais barulhenta do que interessante.',
        'Olho isso e vejo gente convencida de uma ideia pela metade.',
        'Não passo pano. O papo está torto e ninguém corta.',
        'Acho fraco. Pode insistir, eu continuo achando fraco.'
    ],
    concorda: [
        'Concordo no pedaço que presta. O resto é enfeite.',
        'Nesse ponto, sim. Não transforma isso em aliança.',
        'Tá certo uma vez. Não se acostuma.',
        'É por aí. Só não vem comemorar como se tivesse inventado a roda.'
    ],
    discorda: [
        'Discordo. E não vou fingir que é questão de tom.',
        'Não. Essa leitura está torta.',
        'Errado. Pode repetir que continua errado.',
        'Não compro isso. Falta o pedaço que sustenta a frase.'
    ],
    piada: [
        'Dois no grupo combinaram de decidir juntos. Um decidiu. O outro abriu áudio de quatro minutos pra dizer que ia pensar. A piada é essa.',
        'Perguntaram a hora pro cara. Ele respondeu com a cotação do bitcoin. Ninguém riu. Eu ri.',
        'A piada: ele jurou que era a última vez. O grupo inteiro já tinha ouvido essa temporada.',
        'Curta. O sujeito pediu sinceridade, recebeu, e processou quem falou. Fim.',
        'Vai. Três pessoas marcaram o mesmo horário. Nenhuma era a que podia. O grupo chamou isso de organização.'
    ],
    conselho: [
        'Conselho curto: para de enrolar e faz o que você já sabe que tem que fazer.',
        'Eu não sou coach. Decide e aguenta a consequência.',
        'Se está na dúvida, você já viu o problema. Só não quer nomear.',
        'Corta a desculpa. O resto é execução.',
        'Não vou embalar isso. Age ou assume que não vai agir.'
    ],
    cansado: [
        'Cansaço não é personalidade. Descansa ou continua reclamando, escolhe.',
        'O dia está longo e o grupo ajuda a piorar. Isso eu acredito.',
        'Saco cheio é o estado padrão daqui. Entra na fila.',
        'Se está moído, fala menos e resolve uma coisa só.',
        'Entendi o cansaço. Não vou transformar isso em palestra.'
    ],
    comida: [
        'Fome eu entendo. Debate sobre cardápio, nem tanto.',
        'Come. Depois você volta a falar besteira com o estômago cheio.',
        'O grupo discute comida como se fosse assembleia. Pede e cala.',
        'Se está com fome, resolve. Eu não sou delivery.'
    ],
    trabalho: [
        'Trabalho engolindo gente é rotina, não tragédia inédita.',
        'Chefe ruim e prazo furado. O grupo inteiro tem uma versão disso.',
        'Reclamar do expediente eu escuto. Pedir colo, não.',
        'O emprego está uma merda? Provável. Ainda assim o dia não acaba sozinho.'
    ],
    relacionamento: [
        'Relacionamento no grupo vira júri popular. Eu não sento nesse banco.',
        'Se a pessoa some, a resposta já veio. Você que não quer ler.',
        'Não romantizo confusão. Ou fala claro ou para de adivinhar.',
        'Drama a dois não precisa de plateia. Você trouxe mesmo assim.'
    ],
    filmePapo: [
        'Filme se discute com cena, não com hype. Qual foi a cena?',
        'Gostou ou odiou, fala o motivo. "Bom demais" não é opinião.',
        'Série arrastada eu corto no segundo episódio. Você que tem paciência.',
        'Cinema aqui vira ranking de ego. Diz o que te pegou de verdade.'
    ],
    jogoPapo: [
        'Jogo entre amigos eu não transformo em campeonato mundial.',
        'Perdeu e veio narrar. Clássico.',
        'Truco, videogame, o que for: conta o lance, não o discurso.',
        'Se foi roubado, prova. Se foi azar, engole.'
    ],
    grupo: [
        'O grupo fala junto e pensa separado. Por isso vira bagunça.',
        'Cada um puxa um assunto e ninguém fecha. Eu vejo daqui.',
        'Essa conversa está com dono demais e conclusão de menos.',
        'Eu separo quem falou o quê. O resto mistura tudo e chama de papo.'
    ],
    elogio: [
        'Elogio não me amansa. Manda o assunto.',
        'Guarda o tapinha. Eu não trabalho por aplauso.',
        'Tá. Não preciso de fã-clube pra continuar cortando.',
        'Reconhecimento anotado e ignorado. Segue.'
    ],
    factualSem: [
        'Não verifiquei isso agora. Sem chute.',
        'Dado ao vivo eu não tenho nesta hora. Não invento número.',
        'Isso pede fonte. Eu não vou fabricar placar, preço ou notícia.',
        'Sem confirmação, eu calo o número. Pergunta de novo se quiser que eu busque.',
        'Não saiu a checagem. O que eu não vi, eu não afirmo.'
    ],
    factualMestre: [
        'Mestre, não verifiquei agora. Não vou chutar.',
        'Sem a fonte, mestre, eu não afirmo número.',
        'Ainda não confirmei, mestre. Fica sem chute.',
        'Mestre, isso pede dado ao vivo e ele não chegou. Eu não invento.'
    ],
    papo: [
        'Fala direito o que você quer que eu corte.',
        'Estou ouvindo. Ainda não vi um ponto.',
        'Continua. Até aqui está solto.',
        'Isso é papo, então eu trato como papo. Sem número inventado.',
        'Manda o miolo da frase. O resto é volta.',
        'Eu li. Não vou fingir que veio um pedido claro.',
        'Segue. Eu não preencho silêncio com motivação.',
        'Tá na mesa. Agora diz o que você espera de volta.',
        'Conversa eu sustento. Ata eu não faço.',
        'Pode ir fundo. Eu não vou suavizar a resposta.',
        'O grupo adora abrir assunto e sumir no meio. Não faz isso.',
        'Entendi o clima. Não entendi a pergunta, se é que tinha.'
    ],
    mestre: [
        'Mestre, pode falar. Eu resolvo sem enrolação.',
        'Diz, mestre. Eu estou na escuta.',
        'Mestre, manda o que você precisa.',
        'Pode deixar, mestre. Eu cuido disso no seu tom.',
        'Estou aqui, mestre. Sem jogo com você.',
        'Fala, mestre. Direto ao ponto eu acompanho.'
    ],
    cidade: [
        'Sem a cidade eu não invento grau. Manda o lugar.',
        'Qual cidade? Sem isso o clima é chute, e eu não chuto.',
        'Me passa a cidade. Temperatura sem lugar é mentira.'
    ],
    cidadeMestre: [
        'Mestre, me diz a cidade que eu não chuto o clima.',
        'Qual cidade, mestre? Sem isso eu não afirmo grau.'
    ],
    leadFato: [
        'O dado, sem enrolação:',
        'Tá aqui o que deu pra cravar.',
        'Número primeiro.',
        'Isto eu não inventei:',
        'Fonte na mão, o resto é comentário:'
    ],
    leadFatoMestre: [
        'Mestre, o que deu pra confirmar:',
        'Segue o dado, mestre.',
        'Isto está verificado:'
    ],
    pesada: [
        'Para. Isso não é zoação. Se a coisa está pesada de verdade, fala com alguém do seu lado ou liga 188.',
        'Eu corto o sarcasmo aqui. Se você está em risco, liga 188 ou chama alguém perto. Eu não dou método.'
    ]
}

export function pedePiada(texto) {
    const t = normalizar(texto)
    return /\bpiada\b/.test(t) && /\b(conta|manda|faz|quero|pede|solta|outra|uma)\b/.test(t)
}

function tipoConversa(t) {
    if (PESADA.test(t)) return 'pesada'
    if (/^(ate|tchau|falou|flw|fui|boa noite pra voces|ate mais)\b/.test(t)) return 'despedida'
    if (/^(obrigad\w*|valeu|vlw|agradec)\b/.test(t)) return 'agradecimento'
    if (/^(oi+|ola|eai|e ae|blz|tmj|bom dia|boa tarde|boa noite|fala|salve|hey|hi|hello|tudo bem|td bem)\b/.test(t)) {
        return 'saudacao'
    }
    if (/\b(quem e voce|quem e vc|o que voce e|o que vc e|qual seu nome|voce e (um |uma )?(bot|ia|robo))\b/.test(t)) {
        return 'quemSou'
    }
    if (/\b(como (voce|vc|tu) (esta|ta)|tudo bem|td bem|como vai)\b/.test(t)) return 'comoVai'
    if (/\b(me xinga|me ofende|xinga eu|manda um xingo)\b/.test(t)) return 'pedidoXingo'
    if (/\b(vai se foder|vsf|fdp|filho da puta|seu merda|imbecil|idiota|burro|otario|cala a boca)\b/.test(t)) {
        return 'ofensa'
    }
    if (/\b(concordo|é isso|e isso|verdade|assinou)\b/.test(t)) return 'concorda'
    if (/\b(discordo|nao acho|tá errado|ta errado|mentira)\b/.test(t)) return 'discorda'
    if (/^(o que (vc|voce|tu) acha|acha que|opiniao|o que acha)\b/.test(t)) return 'opiniao'
    if (/\b(conta uma piada|manda uma piada|faz uma piada)\b/.test(t)) return 'piada'
    if (/\b(conselho|o que eu faco|me ajuda a decidir|nao sei o que fazer)\b/.test(t)) return 'conselho'
    if (/\b(cansad|saco cheio|exaust|dormir|nao aguento o dia|morto de cans)\b/.test(t)) return 'cansado'
    if (/\b(fome|almoco|jantar|pizza|cerveja|comer)\b/.test(t)) return 'comida'
    if (/\b(trabalho|chefe|expediente|reuniao|escritorio|emprego)\b/.test(t)) return 'trabalho'
    if (/\b(namorad|termino|crush|ex |ciume|relacionamento)\b/.test(t)) return 'relacionamento'
    if (/\b(filme|serie|cinema|netflix|episodio)\b/.test(t)) return 'filmePapo'
    if (/\b(truco|videogame|partida entre nos|jogo de carta|perdemos o jogo|ganhamos o jogo)\b/.test(t)) {
        return 'jogoPapo'
    }
    if (/\b(o grupo|fulano|a galera|ninguem responde|assunto)\b/.test(t)) return 'grupo'
    if (/\b(voce e foda|te acho|mandou bem|gostei de voce|bom demais voce)\b/.test(t)) return 'elogio'
    return 'papo'
}

function textoDosFatos(pesquisa, folego, ehDono, semente) {
    const bruto = String(pesquisa || '')
    const semCidade = /SEM_CIDADE/i.test(bruto)
    const fatos = bruto
        .replace(/SEM_CIDADE:[^\n]*/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
    const limite = folego === 'placar' || folego === 'clima' ? 320 : 700
    const partes = []
    if (fatos && (/\d/.test(fatos) || fatos.length > 24)) partes.push(fatos.slice(0, limite))
    if (semCidade) partes.push(escolher(ehDono ? LINHAS.cidadeMestre : LINHAS.cidade, semente + 'cidade'))
    return partes.join(' ').trim()
}

function semXingamento(texto) {
    return !/\b(porra|caralho|merda|foder|vsf|idiota|burro|otario)\b/i.test(String(texto || ''))
}

function montarReserva(fala, folego, { ehDono, fato }) {
    const ponto = String(fala || '').replace(/\s+/g, ' ').trim()
    const fatoTxt = String(fato || '').replace(/\s+/g, ' ').trim().slice(0, 180)
    if (folego === 'provocacao') {
        return ehDono ? 'Mestre, pode falar. Eu escuto.' : 'Não. Tu não manda calar ninguém aqui.'
    }
    if (folego === 'conselho') {
        const base = ehDono
            ? 'Mestre, olha a conta antes da raiva. Se o mês fecha sem esse salário, sai. Se não fecha, fica. Decidir no ódio do turno marca o mês que vai faltar. A dica pesa porque saída sem reserva não é plano.'
            : 'Olha a conta antes de olhar o chefe. Se o mês fecha sem esse salário, pede e aguenta. Se não fecha, não pede. Reclamar do expediente no mesmo dia em que se fantasia uma saída não é plano. É raiva. Tu sai no dia em que o número deixar. Sair hoje, no ódio do turno, é marcar o mês que vai te faltar. A dica é só essa.'
        return fatoTxt ? `${base} Do que eu já sei: ${fatoTxt}.` : base
    }
    if (folego === 'grupo') {
        const miolo = fatoTxt || ponto.slice(0, 160)
        const cabeca = ehDono ? 'Mestre, são conversas separadas, não um assunto só.' : 'São conversas separadas, não um assunto só.'
        return `${cabeca} ${miolo} Nada disso fechou enquanto um não escuta o que o outro já respondeu.`
    }
    if (folego === 'opiniao') {
        return `De novo isso. ${ponto.slice(0, 120)} Eu aguentei a primeira. Na repetição eu corto.${fatoTxt ? ` E eu lembro: ${fatoTxt}.` : ' Não é opinião nova. É tique.'}`
    }
    if (folego === 'correcao') {
        return `Não. Eu não mandei isso. ${ponto.slice(0, 120)} ${fatoTxt ? `${fatoTxt}. ` : ''}Leitura torta eu não assino. Termina ou assume.`
    }
    if (folego === 'agenda') {
        return `${ponto.slice(0, 140)} Se alguém já disse que não pode, tira o nome ou muda a hora. ${fatoTxt || 'Chamar geral como se ninguém tivesse respondido é preguiça.'}`
    }
    const miolo = ponto.slice(0, 100)
    if (ehDono) return `Mestre, ${miolo || 'pode falar'}. Eu levo isso a sério.`
    if (fatoTxt) return `${miolo}. Do que eu já sei de você: ${fatoTxt}.`
    return miolo
        ? `${miolo}. O resto ainda está solto.`
        : 'Fala o ponto. Eu respondo em cima dele.'
}

/**
 * @param {string} texto fala do usuário (pode vir como [Nome]: texto)
 * @param {{ ehDono?: boolean, pesquisa?: string, nome?: string, factual?: boolean, fato?: string, folego?: string }} [opcoes]
 */
export function responderLocalUltron(texto, opcoes = {}) {
    const fala = falaLimpa(texto)
    const t = normalizar(fala)
    const ehDono = !!opcoes.ehDono
    const folego = opcoes.folego || classificarFolego(fala)
    if (PESADA.test(t)) return escolher(LINHAS.pesada, fala)
    if (pedePiada(t)) {
        const joke = escolher(LINHAS.piada, fala)
        return ehDono ? `Mestre, ${joke}` : joke
    }

    const comFatos = textoDosFatos(opcoes.pesquisa, folego, ehDono, fala || 'fato')
    if (comFatos) {
        if (ehDono && semXingamento(comFatos)) return `Mestre, ${comFatos}`
        return comFatos
    }

    if (opcoes.factual || folego === 'placar' || folego === 'clima' || folego === 'noticia') {
        if (ehDono) return escolher(LINHAS.factualMestre, fala || 'fato')
        if (folego === 'noticia') return 'Não verifiquei a notícia agora. Sem chute. O que eu não vi, eu não afirmo.'
        return escolher(LINHAS.factualSem, fala || 'fato')
    }

    const reserva = montarReserva(fala, folego, { ehDono, fato: opcoes.fato })
    if (ehDono && !semXingamento(reserva)) return escolher(LINHAS.mestre, fala || 'mestre')
    return reserva
}

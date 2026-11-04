/** Metadados da categoria `utilidades` (gerado/fatiado de comandos.js). */
export function metaUtilidades({ prefixo, nome_adm, nome_bot }) {
    return {
            encurtar : {
                descricao: '',
                guia: `Ex: *${prefixo}encurtar* link - Encurta o link digitado.\n`,
                msgs: {
                    resposta : "✂️ ENCURTADOR DE LINKS ✂️\n\n"+
                    "*Link :* {p1}\n"
                }
            },
            upimg: {
                descricao: '',
                guia: `Ex: Envie/responda uma *imagem* com *${prefixo}upimg* - Faz upload da imagem e retorna o link.\n`,
                msgs: {
                    resposta : "🖼️ UPLOAD DE IMAGEM 🖼️\n\n"+
                    "*Link :* {p1}\n"
                }
            },
            filmes: {
                descricao: '',
                guia: `Ex: *${prefixo}filmes* - Exibe as tendências atuais de filmes.\n`,
                msgs: {
                    resposta : "🎬 TÊNDENCIAS DE FILMES 🎬\n\n"+
                    "{p1}\n"
                }
            },
            series: {
                descricao: '',
                guia: `Ex: *${prefixo}series* - Exibe as tendências atuais de séries.\n`,
                msgs: {
                    resposta : "📺 TÊNDENCIAS DE SÉRIES 📺\n\n"+
                    "{p1}\n"
                }
            },
            chat : {
                descricao: 'Conversa com o Ultron (!chat, @menção ou respondendo mensagem dele)',
                guia: `Ex: marque o bot *@Ultron* oi, tudo bem?\n`+
                `Ex: *responda uma mensagem do bot* com seu texto — ele continua a conversa\n`+
                `Ex: *@bot* o que rolou hoje na política?\n`+
                `Ex: *${prefixo}chat* faz o resumo do grupo → roda *${prefixo}resumodogrupo*\n`+
                `Ex: envie/responda uma *imagem* com *${prefixo}chat* o que é isso?\n`+
                `Personalidade deste chat: *${prefixo}personalidade*\n`+
                `Pesquisa na web só em perguntas de fato/atualidade.\n`,
                msgs: {
                    resposta: "{p1}"
                }
            },
            personalidade: {
                descricao: 'Personalidade do Ultron neste chat (grupo ou privado)',
                guia:
                    `Ex: *${prefixo}personalidade* fala como um tiozão fofoqueiro e chato\n` +
                    `Ex: *${prefixo}personalidade* ver — Mostra a atual\n` +
                    `Ex: *${prefixo}personalidade* padrão — Volta ao Ultron padrão\n` +
                    `Salva em arquivo *por chat* (grupo e PV separados). Vale para chat, resumo e automsg.\n` +
                    `Em grupo: *apenas admins*. No privado: você controla só o seu PV.\n`,
                msgs: {}
            },
            oquetemaqui: {
                descricao: 'Descreve o que tem na imagem marcada ou enviada',
                guia:
                    `Ex: Envie uma *imagem* com legenda *${prefixo}oquetemaqui*\n` +
                    `Ex: Responda uma *imagem* com *${prefixo}oquetemaqui*\n` +
                    `Ex: Responda uma imagem com *${prefixo}oquetemaqui* quem é essa pessoa?\n`,
                msgs: {
                    sem_imagem:
                        '[❗] Envie ou responda uma *imagem* com este comando.',
                    espera: '👀 Olhando a imagem…',
                    resposta: '🖼️ O que tem aqui:\n\n{p1}'
                }
            },
            tabela: {
                descricao: '',
                guia: `Ex: *${prefixo}tabela* - Exibe a tabela de letras para criação de nicks.\n`,
                msgs: {
                    resposta: "🤖 Tabela de Nicks :\n\n"+
                    "{p1}"
                }
            },
            rbg: {
                descricao: '',
                guia: `Ex: Envie/responda uma *imagem* com *${prefixo}rbg* - Remove o fundo (PNG transparente).\n\n`,
                msgs: {
                    invalido: "[❗] Este comando só funciona com IMAGENS.",
                    espera: "[AGUARDE] 📸 O fundo da imagem está sendo removido.",
                }
            },
            ouvir: {
                descricao: 'Transcreve áudio respondido em texto',
                guia: `Ex: Responda um áudio com *${prefixo}ouvir* para transformar em texto.\n`,
                msgs: {
                    erro_limite: "[❗] Houve um erro na transcrição, o áudio ultrapassa *40m*",
                    sucesso: "🔤 Transcrição de áudio :\n\n"+
                    "-- {p1}"
                }
            },
            audio: {
                descricao: '',
                guia: `Responda um aúdio com um desses comandos :\n\n`+
                `Ex: *${prefixo}audio* grave - Torna audio mais grave e lento\n\n`+
                `Ex: *${prefixo}audio* agudo - Torna o audio mais agudo e rapido\n\n`+
                `Ex: *${prefixo}audio* estourar - Deixa o audio estourado\n\n`+
                `Ex: *${prefixo}audio* volume  - Aumenta o volume em 4 vezes\n\n`+
                `Ex: *${prefixo}audio* x2 - Acelera o audio em 2 vezes\n\n`+
                `Ex: *${prefixo}audio* reverso - Reverte o audio\n\n`+
                `*Obs*: Este comando funciona apenas com *AUDIOS*.\n`,
                msgs: {
                    erro_conversao: "[❗] Houve um erro na conversão de audio"
                }
            },
            traduz: {
                descricao: '',
                guia: `Ex: *${prefixo}traduz* pt texto - Traduz o texto que foi digitado para *Português*.\n\n`+
                `Ex: *${prefixo}traduz* en texto - Traduz o texto que foi digitado para *Inglês*.\n\n`+
                `Ex: Responda um *texto* com *${prefixo}traduz* pt - Traduz o resto respondido para *Português*.\n\n`+
                `Ex: Responda um *texto* com *${prefixo}traduz* en - Traduz o resto respondido para *Inglês*.\n\n`+
                `Idiomas suportados : \n`+
                `- 🇧🇷 Português (pt)\n`+
                `- 🇺🇸 Inglês (en)\n`+
                `- 🇯🇵 Japonês (ja)\n`+
                `- 🇮🇹 Italiano (it)\n`+
                `- 🇪🇸 Espanhol (es)\n`+
                `- 🇷🇺 Russo (ru)\n`+
                `- 🇰🇷 Coreano (ko)\n`,
                msgs: {
                    nao_suportado: "[❗] Sem dados do idioma ou idioma não suportado. Atualmente suportamos :\n\n"+
                    `- 🇧🇷 Português - ${prefixo}traduz pt\n`+
                    `- 🇺🇸 Inglês - ${prefixo}traduz en\n`+
                    `- 🇯🇵 Japonês - ${prefixo}traduz ja\n`+
                    `- 🇮🇹 Italiano - ${prefixo}traduz it\n`+
                    `- 🇪🇸 Espanhol - ${prefixo}traduz es\n`+
                    `- 🇷🇺 Russo - ${prefixo}traduz ru\n`+
                    `- 🇰🇷 Coreano - ${prefixo}traduz ko\n`,
                    resposta: "🔠 *Resposta - Tradução* 🔠 :\n\n"+
                    "*Texto*: {p1}\n\n"+
                    "*Tradução* : {p2}"
                }
            },
            voz: {
                descricao: '',
                guia: `Ex: *${prefixo}voz* texto - Fala em *pt-BR* (padrão).\n\n`+
                `Ex: *${prefixo}voz* en Hello world\n\n`+
                `Ex: Responda uma mensagem com *${prefixo}voz* - Detecta o idioma e narra.\n\n`+
                `Ex: Responda com *${prefixo}voz* en - Força inglês.\n\n`+
                `Idiomas: pt, en, ja, es, it, ru, ko, sv, fr, de, zh, ar, hi\n`+
                `Usa *ElevenLabs* (ELEVENLABS_API_KEY) com fallbacks.\n`,
                msgs: {
                    texto_vazio : '[❗] Tu é idiota, cadê o texto do comando?',
                    texto_longo: '[❗] Texto muito longo (máx. 4000 caracteres).',
                    erro_audio: "[❗] Houve um erro na criação do áudio",
                    nao_suportado: "[❗] Sem dados do idioma ou idioma não suportado. Atualmente suportamos :\n\n"+
                    `- 🇧🇷 Português - ${prefixo}voz pt\n`+
                    `- 🇺🇸 Inglês - ${prefixo}voz en\n`+
                    `- 🇯🇵 Japonês - ${prefixo}voz ja\n`+
                    `- 🇮🇹 Italiano - ${prefixo}voz it\n`+
                    `- 🇪🇸 Espanhol - ${prefixo}voz es\n`+
                    `- 🇷🇺 Russo - ${prefixo}voz ru\n`+
                    `- 🇰🇷 Coreano - ${prefixo}voz ko\n`+
                    `- 🇸🇪 Sueco - ${prefixo}voz sv\n`
                }
            },
            letra: {
                descricao: '',
                guia: `Ex: *${prefixo}letra* nome-musica - Exibe a letra da música que você digitou.\n`,
                msgs: {
                    resposta : "🎼 LETRA DE MÚSICA 🎼\n\n"+
                    "Música : *{p1}*\n"+
                    "Artista : *{p2}*\n\n"+
                    "{p3}"
                }
            },
            rastreio: {
                descricao: '',
                guia: `Ex: *${prefixo}rastreio* PBXXXXXXXXXXX - Exibe o rastreio da encomenda dos correios que você digitou.\n`,
                msgs: {
                    codigo_invalido : '[❗] Código de rastreio deve ter 13 digitos.',
                    resposta_titulo: "📦📦*RASTREIO*📦📦\n\n",
                    resposta_itens: "Status : {p1}\n"+
                    "Data : {p2}\n"+
                    "Hora : {p3}\n"+
                    "{p4}\n"
                }
            },
            calc: {
                descricao: '',
                guia: `Ex: *${prefixo}calc* 8x8 - Exibe o resultado do cálculo.\n\n`+
                `Ex: *${prefixo}calc* 1mm em 1km - Exibe o resultado do conversão de medidas.\n`,
                msgs: {
                    resposta: "🧮 O resultado é *{p1}* "
                }
            },
            pesquisa: {
                descricao: '',
                guia: `Ex: *${prefixo}pesquisa* tema - Pesquisa com Perplexity (RapidAPI).\n`+
                `Requer *RAPIDAPI_KEY* no .env (subscribe em perplexity2).\n`,
                msgs: {
                    resposta_titulo: "🔎 Resultados da pesquisa de : *{p1}*🔎\n\n",
                    resposta_itens: "🔎 {p1}\n"+
                    "*Link* : {p2}\n\n"+
                    "*Descrição* : {p3}\n\n"
                }
            },
            moeda: {
                descricao: '',
                guia: `Ex: *${prefixo}moeda* real 20 - Converte 20 reais para outras moedas\n\n`+
                `Ex: *${prefixo}moeda* dolar 20 - Converte 20 dólares para outras moedas.\n\n`+
                `Ex: *${prefixo}moeda* euro 20 - Converte 20 euros para outras moedas.\n`,
                msgs: {
                    resposta_completa: "💵 Conversão - *{p1} {p2}*\n"+
                    "{p3}",
                    resposta_item:"----------------------------\n"+ 
                    "*Conversão* : {p1}\n"+
                    "*Valor convertido* : *{p2}* {p3}\n"+
                    "*Última atualização* : {p4}\n\n"
                }
            },
            clima: {
                descricao: '',
                guia: `Ex: *${prefixo}clima* Rio de Janeiro - Mostra o clima atual e dos próximos dias para o Rio de Janeiro.\n`,
                msgs: {
                    resposta: {
                        clima_atual: "☀️ CLIMA ATUAL ☀️\n\n"+
                        "Nome : {p1}\n"+
                        "Estado : {p2}\n"+
                        "País : {p3}\n"+
                        "Horário atual : {p4}\n"+
                        "Temperatura atual : {p5}\n"+
                        "Sensação térmica : {p6}\n"+
                        "Condição : {p7}\n"+
                        "Vento : {p8}\n"+
                        "Umidade : {p9}\n"+
                        "Nuvens : {p10}\n\n",
                        previsao:  "🗓️ Previsão {p1} 🗓️\n\n"+
                        "Max : {p2}\n"+
                        "Min : {p3}\n"+
                        "Condição : {p4}\n"+
                        "Vento máximo : {p5}\n"+
                        "Chuva? {p6} de chance\n"+
                        "Neve? {p7} de chance\n"+
                        "Nível UV : {p8}\n\n"
                    }
                }
            },
            ddd: {
                descricao: '',
                guia: `Ex: *${prefixo}ddd* 21 - Exibe qual estado e região do DDD 21.\n\n`+
                `Ex: Responda com *${prefixo}ddd* - Exibe qual estado e região do membro respondido.\n`,
                msgs: {
                    somente_br: "[❗] Esse comando só é aceito com números brasileiros.",
                    resposta: "📱 Estado : *{p1}* / Região : *{p2}*"
                }
            },
            qualmusica: {
                descricao: '',
                guia: `Ex: Envie/responda um audio/video com *${prefixo}qualmusica* - Procura a música tocada no audio/video.\n\n`+
                `*Obs*: Este comando funciona apenas com *AUDIO/VIDEO*.\n`,
                msgs: {
                    espera: "⏳ Em andamento , estou procurando sua música.",
                    resposta: "💿 Reconhecimento de Música\n\n"+
                    "Título: *{p1}*\n"+
                    "Produtora: {p2}\n"+
                    "Duração : *{p3}*\n"+
                    "Lançamento: *{p4}*\n"+
                    "Album: *{p5}*\n"+
                    "Artistas: *{p6}*\n",
                }
            }
        }
}

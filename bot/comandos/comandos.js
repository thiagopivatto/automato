export function comandosInfo(botInfo){
    let {prefixo, nome_adm, nome_bot} = botInfo
    const comandos = {
        //COMANDOS INFO
        info: {
            menu: {
                descricao: '',
                guia: `Ex: *${prefixo}menu* - Exibe o menu de comandos gerais.\n`,
                msgs: {
                    resposta_comum: "Olá, *{p1}*\n"+
                    "Tipo de Usuário : *{p2}*\n"+
                    "Comandos feitos : *{p3}*\n",
                    resposta_limite_diario: "Olá, *{p1}*\n"+
                    "Limite diário : *{p2}/{p3}*\n"+
                    "Tipo de Usuário : *{p4}*\n"+
                    "Comandos feitos : *{p5}*\n"
                }
            },
            reportar: {
                descricao: '',
                guia: `Ex: *${prefixo}reportar* mensagem - Reporta uma mensagem para a administração do Bot.\n`,
                msgs: {
                    sucesso: `✅ Obrigado, seu problema foi reportado com sucesso e será analisado pelo dono.`,
                    erro: '[❗] Não foi possível enviar a mensagem para o dono, pois ele ainda não está cadastrado.',
                    resposta: "[ 🤖 REPORTAR ⚙️]\n\n"+
                    "*Usuário* : {p1}\n"+
                    "*Contato* : http://wa.me/{p2}\n"+
                    "*Problema* : {p3}\n"
                }
            },
            sugerir: {
                descricao: '',
                guia:
                    `Ex: *${prefixo}sugerir* adicionar comando X - Envia sugestão de comando/correção.\n` +
                    `O dono vê a lista com *${prefixo}sugestoes*.\n`,
                msgs: {}
            },
            meusdados: {
                descricao: '',
                guia: `Ex: *${prefixo}meusdados* - Exibe seus dados gerais como comandos, mensagens, tipo de usuário, etc.\n`,
                msgs: {
                    resposta_geral: "[🤖*SEUS DADOS DE USO*🤖]\n\n"+
                    "Tipo de usuário : *{p1}*\n"+
                    "Nome : *{p2}*\n"+
                    "Total de comandos usados : *{p3}* comandos\n",
                    resposta_limite_diario: "Comandos usados hoje : *{p1}/{p2}*\n"+
                    "Limite diário : *{p3}*\n",
                    resposta_grupo: "Mensagens neste grupo : *{p1}* mensagens\n",
                }
            },
            info: {
                descricao: '',
                guia: `Ex: *${prefixo}info* - Exibe as informações do bot, dono, etc.\n`,
                msgs: {
                    resposta: "*Criador do Bot* : {p1}\n"+
                    "*Nome do bot* : {p2}\n"+
                    "*Online desde* : {p3}\n"+
                    "*Comandos executados* : {p4}\n"+
                    "*Versão atual* : {p6}\n"
                }
            }
        },
        //COMANDOS FIGURINHAS
figurinhas: {
            s: {
                descricao: '',
                guia: `Ex: Envie/responda uma *IMAGEM/VIDEO* com *${prefixo}s* - Transforma em sticker.\n`+
                `Ex: Envie/responda uma *IMAGEM* com *${prefixo}s 1* - Transforma em sticker circular.\n`+
                `Ex: Envie/responda uma *IMAGEM* com *${prefixo}s 2* - Transforma em sticker sem perder a proporção.\n`,
                msgs: {
                    erro_video : '[❗] Envie um video/gif com no máximo 8 segundos.',
                }
            },
            simg: {
                descricao: '',
                guia: `Ex: Responda um sticker com *${prefixo}simg* - Transforma o sticker em imagem.\n\n`+
                `*Obs*: Este comando funciona apenas com *STICKERS NÃO ANIMADOS*.\n`,
                msgs: {
                    erro_sticker: `[❗] Este comando é válido apenas para stickers.`
                }
            },
            emojimix: {
                descricao: '',
                guia: `Ex: *${prefixo}emojimix* 💩+😀 - Junta os dois emojis e transforma em sticker.\n\n`+
                `*Obs*: Nem todos os emojis são compátiveis, então vá tentando fazer combinações.\n`,
                msgs: {
                    erro: ''
                }
            },
            ssf: {
                descricao: '',
                guia: `Ex: Envie/responda uma *imagem* com *${prefixo}ssf* - Remove o fundo e cria sticker transparente.\n`,
                msgs: {}
            },
            snome: {
                descricao: '',
                guia: `Ex: Responda um *STICKER* com *${prefixo}snome* pack, autor - Renomeia o nome do pack e do autor do sticker.`,
                msgs: {
                    erro: ''
                }
            }
        },
        //COMANDOS UTILIDADES
        utilidades: {
            animes:{
                descricao: '',
                guia: `Ex: *${prefixo}animes* - Exibe os ultimos lançamentos de episódios de anime.\n`,
                msgs: {
                    resposta_titulo: '🇯🇵 LANÇAMENTO DE ANIMES 🇯🇵 \n\n',
                    resposta_item: '- Nome: {p1} \n'+
                    '- Episódio: {p2} \n'+
                    '- Link: {p3} \n\n',
                }
            },
            mangas:{
                descricao: '',
                guia: `Ex: *${prefixo}mangas* - Exibe os ultimos lançamentos de capitulos de mangá.\n`,
                msgs: {
                    resposta_titulo: '🇯🇵 LANÇAMENTO DE MANGÁS 🇯🇵 \n\n',
                    resposta_item: '- Nome: {p1} \n'+
                    '- Capítulo: {p2} \n'+
                    '- Link: {p3} \n\n',
                }
            },
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
                descricao: '',
                guia: `Ex: *${prefixo}chat* olá, tudo bem?\n`+
                `Conversa com IA *com memória* (últimas mensagens do seu chat).\n\n`+
                `*Recomendado:* configure *GEMINI_API_KEY* ou *OPENROUTER_API_KEY* no .env (grátis).\n`+
                `Sem chave, tenta Pollinations (pode falhar com limite 429).\n`,
                msgs: {
                    resposta: "{p1}"
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
                descricao: '',
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
            noticias: {
                descricao: '',
                guia: `Ex: *${prefixo}noticias* - Exibe as notícias atuais.\n`,
                msgs: {
                    resposta_titulo: "〘🗞️ ULTIMAS NOTÍCIAS 〙\n\n",
                    resposta_itens: "➥ 📰 *{p1}* \n"+
                    "Publicado por *{p2}* há *{p3}*\n"+
                    "*Link* : {p4}\n\n"
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
        },
        //COMANDOS IA
        ia: {
            comofaz: {
                descricao: '',
                guia: `Ex: *${prefixo}comofaz* - Busca um artigo aleatório do WikiHow (como fazer algo).\n`,
                msgs: {}
            },
            curiosidade: {
                descricao: '',
                guia: `Ex: *${prefixo}curiosidade* - Envia uma curiosidade aleatória.\n`,
                msgs: {}
            },
            playlist: {
                descricao: '',
                guia: `Ex: *${prefixo}playlist* descrição - Cria uma playlist com pelo menos 20 músicas baseada na descrição.\n`,
                msgs: {}
            },
            explica: {
                descricao: '',
                guia: `Ex: *${prefixo}explica* texto - Explica o texto com IA.\n`+
                `IA: ChatGPT-42 RapidAPI / Gemini / OpenRouter.\n`,
                msgs: {}
            },
            spoiler: {
                descricao: '',
                guia: `Ex: *${prefixo}spoiler* nome do filme - Revela spoiler do filme.\n`,
                msgs: {}
            },
            argumentos: {
                descricao: '',
                guia: `Ex: *${prefixo}argumentos* tema - Gera argumentos pró e contra.\n`,
                msgs: {}
            },
            proscons: {
                descricao: '',
                guia: `Ex: *${prefixo}proscons* produto - Lista prós e contras.\n`,
                msgs: {}
            },
            comparar: {
                descricao: '',
                guia: `Ex: *${prefixo}comparar* item1 vs item2 - Compara dois produtos/tecnologias.\n`,
                msgs: {}
            },
            cotacao: {
                descricao: '',
                guia: `Ex: *${prefixo}cotacao* PETR4 - Cotação B3/NASDAQ/NYSE/cripto.\n`+
                `Ex: *${prefixo}cotacao* BTC\nEx: *${prefixo}cotacao* AAPL\n`,
                msgs: {}
            },
            simulado: {
                descricao: '',
                guia: `Ex: *${prefixo}simulado* tema - Gera prova de 10 perguntas com gabarito no final.\n`,
                msgs: {}
            },
            roteiro: {
                descricao: '',
                guia: `Ex: *${prefixo}roteiro* tema - Cria roteiro para vídeo.\n`,
                msgs: {}
            },
            resuma: {
                descricao: '',
                guia: `Ex: Responda uma mensagem com *${prefixo}resuma* - Resume o texto marcado.\n`+
                `Ex: *${prefixo}resuma* texto longo...\n`,
                msgs: {}
            },
            criaimg: {
                descricao: '',
                guia: `Ex: *${prefixo}criaimg* prompt - Cria imagem via Pollinations AI.\n`+
                `Requer *POLLINATIONS_API_KEY* no .env.\n`,
                msgs: {}
            },
            criavideo: {
                descricao: '',
                guia: `Ex: *${prefixo}criavideo* prompt - Cria vídeo em slideshow com imagens IA (sem vídeo Pollinations).\n`,
                msgs: {}
            },
            i2i: {
                descricao: '',
                guia:
                    `Ex: Envie/responda uma imagem com *${prefixo}i2i* prompt - Image-to-image (Pollinations kontext).\n` +
                    `Ex: *${prefixo}i2i* estilo anime, luz neon\n`,
                msgs: {}
            },
            upscale: {
                descricao: '',
                guia: `Ex: Envie/responda uma imagem com *${prefixo}upscale* - Aumenta a resolução.\n`,
                msgs: {}
            },
            musica: {
                descricao: '',
                guia: `Ex: *${prefixo}musica* prompt - Gera música por IA (ElevenLabs).\n`,
                msgs: {}
            },
            vocalsonly: {
                descricao: '',
                guia: `Ex: Responda um áudio com *${prefixo}vocalsonly* - Isola vocais via UVR.\n`,
                msgs: {}
            },
            instrumentalonly: {
                descricao: '',
                guia: `Ex: Responda um áudio com *${prefixo}instrumentalonly* - Isola instrumental via UVR.\n`,
                msgs: {}
            },
            resumodogrupo: {
                descricao: 'Resumo sarcástico das últimas msgs em áudio (~3min)',
                guia:
                    `Ex: *${prefixo}resumodogrupo* - Resume as últimas mensagens em *nota de voz* (~3 min).\n` +
                    `TTS: ElevenLabs → Edge → OpenAI se a cota acabar.\n` +
                    `*Requisitos:* grupo; bot coletando mensagens.\n`,
                msgs: {}
            },
        },
        //COMANDOS DOWNLOADS
        downloads: {
            play: {
                descricao: '',
                guia: `Ex: *${prefixo}play* nome da música\n`+
                `Baixa o áudio do YouTube.\n\n`+
                `*Requisito:* ter o *yt-dlp* instalado (ou YTDLP_PATH no .env).\n`+
                `Windows: winget install yt-dlp\n`,
                msgs: {
                    espera: "[AGUARDE] 🎧 Sua música está sendo baixada e processada.\n\n"+
                    "Titulo: *{p1}*\n"+
                    "Duração: *{p2}*",
                    limite: "[❗] A música deve ter menos de *40 minutos*",
                    erro_live: "[❗] Houve um erro de download, o bot não aceita download de lives."
                }
            },
            yt: {
                descricao: '',
                guia: `Ex: *${prefixo}yt* nome do vídeo\n`+
                `Ex: *${prefixo}yt* https://youtu.be/xxxx\n`+
                `Baixa o vídeo do YouTube.\n\n`+
                `*Requisito:* *yt-dlp* instalado (veja o README).\n`,
                msgs: {
                    espera: "[AGUARDE] 🎥 Seu video está sendo baixado e processado.\n\n"+
                    "Titulo: *{p1}*\n"+
                    "Duração: *{p2}*",
                    limite: "[❗] O video deve ter menos de *40 minutos*",
                    erro_live: "[❗] Houve um erro de download, o bot não aceita download de lives."
                }
            },
            fb: {
                descricao: '',
                guia: `Ex: *${prefixo}fb* link - Faz download de um video do Facebook pelo link digitado e envia.\n`,
                msgs: {
                    espera: "[AGUARDE] 🎬 Sua mídia está sendo baixada e processada.\n\n"+
                    "Titulo: *{p1}*\n"+
                    "Duração: *{p2}*",
                    limite: "[❗] O video deve ter menos de *3 minutos*",
                }
            },
            ig: {
                descricao: '',
                guia: `Ex: *${prefixo}ig* link - Baixa foto/vídeo do Instagram.\n`+
                `Ex: *${prefixo}ig* link 2 - Baixa só a 2ª mídia do carrossel.\n\n`+
                `*Dica:* posts privados falham. Para posts públicos bloqueados, no \`.env\` use\n`+
                `\`YTDLP_COOKIES=caminho/cookies.txt\` ou \`YTDLP_BROWSER_COOKIES=chrome\` (Chrome logado no IG).\n`+
                `Opcional: \`COBALT_API_URL=https://sua-instancia\`.\n`,
                msgs: {
                    espera: "[AGUARDE] 🎬 Sua mídia está sendo baixada e processada.",
                }
            },
            tw: {
                descricao: '',
                guia: `Ex: *${prefixo}tw* link - Faz download de um video/imagem do Twitter pelo link digitado e envia.\n`,
                msgs: {
                    espera: "[AGUARDE] 🎬 Sua mídia está sendo baixada e processada.",
                }
            },
            tk: {
                descricao: '',
                guia: `Ex: *${prefixo}tk* link - Faz download de um video do Tiktok pelo link digitado e envia.\n`,
                msgs: {
                    espera: "[AGUARDE] 🎬 Sua mídia está sendo baixada e processada.\n\n"+
                    "Perfil: *@{p1}*\n"+
                    "Descrição: *{p2}*\n",
                }
            },
            img: {
                descricao: '',
                guia: `Ex: *${prefixo}img* tema - Envia uma imagem com o tema que você digitar.\n`,
                msgs: {
                    erro_imagem: '[❗] Não foi possível obter nenhuma imagem, tente novamente.',
                }
            }
        },
        //COMANDOS GRUPO
        grupo: {
            status: {
                descricao: '',
                guia: `Ex: *${prefixo}status* - Exibe as configurações atuais do grupo\n`,
                msgs: {
                    resposta_titulo: "[ 🤖 STATUS DO GRUPO 🤖 ]\n\n",
                    resposta_variavel: {
                        bemvindo:{
                            on: "Recurso Boas Vindas : ✅\n",
                            off: "Recurso Boas Vindas : ❌\n"
                        },
                        mutar:{
                            on: "Recurso Mutar : ✅\n",
                            off: "Recurso Mutar : ❌\n"
                        },
                        autosticker:{
                            on: "Recurso Auto-Sticker : ✅\n",
                            off: "Recurso Auto-Sticker : ❌\n"
                        },
                        autosimi:{
                            on: "Recurso Auto-Simi : ✅\n",
                            off: "Recurso Auto-Simi : ❌\n"
                        },
                        automsg:{
                            on: "Recurso Auto-Msg : ✅\n",
                            off: "Recurso Auto-Msg : ❌\n"
                        },
                        antilink:{
                            on: "Recurso Anti-Link : ✅\n",
                            off: "Recurso Anti-Link : ❌\n"
                        },
                        antifake:{
                            on: "Recurso Anti-Fake : ✅\n"+
                            "- *Liberados* : {p1}\n",
                            off: "Recurso Anti-Fake : ❌\n"
                        },
                        antiflood:{
                            on: "Recurso Anti-Flood : ✅\n"+
                            "- Máx: *{p1}* msgs / *{p2}* s \n",
                            off: "Recurso Anti-Flood : ❌\n"
                        },
                        contador:{
                            on: "Recurso Contador : ✅\n"+
                            "- {p1}\n",
                            off: "Recurso Contador : ❌\n"
                        },
                        bloqueiocmds:{
                            on: "Bloqueio de comandos : ✅\n"+
                            "- *{p1}*\n",
                            off: "Bloqueio de comandos : ❌\n"
                        },
                        listanegra: "Lista Negra : *{p1}*\n"
                    }
                }
            },
            fotogrupo: {
                descricao: '',
                guia: `Ex: Envie/responda uma *imagem* com *${prefixo}fotogrupo* - Altera a foto do grupo.\n\n`,
                msgs: {
                    sucesso: "🤖✅ A foto do GRUPO foi alterada com sucesso.",
                }
            },
            regras: {
                descricao: '',
                guia: `Ex: *${prefixo}regras* - Exibe a descrição/regras do grupo\n`,
                msgs: {
                    sem_descrição: "[❗] O grupo ainda não tem uma descrição."
                }
            },
            addlista: {
                descricao: '',
                guia: `Ex: Responda alguém com *${prefixo}addlista* - Adiciona o numero de quem foi respondido a lista negra e bane em seguida.\n\n`+
                `Ex: Marque alguém com *${prefixo}addlista* - Adiciona o numero de quem foi marcado a lista negra e bane em seguida.\n\n`+
                `Ex: *${prefixo}addlista* +55219xxxx-xxxx - Adiciona o número digitado a lista negra do grupo e bane em seguida.\n.`,
                msgs: {
                    sucesso: "✅ O número desse usuário foi adicionado á lista negra e será banido do grupo caso ainda esteja aqui.",
                    bot_erro: "[❗] Calma, você não pode adicionar o BOT a lista negra.",
                    admin_erro: "[❗] Calma, você não pode adicionar um ADMINISTRADOR a lista negra.",
                    ja_listado: "[❗] Este usuário já está na lista negra.",
                }
            },
            remlista: {
                descricao: '',
                guia: `Ex: *${prefixo}remlista* +55219xxxx-xxxx - Remove o número digitado da lista negra do grupo.\n`,
                msgs: {
                    sucesso: "✅ O número desse usuário foi removido da lista negra.",
                    nao_listado: "[❗] Este usuário não está na lista negra.",
                }
            },
            listanegra: {
                descricao: '',
                guia: `Ex: *${prefixo}listanegra* - Exibe a lista negra do grupo.\n`,
                msgs: {
                    motivo: "Banido por estar na LISTA NEGRA",
                    lista_vazia: "🤖 Não existe usuários na lista negra deste grupo.",
                    resposta_titulo: "╔══✪〘❌ Lista Negra 〙✪══\n╠\n",
                    resposta_itens: "╠➥ +{p1}\n"
                }
            },
            add: {
                descricao: '',
                guia: `Ex: *${prefixo}add* 5521xxxxxxxxx - Digite o numero com o código do país para adicionar a pessoa.\n\n`+
                `Ex: *${prefixo}add* 5521xxxxxxxxx, 5521xxxxxxxxx - Digite os numeros com o código do país (adiciona mais de uma pessoa no grupo).\n`,
                msgs: {
                    add_erro: "[❗] O número +{p1} não pode ser adicionado. Provavelmente está com privacidade ativada, já está no grupo ou o grupo não aceita mais membros.",
                    numero_invalido: "[❗] Houve um erro em adicionar o número {p1}, verifique se o número existe ou tente tirar o 9.",
                }
            },
            ban: {
                descricao: '',
                guia: `Ex: *${prefixo}ban* @membro - Para banir um membro marcando ele.\n\n`+
                `Ex: Responder alguém com *${prefixo}ban* - Bane a pessoa que você respondeu.\n`,
                msgs: {
                    banir_admin: "[❗] O bot não pode banir um administrador",
                    motivo: "Banimento manual",
                    banir_erro: "[❗] Não foi possível banir este membro, provavelmente ele já saiu do grupo."
                }
            },
            promover: {
                descricao: '',
                guia: `Ex: *${prefixo}promover* @membro - Promove o membro mencionado a *ADMINISTRADOR*.\n\n`+
                `Ex: Responder com *${prefixo}promover* - Promove o usuário respondido a *ADMINISTRADOR*.\n`,
                msgs: {
                    erro_bot: "[❗] O BOT não pode ser promovido por ele mesmo.",
                    sucesso_usuario: "➥ @{p1} virou *ADMINISTRADOR*.\n",
                    erro_usuario: "➥ @{p1} já é um *ADMINISTRADOR*.\n",
                    resposta: "[👤 PROMOVER MEMBROS 👤]\n\n"+
                    "{p1}"
                }
            },
            rebaixar: {
                descricao: '',
                guia: `Ex: *${prefixo}rebaixar* @admin - Rebaixa o administrador mencionado a *MEMBRO*.\n\n`+
                `Ex: Responder com *${prefixo}rebaixar* - Rebaixa o administrador respondido a *MEMBRO*.\n`,
                msgs: {
                    erro_bot: "[❗] O BOT não pode ser rebaixado por ele mesmo.",
                    sucesso_usuario: "➥ @{p1} virou *MEMBRO*.\n",
                    erro_usuario: "➥ @{p1} já é um *MEMBRO*.\n",
                    resposta: "[👤 REBAIXAR MEMBROS 👤]\n\n"+
                    "{p1}"
                }
            },
            mt: {
                descricao: '',
                guia: `Ex: *${prefixo}mt* - Marca todos os *MEMBROS/ADMIN* do grupo.\n\n`+
                `Ex: *${prefixo}mt* mensagem - Marca todos os *MEMBROS/ADMIN* do grupo com uma mensagem.\n`,
                msgs: {
                    resposta: "〘 🤖 Marquei os *{p1}* membros/admins 〙\n",
                    resposta_motivo: "〘 🤖 Marquei os *{p1}* membros/admins 〙\n\n"+
                    "Mensagem: *{p2}*\n"
                }
            },
            mm: {
                descricao: '',
                guia: `Ex: *${prefixo}mm* - Marca todos os *MEMBROS* do grupo.\n\n`+
                `Ex: *${prefixo}mm* mensagem - Marca todos os *MEMBROS* do grupo com uma mensagem.\n`,
                msgs: {
                    resposta: "〘 🤖 Marquei os *{p1}* membros 〙\n",
                    resposta_motivo: "〘 🤖 Marquei os *{p1}* membros 〙\n\n"+
                    "Mensagem: *{p2}*\n",
                    sem_membros: "[❗] Não existem membros comuns para serem marcados.\n",
                }
            },
            mta: {
                descricao: '',
                guia: `Ex: *${prefixo}mta* - Marca todos os *MEMBROS/ADMIN* do grupo anonimamente com a mensagem 'ATENÇÃO'.\n\n` +
                      `Ex: *${prefixo}mta* mensagem - Marca todos os *MEMBROS/ADMIN* do grupo anonimamente com uma mensagem específica.\n`,
                msgs: {
                    resposta: "*ATENÇÃO!*",
                    resposta_motivo: "{p1}"
                }
            },
            rt: {
                descricao: '',
                guia: `Ex: *${prefixo}rt* - Marca todos anonimamente (igual ao mta).\n`+
                `Ex: *${prefixo}rt* mensagem - Marca todos com a mensagem.\n`+
                `Ex: Responda uma mensagem com *${prefixo}rt* - Usa o texto citado e marca todos.\n`,
                msgs: {}
            },
            adms: {
                descricao: '',
                guia: `Ex: Responder com *${prefixo}adms* - Marca todos os *ADMINISTRADORES* em uma postagem.\n\n`+
                `Ex: *${prefixo}adms* - Marca os *ADMINISTRADORES* do grupo.\n`,
                msgs: {
                    resposta_titulo: "〘 🤖 Marquei os *{p1}* admins 〙\n\n",
                    mensagem: "Mensagem: *{p1}* \n\n",
                    resposta_itens: "➸ @{p1}\n",
                }
            },
            enquete: {
                descricao: '',
                guia: `Ex: *${prefixo}enquete* tema,opcao1,opcao2,opcao3 - Cria uma enquete com um tema e as opções de voto.\n`,  
                msgs: {
                    min_opcao: "[❗] A enquete precisa de no mínimo 2 opçôes",
                    aberta: "✅ A enquete foi aberta com sucesso",
                }
            },
            dono: {
                descricao: '',
                guia: `Ex: *${prefixo}dono* - Exibe e marca o dono do grupo.\n`,
                msgs: {
                    resposta: "🤖 O Dono do grupo é : @{p1}",
                    sem_dono: "🤖 O Dono do grupo teve o número banido ou cancelado."
                }
            },
            mutar: {
                descricao: '',
                guia: `Ex: *${prefixo}mutar* - Liga/desliga a execução de comandos dos membros.\n`,
                msgs: {
                    ligado: "✅ O recurso de MUTAR GRUPO foi ativado com sucesso",
                    desligado: "✅ O recurso de MUTAR GRUPO foi desativado com sucesso"
                }
            },
            link: {
                descricao: '',
                guia: `Ex: *${prefixo}link* - Exibe o link do grupo.\n`,
                msgs: {
                    resposta: "〘 Grupo : *{p1}* 〙\n\n"+
                    "- Link : {p2}"
                }
            },
            rlink: {
                descricao: '',
                guia: `Ex: *${prefixo}rlink* - Redefine o link do grupo.\n`,
                msgs: {
                    erro: "[❗] Houve um erro na redefinição de link",
                    sucesso : "✅ Link foi redefinido com sucesso"
                }
            },
            restrito: {
                descricao: '',
                guia: `Ex: *${prefixo}restrito* - Abre/Restringe o grupo para ADMS.\n`,
                msgs: {}
            },
            alink: {
                descricao: '',
                guia: `Ex: *${prefixo}alink* - Liga/desliga o antilink e apaga a mensagem de quem postar qualquer tipo de link.\n`,
                msgs: {
                    motivo: "Banido pelo ANTI-LINK",
                    detectou: "🤖 Ei @{p1}, o ANTI-LINK está ativado e um possível link foi detectado na sua mensagem, ela foi apagada por segurança.",
                    ligado: "✅ O recurso de ANTI-LINK foi ativado com sucesso",
                    desligado: "✅ O recurso de ANTI-LINK foi desativado com sucesso"
                }
            },
            autosticker: {
                descricao: '',
                guia: `Ex: *${prefixo}autosticker* - Liga/desliga a criação automatica de stickers sem precisar de comandos.\n`,
                msgs: {
                    ligado: "✅ O recurso de AUTO-STICKER foi ativado com sucesso",
                    desligado: "✅ O recurso de AUTO-STICKER foi desativado com sucesso"
                }
            },
            autosimi: {
                descricao: '',
                guia: `Ex: *${prefixo}autosimi* - Liga/desliga respostas automáticas do Simi (sem comando). *Apenas admins*.\n`,
                msgs: {
                    ligado: "✅ AUTO-SIMI ativado — o bot responde mensagens de texto automaticamente.",
                    desligado: "✅ AUTO-SIMI desativado."
                }
            },
            automsg: {
                descricao: 'Ativa/desativa mensagens automáticas inteligentes do bot no grupo',
                guia:
                    `Ex: *${prefixo}automsg* ativar — Liga interações automáticas (ligado por padrão).\n` +
                    `Ex: *${prefixo}automsg* desativar — Desliga.\n` +
                    `Ex: *${prefixo}automsg* — Alterna o estado.\n` +
                    `*Apenas admins.* Sem spam na madrugada.\n`,
                msgs: {
                    ligado:
                        '✅ AUTO-MSG ativado! O bot vai interagir de forma aleatória (bom dia, boa noite, piadas, menções leves…) sem spam e sem madrugada.',
                    desligado: '✅ AUTO-MSG desativado.'
                }
            },
            bv: {
                descricao: '',
                guia: `Ex: *${prefixo}bv*  - Liga/desliga a mensagem de bem-vindo para novos membros.\n\n`+
                `Ex: *${prefixo}bv* mensagem - Liga a mensagem de bem-vindo com uma mensagem da sua escolha.\n`,
                msgs: {
                    ligado: "✅ O recurso de boas vindas foi ativado com sucesso",
                    desligado: "✅ O recurso de boas vindas foi desativado com sucesso",
                    mensagem: "👋 Olá, @{p1}\n"+
                    "Seja bem vindo(a) ao grupo *{p2}*\n\n"+
                    "{p3}"+
                    "Digite "+`*${prefixo}menu*`+" para ver os comandos."
                }
            },
            afake: {
                descricao: '',
                guia: `Ex: *${prefixo}afake* - Liga/desliga o anti-fake em grupos. - *DESATIVADO!*\n`+
                `Ex: *${prefixo}afake* DDI - Configura o anti-fake para que todos números com o DDI exterior seja banido, exceto o que você escolheu.\n`+
                `Ex: *${prefixo}afake* DDI1 DDI2 DDI3 - Configura o anti-fake para que todos números com DDI exterior sejam banidos, excetos o que você escolheu.\n\n`+
                `*Obs*: A ativação do anti-fake bane pessoas com DDI do exterior (que não sejam 55 - Brasil).\n`,
                msgs: {
                    motivo: "Banido pelo ANTI-FAKE",
                    ligado: "✅ O recurso de ANTI-FAKE foi ativado com sucesso",
                    desligado: "✅ O recurso de ANTI-FAKE foi desativado com sucesso"
                }
            },
            aflood: {
                descricao: '',
                guia: `Ex: *${prefixo}aflood*  - Liga/desliga o anti-flood.\n\n`+
                `Ex: *${prefixo}aflood* 5 15  - Maxímo de mensagens fica 5 mensagens a cada 15 segundos.\n`,
                msgs: {
                    max: "[❗] Escolha um valor entre 5-20 mensagens para o anti-flood.",
                    intervalo: "[❗] Escolha um valor entre 10-60 segundos para o intervalo do anti-flood.",
                    motivo: "Banido pelo ANTI-FLOOD",
                    ligado: "✅ O recurso de ANTI-FLOOD foi ativado para *{p1}* mensagens a cada *{p2}* segundos.",
                    desligado: "✅ O recurso de ANTI-FLOOD foi desativado com sucesso"
                }
            },
            apg: {
                descricao: '',
                guia: `Ex: Responder com *${prefixo}apg* - Apaga a mensagem que foi respondida com esse comando.\n\n`+
                `*Obs* : O bot precisa ser administrador.\n`,
                msgs: {}
            },
            bantodos: {
                descricao: '',
                guia: `Ex: *${prefixo}bantodos* - Bane todos os membros do grupo.\n\n`+
                `*Obs* : Apenas o dono do grupo pode usar este comando.\n`,
                msgs: {
                    sucesso: '🤖✅ Todos banidos com sucesso.'
                }
            },
            topativos: {
                descricao: '',
                guia: `Ex: *${prefixo}topativos* 10 - Marca os 10 membros com mais mensagens do grupo.\n\n`+
                `*Obs*: Este comando só funciona com o *${prefixo}contador* ativado.\n`,
                msgs: {
                    erro_qtd: "[❗] A quantidade de pessoas não é um número válido.",
                    limite_qtd: "[❗] A quantidade de pessoas deve ser entre 1 e 200",
                    erro_contador: "[❗] Este comando só funciona quando o contador está ativado.",
                    resposta_titulo: "╔══✪〘🏆 TOP {p1} ATIVOS 🏆 〙\n╠\n",
                    resposta_itens: "╠➥ {p1} {p2}° Lugar @{p3} - *{p4}* Msgs\n"
                }
            },
            contador: {
                descricao: '',
                guia: `Ex: *${prefixo}contador* - Liga/desliga a contagem de mensagens no grupo.\n`+
                `*Obs*: Em grupos novos o contador já inicia *ativado*.\n`,
                msgs: {
                    ligado: "✅ O recurso de CONTADOR foi ligado com sucesso",
                    desligado: "✅ O recurso de CONTADOR foi desligado com sucesso",
                }
            }, 
            atividade: {
                descricao: '',
                guia: `Ex: *${prefixo}atividade* @membro - Mostra a atividade do membro mencionado.\n\n`+
                `Ex: Responder com *${prefixo}atividade* - Mostra a atividade do membro que você respondeu.\n\n`+
                `*Obs*: Este comando só funciona com o *${prefixo}contador* ativado.\n`,
                msgs: {
                    erro_contador: "[❗] Este comando só funciona quando o contador está ativado.",
                    fora_grupo: "[❗] Não é possível ver a atividade de quem não está no grupo.",
                    resposta: "🤖 *Atividade do usuário* 🤖\n\n"+
                    "📱 *Total de mensagens* : {p1}\n"+
                    "═════════════════\n"+
                    "🔤 Textos enviados : {p2}\n"+
                    "📸 Imagens enviadas : {p3}\n"+
                    "🎥 Videos enviados : {p4}\n"+
                    "🖼️ Figurinhas enviadas : {p5}\n"+
                    "🎧 Aúdios enviados : {p6}\n"+
                    "🧩 Outros : {p7}\n"
                }
            },
            imarcar: {
                descricao: '',
                guia: `Ex: *${prefixo}imarcar* 5 - Marca todos os membros com menos de 5 mensagens.\n\n`+
                `*Obs*: Este comando só funciona com o *${prefixo}contador* ativado.\n`,
                msgs: {
                    erro_qtd: "[❗] A quantidade mínima de mensagens não é um número válido.",
                    limite_qtd: "[❗] A quantidade mínima de mensagens deve ser entre [1-50]",
                    erro_contador: "[❗] Este comando só funciona quando o contador está ativado.",
                    sem_inativo: "✅ Não existe membros inativos neste grupo.",
                    resposta_titulo: "╔══✪〘🤖 Marcando todos que tem menos de {p1} mensagens〙\n\n"+
                    "👤 *Membros inativos* : {p2}\n",
                    resposta_itens: "╠➥ @{p1} - *{p2}* Msgs\n"
                }
            },
            alterarcont: {
                descricao: '',
                guia: `Ex: *${prefixo}alterarcont* 5 - Altera a quantidade de mensagens enviadas pelo membro selecionado.\n\n`+
                `*Obs*: Este comando só funciona com o *${prefixo}contador* ativado.\n`,
                msgs: {
                    erro_qtd: "[❗] A quantidade mínima de mensagens não é um número válido.",
                    limite_qtd: "[❗] A quantidade mínima de mensagens deve ser entre [1-50]",
                    erro_contador: "[❗] Este comando só funciona quando o contador está ativado.",
                    resposta: "🤖✅ A quantidade de mensagens para marcar os membros inativos foi alterada para *{p1}* mensagens."
                }
            },
            ibanir: {
                descricao: '',
                guia: `Ex: *${prefixo}ibanir* 10 - Bane todos os membros com menos de 10 mensagens.\n\n`+
                `*Obs*: Este comando só funciona com o *${prefixo}contador* ativado.\n`,
                msgs: {
                    erro_qtd: "[❗] A quantidade mínima de mensagens não é um número válido.",
                    limite_qtd: "[❗] A quantidade mínima de mensagens deve ser entre 1 e 200",
                    erro_contador: "[❗] Este comando só funciona quando o contador está ativado.",
                    sucesso: "🤖✅ {p1} Membros com menos de {p2} mensagens foram banidos.",
                    sem_inativo: "✅ Não existem membros inativos válidos para serem banidos."
                }
            },
            bcmd: {
                descricao: '',
                guia: `Ex: *${prefixo}bcmd* ${prefixo}s ${prefixo}sgif ${prefixo}play - Bloqueia no grupo os comandos ${prefixo}s, ${prefixo}sgif e ${prefixo}play (você pode escolher os comandos a sua necessidade).\n\n`+
                `Ex: *${prefixo}bcmd* figurinhas - Bloqueia todos os comandos da categoria FIGURINHAS.\n\n`+
                `Ex: *${prefixo}bcmd* utilidades - Bloqueia todos os comandos da categoria UTILIDADES.\n\n`+
                `Ex: *${prefixo}bcmd* downloads - Bloqueia todos os comandos da categoria DOWNLOADS.\n\n`+
                `Ex: *${prefixo}bcmd* diversao - Bloqueia todos os comandos da categoria DIVERSÃO.\n\n`+
                `*Obs* : Você não pode bloquear comandos de administrador.\n`,
                msgs: {
                    resposta_titulo: "[🤖 *Bloquear comandos* 🤖]\n\n",
                    resposta_variavel: {
                        ja_bloqueado: "- Comando *{p1}* já está bloqueado.\n",
                        bloqueado_sucesso: "- Comando *{p1}* bloqueado com sucesso.\n",
                        erro : "- Comando *{p1}* não pode ser bloqueado.\n",
                        nao_existe: "- Comando *{p1}* não existe.\n"
                    },
                    resposta_cmd_bloqueado : "[❗] O comando *{p1}* está temporariamente bloqueado neste grupo pelo administrador."
                }
            },
            dcmd: {
                descricao: '',
                guia: `Ex: *${prefixo}dcmd* ${prefixo}s ${prefixo}sgif ${prefixo}play - Desbloqueia no grupo os comandos ${prefixo}s, ${prefixo}sgif e ${prefixo}play.\n\n`+
                `Ex: *${prefixo}dcmd* todos - Desbloqueia todos os comandos.\n\n`+
                `Ex: *${prefixo}dcmd* figurinhas - Desbloqueia todos os comandos da categoria FIGURINHAS.\n\n`+
                `Ex: *${prefixo}dcmd* utilidades - Desbloqueia todos os comandos da categoria UTILIDADES.\n\n`+
                `Ex: *${prefixo}dcmd* downloads - Desbloqueia todos os comandos da categoria DOWNLOADS.\n\n`+
                `Ex: *${prefixo}dcmd* diversao - Desbloqueia todos os comandos da categoria DIVERSÃO.\n\n`+
                `*Obs* : Verifique os comandos que estão bloqueados com *${prefixo}status*.\n`,
                msgs: {
                    resposta_titulo: "[🤖 *Desbloquear Comandos* 🤖]\n\n",
                    resposta_variavel: {
                        desbloqueado_sucesso: "- Comando *{p1}* foi desbloqueado.\n",
                        ja_desbloqueado: "- Comando *{p1}* já esta desbloqueado ou nunca foi bloqueado.\n"
                    }
                }
            },
            revelar: {
                descricao: '',
                guia: `Ex: Responder mensagem única com *${prefixo}revelar* - Revela e reenvia o conteúdo da mensagem única como uma mensagem normal.\n`,
                msgs: {}
            },
        },
        //COMANDOS DIVERSÃO
diversao: {
            mascote: {
                descricao: '',
                guia: `Ex: *${prefixo}mascote* - Exibe o inigualável e onipotente WhatsApp Jr.\n`,
                msgs: {
                    resposta: 'WhatsApp Jr.'
                }
            },
            simi: {
                descricao: '',
                guia: `Ex: *${prefixo}simi* frase  - Envia um texto para o SimSimi responder.\n`,
                msgs: {
                    resposta : `{p1}`,
                }
            },
            viadometro: {
                descricao: '',
                guia: `Ex: *${prefixo}viadometro* @membro - Mede o nível de viadagem do membro mencionado.\n\n`+
                `Ex: Responder com *${prefixo}viadometro* - Mede o nível de viadagem do membro respondido.\n`,
                msgs: {
                    respostas: [' 0%\n\n - ESSE É MACHO ',
                    '██                 20% \n\n - HMMMMM ',
                    '████             40%\n\n - JÁ MAMOU O PRIMO',
                    '██████         60%\n\n - EITA MAMOU O BONDE',
                    '████████     80%\n\n - JÁ SENTOU EM ALGUEM',
                    '██████████ 100%\n\n - BIXONA ALERTA VERMELHO CUIDADO COM SEUS ORGÃOS SEXUAIS'],
                    apenas_um: "[❗] Erro: Apenas um membro por vez deve ser mencionado.",
                    resposta: "🧩 *VIADÔMETRO* - {p1}"
                }
            },
            detector: {
                descricao: '',
                guia: `Ex: Responder com *${prefixo}detector* - Exibe o resultado da máquina da verdade.\n`,
                msgs: {
                    espera: "⏳ Calibrando a máquina da verdade"
                }
            },
            roletarussa: {
                descricao: '',
                guia: `Ex: *${prefixo}roletarussa* - Bane um membro aleatório do grupo.\n\n`+
                `*Obs*: Comando apenas para administradores, pode banir qualquer um exceto o dono do grupo e o BOT.\n`,
                msgs: {
                    sem_membros: "[❗] Não existe membros válidos para participarem da roleta.",
                    espera: "🎲 Sorteando uma vítima 🎲",
                    motivo: "Selecionado pela roleta",
                    resposta: "🔫 Você foi o escolhido @{p1}, até a próxima."
                }
            },
            casal: {
                descricao: '',
                guia: `Ex: *${prefixo}casal* - Escolhe 2 pessoas aleatórias do grupo para formar um casal.\n`,
                msgs: {
                    minimo: "[❗] Este comando precisa de no mínimo 2 membros no grupo.",
                    resposta: "👩‍❤️‍👨 Está rolando um clima entre @{p1} e @{p2}"
                }
            },
            caracoroa: {
                descricao: '',
                guia: `Ex: *${prefixo}caracoroa* cara - Escolhe cara e joga a moeda.\n\n`+
                `Ex: *${prefixo}caracoroa* coroa - Escolhe coroa e joga a moeda.\n`,
                msgs: {
                    espera: "🕹️ Lançando a moeda 🪙",
                    resposta: {
                        vitoria: "🕹️ *VITÓRIA!* 🕹️\n\n"+
                        "O resultado caiu *{p1}*\n",
                        derrota: "🕹️ *DERROTA!* 🕹️\n\n"+
                        "O resultado caiu *{p1}*\n"
                    }
                }
            },
            ppt: {
                descricao: '',
                guia: `Ex: *${prefixo}ppt* pedra - Escolhe pedra, para jogar pedra, papel ou tesoura.\n\n`+
                `Ex: *${prefixo}ppt* papel - Escolhe papel, para jogar pedra, papel ou tesoura.\n\n`+
                `Ex: *${prefixo}ppt* tesoura - Escolhe tesoura, para jogar pedra, papel ou tesoura.\n`,
                msgs: {
                    opcao_erro: "[❗] Você deve escolher entre *pedra*, *papel*  ou *tesoura*",
                    resposta : {
                        vitoria: "🕹️ *VITÓRIA!* 🕹️\n\n"+
                        "Você escolheu {p1} e o bot escolheu {p2}\n",
                        derrota: "🕹️ *DERROTA!* 🕹️\n\n"+
                        "Você escolheu {p1} e o bot escolheu {p2}\n",
                        empate: "🕹️ *EMPATE!* 🕹️\n\n"+
                        "Você escolheu {p1} e o bot escolheu {p2}\n"
                    }
                }
            },
            gadometro: {
                descricao: '',
                guia: `Ex: *${prefixo}gadometro* @membro - Mede o nível de gadisse do membro mencionado.\n\n`+
                `Ex: Responder com *${prefixo}gadometro* - Mede o nível de gadisse do membro respondido.\n`,
                msgs: {
                    respostas : [' 0%\n\n - ESSE NÃO É GADO ',
                    '🐃 20% \n\n - GADO APRENDIZ, TÁ NO CAMINHO ',
                    '🐃🐃 40%\n\n - GADO INTERMEDIÁRIO, JÁ INVADE PV DE UMAS E PENSA EM PAGAR PACK DE PEZINHO',
                    '🐃🐃🐃 60%\n\n - CUIDADO : GADO EXPERIENTE, INVADE PV E FALA LINDA EM TODAS FOTOS',
                    '🐃🐃🐃🐃 80%\n\n - ALERTA : GADO MASTER, SÓ APARECE COM MULHER ON',
                    '🐃🐃🐃🐃🐃 100%\n\n - PERIGO : GADO MEGA BLASTER ULTRA PAGA BOLETO DE MULHER QUE TEM NAMORADO'],
                    apenas_um: "[❗] Erro: Apenas um membro por vez deve ser mencionado.",
                    resposta: "🧩 *GADÔMETRO* - {p1}"
                }
            },
            bafometro: {
                descricao: '',
                guia: `Ex: *${prefixo}bafometro* @membro - Mede o nível de alcool do membro mencionado.\n\n`+
                `Ex: Responder com *${prefixo}bafometro* - Mede o nível de alcool do membro respondido.\n`,
                msgs: {
                    respostas : [' 0%\n\n - ESTÁ SÓBRIO ',
                    '🍺  20% \n\n - TOMOU UM GORÓZINHO ',
                    '🍺🍺  40%\n\n - JÁ TÁ FICANDO MEIO CHAPADO E FALANDO BOSTA',
                    '🍺🍺🍺  60%\n\n - TÁ MAMADO E COMEÇANDO A FAZER MERDA',
                    '🍺🍺🍺🍺  80%\n\n - TÁ LOUCÃO NEM CONSEGUE DIFERENCIAR MULHER E HOMEM',
                    '🍺🍺🍺🍺🍺  100%\n\n - ALERTA: ESTÁ FORA DE SI , BEIJANDO MENDIGO E CACHORRO DE RUA'],
                    apenas_um: "[❗] Erro: Apenas um membro por vez deve ser mencionado.",
                    resposta: "🧩 *BAFÔMETRO* - {p1}"
                }
            },
            top: {
                descricao: '',
                guia: `Ex: *${prefixo}top* 5 tema - Ranking com N membros e o tema escolhido.\n`,
                msgs: {
                    erro_qtd: "[❗] Quantidade inválida ou maior que o número de membros do grupo.",
                    limite_qtd: "[❗] O máximo é 200 membros no ranking.",
                    resposta_titulo: "╔══✪〘🏆 TOP {p1} {p2} 🏆 〙\n╠\n",
                    resposta_itens: "╠➥ {p1} {p2}° Lugar @{p3}\n"
                }
            },
            sortear: {
                descricao: '',
                guia: `Ex: *${prefixo}sortear* - Sorteia um membro aleatório do grupo.\n`,
                msgs: {}
            },
            par: {
                descricao: '',
                guia: `Ex: *${prefixo}par* @membro1 @membro2 - Mede o nível de compatibilidade dos 2 membros mencionados.\n`,
                msgs: {
                    respostas: [' *0%*\n - NÃO COMBINAM ',
                    '❤️ *20%* \n - HMMM TALVEZ ',
                    '❤️❤️ *40%*\n - PODE ROLAR ALGO SÉRIO', 
                    '❤️❤️❤️ *60%*\n - UIA ESSES DOIS TEM FUTURO',
                    '❤️❤️❤️❤️ *80%*\n - ESSES DOIS TEM QUÍMICA, TALVEZ UM CASAMENTO EM BREVE', 
                    '❤️❤️❤️❤️❤️ *100%*\n - CASAL PERFEITO: PREPAREM-SE PARA VIVER ATÉ A VELHICE JUNTOS',
                    ],
                    resposta: "👩‍❤️‍👨 PAR - @{p1} & @{p2}\n\n{p3}"
                }
            },
            chance: {
                descricao: '',
                guia: `Ex: *${prefixo}chance de ficar rico* - Calcula sua chance de um tema aleatório a sua escolha.\n`,
                msgs: {
                    resposta: "🧩 *CHANCE* - Você tem *{p1}%* de chance {p2}"
                }
            }, 
            fch: {
                descricao: '',
                guia: `Ex: *${prefixo}fch* - Exibe uma frase aleatória montada com as cartas do jogo Cartas contra a Humanidade.\n`,
                msgs: {
                    resposta: "🧩〘*FRASES CONTRA A HUMANIDADE*〙\n\n - {p1}",
                }
            },
trisal: {
                descricao: '',
                guia: `Ex: *${prefixo}trisal* - Escolhe 3 pessoas aleatórias do grupo.\n`,
                msgs: {
                    minimo: "[❗] Este comando precisa de no mínimo 3 membros no grupo.",
                    resposta: "👩‍❤️‍👨‍👩 Está rolando um clima entre @{p1}, @{p2} e @{p3}"
                }
            },
            jacometro: {
                descricao: '',
                guia: `Ex: *${prefixo}jacometro* @membro - Mede o nível de jaca.\n`,
                apenas_um: "[❗] Erro: Apenas um membro por vez deve ser mencionado.",
                msgs: {
                    respostas : [' 0%\n\n - ZERO JACA ',
                    '🥭 20%\n\n - JACINHA ',
                    '🥭🥭 40%\n\n - JACA MÉDIA ',
                    '🥭🥭🥭 60%\n\n - JACA FORTE ',
                    '🥭🥭🥭🥭 80%\n\n - JACA MASTER ',
                    '🥭🥭🥭🥭🥭 100%\n\n - JACA ABSOLUTA'],
                    resposta: "🧩 *JACÔMETRO* - {p1}"
                }
            },
            bolometro: {
                descricao: '',
                guia: `Ex: *${prefixo}bolometro* @membro - Mede o nível de bolo.\n`,
                apenas_um: "[❗] Erro: Apenas um membro por vez deve ser mencionado.",
                msgs: {
                    respostas : [' 0%\n\n - SEM BOLO ',
                    '🍰 20%\n\n - FOFINHO ',
                    '🍰🍰 40%\n\n - BOLO MÉDIO ',
                    '🍰🍰🍰 60%\n\n - BOLO FORTE ',
                    '🍰🍰🍰🍰 80%\n\n - BOLO MASTER ',
                    '🍰🍰🍰🍰🍰 100%\n\n - BOLO ABSOLUTO'],
                    resposta: "🧩 *BOLÔMETRO* - {p1}"
                }
            },
            fernandometro: {
                descricao: '',
                guia: `Ex: *${prefixo}fernandometro* @membro - Mede o nível de fernando.\n`,
                apenas_um: "[❗] Erro: Apenas um membro por vez deve ser mencionado.",
                msgs: {
                    respostas : [' 0%\n\n - ZERO FERNANDO ',
                    '👨 20%\n\n - FERNANDINHO ',
                    '👨👨 40%\n\n - FERNANDO MÉDIO ',
                    '👨👨👨 60%\n\n - FERNANDO FORTE ',
                    '👨👨👨👨 80%\n\n - FERNANDO MASTER ',
                    '👨👨👨👨👨 100%\n\n - FERNANDO ABSOLUTO'],
                    resposta: "🧩 *FERNANDÔMETRO* - {p1}"
                }
            },
            joke: {
                descricao: '',
                guia: `Ex: *${prefixo}joke* - Conta uma piada aleatória (alias de *${prefixo}piada*).\n`,
                msgs: {}
            },
            piada: {
                descricao: '',
                guia: `Ex: *${prefixo}piada* - Conta uma piada real (banco local + APIs).\n`,
                msgs: {}
            },
            issoouaquilo: {
                descricao: 'Pergunta aleatória “isso ou aquilo”',
                guia:
                    `Ex: *${prefixo}issoouaquilo* - Sorteia uma pergunta de escolha.\n` +
                    `Ex: *${prefixo}ioa* - Atalho.\n`,
                msgs: {}
            },
            ioa: {
                descricao: '',
                guia: `Ex: *${prefixo}ioa* - Atalho de *${prefixo}issoouaquilo*.\n`,
                msgs: {}
            },
            verdadeoudesafio: {
                descricao: '',
                guia: `Ex: *${prefixo}verdadeoudesafio* [verdade|desafio] [1-5]\n`+
                `Ex: *${prefixo}vod* 3 - Atalho.\n`+
                `Níveis 4-5: NSFW.\n`,
                msgs: {}
            },
            vod: {
                descricao: '',
                guia: `Ex: *${prefixo}vod* [verdade|desafio] [1-5] - Atalho de verdade ou desafio.\n`,
                msgs: {}
            },
            fofoca: {
                descricao: 'IA inventa fofoca absurda entre membros',
                guia: `Ex: *${prefixo}fofoca* - Inventa uma fofoca absurda do grupo.\n`,
                msgs: {}
            },
            crime: {
                descricao: 'Inventa um "crime" cômico de um membro',
                guia: `Ex: *${prefixo}crime* - Inventa um crime ridículo.\nEx: *${prefixo}crime* @membro\n`,
                msgs: {}
            },
            tribunal: {
                descricao: 'Julgamento humorístico (acusação, defesa, sentença)',
                guia: `Ex: *${prefixo}tribunal* - Julga alguém do grupo.\nEx: *${prefixo}tribunal* @membro\n`,
                msgs: {}
            },
            prefeito: {
                descricao: 'Escolhe o prefeito do grupo por 24h',
                guia: `Ex: *${prefixo}prefeito* - Sorteia o prefeito do dia.\n`,
                msgs: {}
            },
            cancelado: {
                descricao: 'Cancelamento humorístico em áudio',
                guia: `Ex: *${prefixo}cancelado* - Gera cancelamento engraçado (texto + voz).\nEx: *${prefixo}cancelado* @membro\n`,
                msgs: {}
            },
            horoscopo: {
                descricao: 'Horóscopo engraçado personalizado',
                guia: `Ex: *${prefixo}horoscopo* - Horóscopo engraçado.\nEx: *${prefixo}horoscopo* @membro\nEx: *${prefixo}horoscopo* leão\n`,
                msgs: {}
            },
            boladocotidiano: {
                descricao: 'Drama cotidiano em tom épico (voz)',
                guia: `Ex: *${prefixo}boladocotidiano* - Narra drama banal em tom épico (texto + áudio).\n`,
                msgs: {}
            },
            jornal: {
                descricao: 'Jornal fictício do grupo (~5 min de áudio)',
                guia: `Ex: *${prefixo}jornal* - Notícias fictícias do grupo (texto + áudio ~5 min).\n`,
                msgs: {}
            }
        },
        //COMANDOS ADMIN
        admin: {
            sair: {
                descricao: '',
                guia: `Ex: Digite *${prefixo}sair* em um grupo - Faz o bot sair do grupo atual.\n`+
                `Ex: *${prefixo}sair* 1 - Faz o bot sair do grupo selecionado.\n\n`+
                `*Obs*: Para ver o número dos grupos é necessário checar no comando *${prefixo}grupos*\n`,
                msgs: {
                    resposta_admin: "🤖✅ O bot saiu com sucesso do grupo escolhido.",
                    nao_encontrado: `[❗] Não foi possível sair deste grupo, o grupo não foi encontrado ou o número é inválido. Cheque o comando correto em *${prefixo}grupos*`,
                }
            },
            pvliberado: {
                descricao: '',
                guia: `Ex: *${prefixo}pvliberado* - Liga/desliga os comandos em MENSAGENS PRIVADAS.\n`,
                msgs: {
                    desativado: "✅ Os comandos em MENSAGENS PRIVADAS foram desativados com sucesso.",
                    ativado: "✅ Os comandos em MENSAGENS PRIVADAS foram ativados com sucesso."
                }
            },
            bcmdglobal: {
                descricao: '',
                guia: `Ex: *${prefixo}bcmdglobal* ${prefixo}s ${prefixo}sgif ${prefixo}play - Bloqueia  os comandos ${prefixo}s, ${prefixo}sgif e ${prefixo}play (você pode escolher os comandos a sua necessidade).\n\n`+
                `Ex: *${prefixo}bcmdglobal* figurinhas - Bloqueia todos os comandos da categoria FIGURINHAS.\n\n`+
                `Ex: *${prefixo}bcmdglobal* utilidades - Bloqueia todos os comandos da categoria UTILIDADES.\n\n`+
                `Ex: *${prefixo}bcmdglobal* downloads - Bloqueia todos os comandos da categoria DOWNLOADS.\n\n`+
                `Ex: *${prefixo}bcmdglobal* diversao - Bloqueia todos os comandos da categoria DIVERSÃO.\n\n`+
                `*Obs* : Você não pode bloquear comandos de administrador.\n`,
                msgs: {
                    resposta_titulo: "[🤖 *Bloquear comandos - Global* 🤖]\n\n",
                    resposta_variavel: {
                        ja_bloqueado: "- Comando *{p1}* já está bloqueado.\n",
                        bloqueado_sucesso: "- Comando *{p1}* bloqueado com sucesso.\n",
                        erro: "- Comando *{p1}* não pode ser bloqueado.\n",
                        nao_existe: "- Comando *{p1}* não existe.\n"
                    },
                    resposta_cmd_bloqueado : "[❗] O comando *{p1}* está indisponível no momento por ordem do administrador, tente novamente mais tarde."
                }
            },
            dcmdglobal: {
                descricao: '',
                guia: `Ex: *${prefixo}dcmdglobal* ${prefixo}s ${prefixo}sgif ${prefixo}play - Desbloqueia  os comandos ${prefixo}s, ${prefixo}sgif e ${prefixo}play.\n\n`+
                `Ex: *${prefixo}dcmdglobal* todos - Desbloqueia todos os comandos.\n\n`+
                `Ex: *${prefixo}dcmdglobal* figurinhas - Desbloqueia todos os comandos da categoria FIGURINHAS.\n\n`+
                `Ex: *${prefixo}dcmdglobal* utilidades - Desbloqueia todos os comandos da categoria UTILIDADES.\n\n`+
                `Ex: *${prefixo}dcmdglobal* downloads - Desbloqueia todos os comandos da categoria DOWNLOADS.\n\n`+
                `Ex: *${prefixo}dcmdglobal* diversao - Desbloqueia todos os comandos da categoria DIVERSÃO.\n\n`+
                `*Obs* : Verifique os comandos que estão bloqueados com ${prefixo}infocompleta.\n`,
                msgs: {
                    resposta_titulo: "[🤖 *Desbloquear Comandos - Global* 🤖]\n\n",
                    resposta_variavel: {
                        desbloqueado_sucesso: "- Comando *{p1}* foi desbloqueado.\n",
                        ja_desbloqueado: "- Comando *{p1}* já esta desbloqueado ou nunca foi bloqueado.\n"
                    }
                }
            },
            sairgrupos: {
                descricao: '',
                guia: `Ex: *${prefixo}sairgrupos* - Sai de todos os grupos.\n`,
                msgs: {
                    resposta: "🤖✅ Saí de todos os grupos com sucesso, total de grupos : {p1}"
                }
            },
            infobot: {
                descricao: '',
                guia: `Ex: *${prefixo}infobot* - Exibe as informações completas do bot, inclusive as configurações atuais.\n`,
                msgs: {
                    resposta_superior:"*Administrador do Bot* : {p1}\n"+
                    "*Nome do bot* : {p2}\n"+
                    "*Online desde* : {p3}\n"+
                    "*Versão* : {p4}\n"+
                    "-------------------\n",
                    resposta_variavel:{
                        limite_diario: {
                            on: "*Limite diário* : ✅\n"+
                            "- Reseta em : *{p1}*\n"+
                            "-------------------\n",
                            off: "*Limite diário* : ❌\n"+
                            "-------------------\n"
                        },
                        autosticker: {
                            on: "*Auto-Sticker privado* : ✅\n"+
                            "-------------------\n",
                            off: "*Auto-Sticker privado* : ❌\n"+
                            "-------------------\n",
                        },
                        autorevelar: {
                            on: "*Auto-Revelar* : ✅\n"+
                            "-------------------\n",
                            off: "*Auto-Revelar* : ❌\n"+
                            "-------------------\n",
                        },
                        pvliberado: {
                            on: "*PV Liberado* : ✅\n"+
                            "-------------------\n",
                            off: "*PV Liberado* : ❌\n"+
                            "-------------------\n",
                        },
                        taxa_comandos:{
                            on: "*Taxa comandos/minuto* : ✅\n"+
                            "- *{p1}* Cmds/minuto por usuário\n"+
                            "- Bloqueio : *{p2}* s\n"+
                            "-------------------\n",
                            off: "*Taxa comandos/minuto* : ❌\n"+
                            "-------------------\n"
                        },
                        bloqueiocmds:{
                            on: "*Bloqueio de comandos* : ✅\n"+
                            "- Bloqueados: *{p1}*\n"+
                            "-------------------\n",
                            off: "*Bloqueio de comandos* : ❌\n"+
                            "-------------------\n"
                        }
                    },
                    resposta_inferior:"*Pessoas bloqueadas* : *{p1}* pessoas\n"+
                    "*Comandos executados* : *{p2}*\n"+
                    "*Contato do Administrador* : wa.me/{p3}\n"
                }
            },
            entrargrupo: {
                descricao: '',
                guia: `Ex: *${prefixo}entrargrupo* link - Entra em um grupo por link de convite.\n`,
                msgs: {
                    link_invalido: "[❗] Isso não é um link válido 👊🤬",
                    entrar_erro : "[❗] Houve um erro para entrar nesse grupo, verifique se o link está correto.",
                    pendente: "🤖 Não foi possivel entrar neste momento, o grupo provavelmente está com modo para administrador aceitar solicitação.",
                    entrar_sucesso: "🤖✅ Entendido, entrarei em breve no grupo."
                }
            },
            bcgrupos: {
                descricao: '',
                guia: `Ex: *${prefixo}bcgrupos* mensagem - Envia uma mensagem para todos os *GRUPOS*.\n`+
                `Ex: *${prefixo}aviso* mensagem - Mesmo efeito do bcgrupos (apenas dono).\n`,
                msgs: {
                    anuncio: `[🤖${nome_bot}® - Mensagem para os grupos]\n\n`+
                    "{p1}",
                    espera: "⏳ Em andamento , estou enviando sua mensagem para {p1} grupos.\n\n"+
                    "Tempo estimado : *{p2}* segundos",
                    bc_sucesso: "🤖✅ Anúncio feito com sucesso."
                }
            },
            aviso: {
                descricao: '',
                guia: `Ex: *${prefixo}aviso* mensagem - Envia um aviso geral para todos os grupos (apenas dono).\n`,
                msgs: {
                    anuncio: `[🤖${nome_bot}® - Aviso geral]\n\n`+
                    "{p1}",
                    espera: "⏳ Em andamento , estou enviando seu aviso para {p1} grupos.\n\n"+
                    "Tempo estimado : *{p2}* segundos",
                    bc_sucesso: "🤖✅ Aviso enviado com sucesso."
                }
            },
            fotobot: {
                descricao: '',
                guia: `Ex: Envie/responda uma *imagem* com *${prefixo}fotobot* - Altera a foto do BOT.\n`,
                msgs: {
                    sucesso: "🤖✅ A foto do BOT foi alterada com sucesso."
                }
            },
            nomebot: {
                descricao: '',
                guia: `Ex: *${prefixo}nomebot* Teste123 - Muda o nome do *BOT* para *Teste123* e atualiza os menus com o novo nome.\n`,
                msgs: {
                    sucesso: "✅ O nome do bot foi alterado com sucesso.",
                }
            },
            nomesticker: {
                descricao: '',
                guia: `Ex: *${prefixo}nomesticker* Teste123 - Muda o nome do *PACOTE DE STICKERS* para *Teste123* e atualiza os novos stickers com o novo nome.\n`,
                msgs: {
                    sucesso: "✅ O nome do pacote de figurinhas foi alterado com sucesso.",
                }
            },
            nomeadm: {
                descricao: '',
                guia: `Ex: *${prefixo}nomeadm* Teste123 - Muda o nome do *ADMINISTRADOR* para *Teste123* e atualiza os menus com o novo nome.\n`,
                msgs: {
                    sucesso: "✅ O nome do administrador foi alterado com sucesso.",
                }
            },
            prefixo: {
                descricao: '',
                guia: `Ex: *${prefixo}prefixo* .  - Muda o prefixo dos *COMANDOS* para *.* e atualiza os menus e comandos com o novo prefixo.\n\n`+
                `Suporta os seguintes prefixos : *!*  *#*  *.*  ***  *-*  *+*  */*  *$*  *&*\n`,
                msgs: {
                    sucesso: "✅ O prefixo dos comandos foi alterado com sucesso.",
                    nao_suportado: "[❗] Não suportado como prefixo, são suportados somente : ! # . * - + / $ &"
                }
            },
            autostickerpv: {
                descricao: '',
                guia: `Ex: *${prefixo}autostickerpv* - Liga/desliga a criação automatica de stickers sem precisar de comandos no privado.\n`,
                msgs: {
                    desativado: "✅ O AUTO-STICKER em mensagens privadas foi desativado com sucesso",
                    ativado: "✅ O AUTO-STICKER em mensagens privadas foi ativado com sucesso",
                }
            },
            autorevelar: {
                descricao: '',
                guia: `Ex: *${prefixo}autorevelar* - Liga/desliga o envio automático a revelação de mensagens de visualização única para o PV.\n`,
                msgs: {
                    ativado: '✅ O AUTO-REVELAR em mensagens de visualização única foi ativado com sucesso',
                    desativado: '✅ O AUTO-REVELAR em mensagens de visualização única foi desativado com sucesso',
                    restransmissao: '[🕵️ *Revelar mensagens* 🕵️]\n\n'+
                    '✉️ Nova mensagem detectada :\n'+
                    `Nome : *{p1}*\n`+
                    `Numero : *{p2}*\n`+
                    'Grupo : *{p3}*\n'+
                    'Tipo de mensagem : *{p4}*\n'
                }
            },
            listablock: {
                descricao: '',
                guia: `Ex: *${prefixo}listablock* - Exibe a lista de usuários bloqueados pelo bot.\n`,
                msgs: {
                    resposta_titulo: "🤖 Esse é o total de pessoas bloqueadas \nTotal : {p1}\n",
                    lista_vazia: "[❗] O bot não tem pessoas bloqueadas.",
                    resposta_itens: "➸ +{p1}\n",
                }
            },
            bloquear: {
                descricao: '',
                guia: `Ex: *${prefixo}bloquear* @membro - Para o bot bloquear o membro mencionado.\n\n`+
                `Ex: *${prefixo}bloquear* +55 (xx) xxxxx-xxxx - Para o bot bloquear o número digitado.\n\n`+
                `Ex: Responder alguém com *${prefixo}bloquear* - Para o bot bloquear o membro que você respondeu.\n`,
                msgs: {
                    erro_dono: "[❗] O Usuário +{p1} é dono do BOT, não foi possivel bloquear.",
                    ja_bloqueado: "[❗] O Usuário +{p1} já está *bloqueado*.",
                    sucesso: "✅ O Usuário +{p1} foi *bloqueado* com sucesso"
                }
            },
            usuarios: {
                descricao: '',
                guia: `Ex: *${prefixo}usuarios* comum - Mostra todos os usuários do tipo *COMUM*.\n\n`+
                `*Obs*: Use o *${prefixo}tipos* para ver os tipos disponíveis de usuários.\n`,
                msgs: {
                    nao_encontrado: "[❗] Não existem usuários com esse tipo ou você digitou um tipo inválido, confira os tipos disponíveis em "+`*${prefixo}tipos*`,
                    resposta: {
                        titulo: "👥  USUÁRIOS - {p1} ({p2})\n\n",
                        item: "-> {p1} +{p2} - {p3} cmds\n"
                    }
                }
            },
            novotipo: {
                descricao: '',
                guia: `Ex: *${prefixo}novotipo* teste, 🤖 Teste, 50 - Cria um novo tipo usuário com nome *teste*, com titulo (exibição em menus) *🤖 Teste* e com o máximo de *50* comandos diários.\n`,
                msgs: {
                    erro_comandos: "[❗] Houve um erro ao criar um novo tipo, a quantidade de comandos diários tem que ser um número e no mínimo 10.",
                    sucesso_criacao: "✅ Um novo tipo de usuário foi criado com sucesso.\n"+
                    "- Tipo : {p1}\n"+
                    "- Titulo : {p2}\n"+
                    "- Comandos diários : {p3}\n",
                    erro_criacao: `[❗] Houve um erro ao criar um novo tipo, verifique se esse tipo já existe em *${prefixo}tipos*`
                }
            },
            deltipo: {
                descricao: '',
                guia: `Ex: *${prefixo}deltipo* vip - Deleta o tipo de usuário *VIP* e move todos os usuários desse tipo para *COMUM*\n`,
                msgs: {
                    sucesso_remocao: "✅ O tipo *{p1}* foi deletado com sucesso e os usuários desse tipo foram movidos para *COMUM*.",
                    erro_remocao: `[❗] Houve um erro ao deletar este tipo, verifique se esse tipo existe em *${prefixo}tipos* e se não é do tipo *comum* ou *dono* (que não podem ser deletados).`
                }
            },
            tipotitulo: {
                descricao: '',
                guia: `Ex: *${prefixo}tipotitulo* vip, 🔥VIP Teste - Muda o titulo de exibição do tipo de usuário *VIP* para *🔥 VIP Teste*\n`,
                msgs: {
                    sucesso: "✅ O tipo *{p1}* teve o título de exibição alterado para *{p2}* com sucesso.",
                    erro: `[❗] Houve um erro ao alterar o titulo deste tipo, verifique se esse tipo existe em *${prefixo}tipos*.`
                }
            },
            limpartipo: {
                descricao: '',
                guia: `Ex: *${prefixo}limpartipo* premium - Transforma todos os usuários do tipo *PREMIUM* em *COMUM*.\n\n`+
                `*Obs*: Use o *${prefixo}tipos* para ver os tipos disponíveis de usuários.\n`,
                msgs: {
                    erro: "[❗] O tipo de usuário que você inseriu é inválido, verifique os tipos disponíveis em "+`*${prefixo}tipos*`,
                    sucesso: "✅Todos os usuários do tipo *{p1}* foram convertidos para *COMUM*"
                }
            },
            limitediario: {
                descricao: '',
                guia: `Ex: *${prefixo}limitediario* - Ativa/desativa o limite diario de comandos.\n`,
                msgs: {
                    qtd_invalida: "[❗] A quantidade de comandos por dia está inválida",
                    ativado: "✅ O Limite diário de comandos foi ativado com sucesso",
                    desativado: "✅ O Limite diário de comandos foi desativado com sucesso",
                    resposta_excedeu_limite: "[❗] {p1} -> Você ultrapassou seu limite diário de comandos por dia.\n\n"+
                    "Entre em contato com o dono para ver sua situação : https://wa.me/{p2}"
                }
            },
            taxacomandos: {
                descricao: '',
                guia: `Ex: *${prefixo}taxacomandos* 5 60 - Ativa a taxa limite de comandos para 5 comandos a cada minuto por usuário, caso o usuário ultrapasse ele fica 60 segundos impossibilitado de fazer comandos.\n\n`+
                `*Obs*: Digite *${prefixo}taxacomandos* novamente para desativar a taxa limite de comandos.\n`,
                msgs: {
                    qtd_invalida: "[❗] A quantidade máxima de mensagens por minuto está inválida",
                    tempo_invalido: "[❗] O tempo de bloqueio de mensagens está inválido",
                    ativado: "✅ O Limitador de comandos por minuto foi ativado com sucesso",
                    desativado: "✅ O Limitador de comandos por minuto foi desativado com sucesso",
                    resposta_usuario_limitado: "[❗] Você está impossibilitado de mandar comandos por *{p1}* segundos, pega leve cara."
                }
            },
            desbloquear: {
                descricao: '',
                guia: `Ex: *${prefixo}desbloquear* @membro - Para o bot desbloquear o membro mencionado.\n\n`+
                `Ex: *${prefixo}desbloquear* +55 (xx) xxxxx-xxxx - Para o bot desbloquear o número digitado.\n\n`+
                `Ex: Responder alguém com *${prefixo}desbloquear* - Para o bot desbloquear o membro que você respondeu.\n`,
                msgs: {
                    ja_desbloqueado: "[❗] O Usuário +{p1} já está *desbloqueado*.",
                    sucesso: "✅ O Usuário +{p1} foi *desbloqueado* com sucesso"
                }
            },
            estado: {
                descricao: '',
                guia: `Ex: *${prefixo}estado* online - Muda o status do bot para ONLINE.\n\n`+
                `Ex: *${prefixo}estado* offline - Muda o status do bot para OFFLINE.\n\n`+
                `Ex: *${prefixo}estado* manutencao - Muda o status do bot para MANUTENCÃO.\n`,
                msgs: {
                    sucesso: "🤖✅ Seu estado foi alterado com sucesso."
                }
            },
            admin: {
                descricao: '',
                guia: `Ex: *${prefixo}admin* - Exibe o menu de administração do bot.\n`,
                msgs: {}
            },
            tipocomandos: {
                descricao: '',
                guia: `Ex: *${prefixo}tipocomandos* comum 70 - Altera o limite diário de comandos do usuário *COMUM* para 70/dia.\n\n`+
                `*Obs*: O comando de *${prefixo}limitediario* deve estar ativado.\n`+
                `*Obs²*: Verifique os tipos disponíveis de usuários em *${prefixo}tipos*.\n`+
                `*Obs³*: Para ficar sem limite de comandos digite -1 no campo de limite.\n`,
                msgs: {
                    invalido: "[❗] O número para definir o limite de comandos é inválido",
                    tipo_invalido: "[❗] O tipo de usuário que você inseriu é inválido, verifique os tipos disponíveis em "+`*${prefixo}tipos*`,
                    erro_limite_diario: "[❗] Este comando só pode ser usado com o "+`*${prefixo}limitediario*`+" ativado.",
                    sucesso: "✅ O limite diário dos usuários do tipo *{p1}* foi definido para *{p2}* comandos/dia "
                }
            },
            usuariotipo: {
                descricao: '',
                guia: `Ex: *${prefixo}usuariotipo* comum @usuario - Altera o tipo do usuário mencionado para *COMUM*.\n\n`+
                `Ex: Responder com *${prefixo}usuariotipo* premium - Altera o tipo do usuário respondido para *PREMIUM*.\n\n`+
                `Ex: *${prefixo}usuariotipo* vip  55219xxxxxxxx - Altera o tipo do usuário do número para *VIP*.\n\n`+
                `*Obs*: Use o *${prefixo}tipos* para ver os tipos disponíveis de usuários.\n`,
                msgs: {
                    tipo_dono: "[❗] Não é possivel alterar cargo do dono",
                    tipo_invalido: `[❗] O tipo de usuário que você inseriu é inválido, verifique se o tipo existe em *${prefixo}tipos* e se não é do tipo *dono*`,
                    nao_registrado: "[❗] Este usuário ainda não está registrado",
                    sucesso: "✅ O tipo desse usuário foi definido para {p1}"
                }
            },
            grupos: {
                descricao: '',
                guia: `Ex: *${prefixo}grupos* - Mostra os grupos atuais que o bot está e suas informações.\n`,
                msgs: {
                    resposta_titulo: "🤖 GRUPOS ATUAIS ({p1})\n",
                    resposta_itens: "----------------------------\n"+
                    "*N° Grupo* : {p1}\n"+
                    "*Nome* : {p2}\n"+
                    "*Participantes* : {p3}\n"+
                    "*Admins* : {p4}\n"+
                    "*Bot é admin?* {p5}\n"+
                    `*Link*: {p6}\n`
                }
            },
            linkgrupo: {
                descricao: '',
                guia: `Ex: *${prefixo}linkgrupo* 1 - Exibe o link do grupo selecionado.\n\n`+
                `*Obs*: Para ver o número dos grupos é necessário checar no comando *${prefixo}grupos*\n`,
                msgs: {
                    resposta: `🤖✅ O link para este grupo atualmente é : {p1}`,
                    nao_admin: '[❗] Não foi possível obter o link desse grupo, o bot não é administrador deste grupo.',
                    nao_encontrado: `[❗] Não foi possível obter o link desse grupo, o grupo não foi encontrado ou o número é inválido. Cheque o comando correto em *${prefixo}grupos*`,
                }
            },
            tipos: {
                descricao: '',
                guia: `Ex: *${prefixo}tipos* - Exibe os tipos de usuários disponíveis e quantos comandos estão configurados por dia.\n`,
                msgs: {
                    resposta : {
                        titulo : "👥 Tipos de usuários ({p1}) :\n\n",
                        item: "Tipo : {p1}\n"+
                        "Titulo : {p2}\n"+
                        "Comandos diários : {p3}\n\n"
                    }
                }
            },
            rtodos: {
                descricao: '',
                guia: `Ex: *${prefixo}rtodos* - Reseta os comandos diários de todos os usuários.\n\n`+
                `*Obs*: O comando de *${prefixo}limitediario* deve estar ativado.\n`,
                msgs: {
                    sucesso: "✅ Os comandos diários de todos os usuários foram resetados",
                    erro_limite_diario: "[❗] Este comando só pode ser usado com o "+`*${prefixo}limitediario*`+" ativado."
                }
            },
            r: {
                descricao: '',
                guia: `Ex: *${prefixo}r* @usuario - Reseta os comandos diários de um usuário mencionado.\n\n`+
                `Ex: Responder com *${prefixo}r* - Reseta os comandos diários do usuário respondido.\n\n`+
                `Ex: *${prefixo}r* 55219xxxxxxxx - Reseta os comandos diários do usuário com esse número.\n\n`+
                `*Obs*: O comando de *${prefixo}limitediario* deve estar ativado.\n`,
                msgs: {
                    sucesso: "✅ Os comandos diários desse usuário foram resetados",
                    nao_registrado: "[❗] Este usuário ainda não está registrado",
                    erro_limite_diario: `[❗] Este comando só pode ser usado com o *${prefixo}limitediario* ativado.`
                }
            },
            verdados: {
                descricao: '',
                guia: `Ex: *${prefixo}verdados* @usuario - Mostra os dados gerais do usuário mencionado.\n\n`+
                `Ex: Responder com *${prefixo}verdados* - Mostra os dados gerais do usuário respondido.\n\n`+
                `Ex: *${prefixo}verdados* 55219xxxxxxxx - Mostra os dados gerais do usuário com esse número.\n`,
                msgs: {
                    nao_registrado: "[❗] Este usuário ainda não está registrado",
                    resposta_superior: "[🤖*VER DADOS DE USO*🤖]\n\n"+
                    "Nome : *{p1}*\n"+
                    "Tipo de usuário : *{p2}*\n"+
                    "Número : *{p3}*\n",
                    resposta_variavel: {
                        limite_diario: {
                            on:"Comandos usados hoje : *{p1}/{p2}*\n"+
                            "Limite diário : *{p3}*\n",
                            off: ""
                        }
                    },
                    resposta_inferior: "Total de comandos usados : *{p1}* comandos\n"
                }
            },
            desligar: {
                descricao: '',
                guia: `Ex: *${prefixo}desligar* - Desliga o bot.\n`,
                msgs: {
                    sucesso: "🤖✅ Entendido, o BOT será desligado"
                }
            },
            ping: {
                descricao: '',
                guia: `Ex: *${prefixo}ping* - Exibe as informações do sistema do BOT e o tempo de resposta dele.\n`,
                msgs: {
                    resposta: "🖥️ INFORMAÇÃO GERAL 🖥️\n\n"+
                    "*OS*: {p1}\n"+
                    "*CPU*: {p2}\n"+
                    "*RAM*: {p3}GB/{p4}GB\n"+
                    "*Resposta*: {p5}s\n"+
                    "*Usuários cadastrados*: {p6}\n"+
                    "*Grupos cadastrados*: {p7}\n"+
                    "*Online desde*: {p8}"
                }
            },
            limpar: {
                descricao: '',
                guia:
                    `Ex: *${prefixo}limpar* - Limpa cache, mídias temporárias e mensagens guardadas.\n` +
                    `*Mantém* dados de usuários, grupos, contador e sessão.\n` +
                    `*Só dono do bot.*\n`,
                msgs: {}
            },
            sugestoes: {
                descricao: '',
                guia:
                    `Ex: *${prefixo}sugestoes* - Lista sugestões enviadas com *${prefixo}sugerir* (só dono).\n` +
                    `Ex: *${prefixo}sugestoes limpar* - Apaga sugestões já lidas.\n`,
                msgs: {}
            },
            devtest: {
                descricao: 'Testes',
                guia: 'Testes',
                msgs: {}
            }
        },
        //OUTROS
        outros : {
            inicializando: 'Ultron v{p1}',
            dados_bot: 'Bot pronto',
            servidor_iniciado: 'Online',
            grupos_carregados: 'Grupos sincronizados',
            dono_cadastrado: `Número cadastrado como dono. Use ${prefixo}admin`,
            automsg_ok: 'AutoMsg ativo',
            cabecalho_guia: `❔ USO DO COMANDO ❔\n\n`,
            usuario_novo: "[ 🤖 Boas Vindas ao {p1} 🤖]\n\n"+
            `👋 Olá {p2}, vi que você é um usuário novo para abrir o menu de comandos digite *${prefixo}menu*`,
            entrada_grupo: "Saudações *{p1}* , se tiverem alguma dúvida só digitar "+`*${prefixo}menu*`,
            cmd_erro: "[❗] Ops, parece que você usou o comando *{p1}* incorretamente ou não sabe como utilizá-lo. Quer aprender a usar?\n\n Digite :\n  - Ex: *{p2} guia* para ver o guia.",
            erro_comando_codigo: "[❗] Houve um erro no comando *{p1}*, relate ao administrador ou tente novamente mais tarde.",
            erro_api : "[❗] Houve um erro no comando *{p1}*.\n\n"+
            "Motivo: *{p2}*\n",
            resposta_ban : "🤖✅ Entendido, +{p1} será banido.\n\n"+
            "Motivo : {p2}\n"+
            "Quem baniu : {p3}",
            fila_comando: "⏳ O bot está atendendo muitas pessoas ao mesmo tempo, tenha paciência!\n\n"+
            "Atualmente existem *{p1}* comandos na fila de espera.",
            visualizacao_unica: "[❗] Por privacidade do grupo não foi possivel usar o seu comando em uma mensagem de visualização única. Este recurso só está disponível em mensagens privadas.",
            desconectado:{
                comando: "A conexão com o WhatsApp foi encerrada pelo comando do Administrador.",
                falha_grave: "A conexão com o WhatsApp foi encerrada devido a uma falha grave no código.",
                deslogado: "A sua sessão com o WhatsApp foi deslogada, leia o código QR novamente.",
                reiniciar: "A sua conexão com o WhatsApp precisa ser reiniciada, tentando reconectar...",
                conexao: "A sua conexão com o WhatsApp foi encerrada, tentando reconectar... Motivo : {p1} - {p2}"
            },
            permissao: {
                grupo: '[❗] Este comando só pode ser usado em grupos',
                bot_admin: '[❗] Permita que o BOT tenha permissões administrativas.',
                banir_admin : '[❗] O Bot não tem permissão para banir um administrador',
                apenas_admin : '[❗] Apenas administradores podem usar este comando.',
                apenas_dono_bot: '[❗] Apenas o dono do BOT pode usar este comando',
                apenas_dono_grupo: '[❗] Apenas o dono do GRUPO pode usar este comando.',
            }
        }
    }
    return comandos
}

export function verificarComandoExiste(botInfo, comando, categoria = null){
    const {prefixo} = botInfo
    const comandosAtuais = comandosInfo(botInfo)
    const categoriasExistentes = Object.keys(comandosAtuais).filter(key => key != 'outros')
    let comandos
    if(!categoria){
        comandos = [
            ...Object.keys(comandosAtuais.utilidades),
            ...Object.keys(comandosAtuais.ia || {}),
            ...Object.keys(comandosAtuais.diversao),
            ...Object.keys(comandosAtuais.info),
            ...Object.keys(comandosAtuais.grupo),
            ...Object.keys(comandosAtuais.admin),
            ...Object.keys(comandosAtuais.figurinhas),
            ...Object.keys(comandosAtuais.downloads),
        ].map(comando => prefixo+comando)
    } else {
        if(!categoriasExistentes.includes(categoria)) return []
        comandos = Object.keys(comandosAtuais[categoria] || {}).map(comando => prefixo+comando)
    }
    return comandos.includes(comando)
}

export function obterGuiaComando(categoria, comando, botInfo){
    const cabecalho = comandosInfo(botInfo).outros.cabecalho_guia
    const {prefixo} = botInfo
    comando = comando.replace(prefixo, '')
    const comandosCategoria = comandosInfo(botInfo)[categoria]
    return cabecalho+comandosCategoria[comando]?.guia ?? ''
}

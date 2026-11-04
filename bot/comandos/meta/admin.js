/** Metadados da categoria `admin` (gerado/fatiado de comandos.js). */
export function metaAdmin({ prefixo, nome_adm, nome_bot }) {
    return {
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
            painelbot: {
                descricao: 'Painel global do bot + lista de grupos + dump por grupo',
                guia:
                    `Ex: *${prefixo}painelbot* — Dump global + lista de todos os grupos.\n` +
                    `Ex: *${prefixo}painelbot grupo* 3 — Dump completo do 3º grupo da lista.\n` +
                    `Ex: *${prefixo}painelbot grupo* <id> — Dump por id.\n` +
                    `Ex: *${prefixo}painelbot* pv|autosticker|autorevelar|limitediario — Alterna.\n` +
                    `Ex: *${prefixo}painelbot cotas* — Cotas das IAs.\n` +
                    `*Só dono.* Alias: *${prefixo}infobot*\n`,
                msgs: {}
            },
            infobot: {
                descricao: 'Alias de !painelbot (dump global)',
                guia: `Ex: *${prefixo}infobot* - Mesmo que *${prefixo}painelbot*.\n`,
                msgs: {}
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
                descricao: 'Limpeza de cache/temp (leve por padrão)',
                guia:
                    `Ex: *${prefixo}limpar* — Limpeza leve: temp antigo, TTL de msgs/histórico, arquivos .bak.\n` +
                    `Ex: *${prefixo}limpar tudo* — Wipe completo (inclui histórico de grupos / memória de resumo).\n` +
                    `*Mantém* usuários, grupos, contador, sessão e bot.json.\n` +
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
            cotasia: {
                descricao: 'Mostra créditos/cotas das IAs configuradas',
                guia:
                    `Ex: *${prefixo}cotasia* - Consulta saldo/status de Gemini, OpenRouter, Tavily, Brave, RapidAPI, ElevenLabs.\n` +
                    `*Só dono do bot.*\n`,
                msgs: {}
            }
        }
}

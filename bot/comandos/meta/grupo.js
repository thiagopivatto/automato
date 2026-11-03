/** Metadados da categoria `grupo` (gerado/fatiado de comandos.js). */
export function metaGrupo({ prefixo, nome_adm, nome_bot }) {
    return {
            statusgrupo: {
                descricao: 'Publica o texto ou imagem respondida no status deste grupo',
                guia: `Responda um *texto ou imagem* com *${prefixo}statusgrupo*.\nImagens mantêm a legenda original. A publicação é feita no status do grupo de origem.\n`,
                msgs: {}
            },
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
                        ofensa:{
                            on: "Recurso Ofensa : ✅\n",
                            off: "Recurso Ofensa : ❌\n"
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
            voteban: {
                descricao: 'Abre votação para banir um membro',
                guia:
                    `*Como usar ${prefixo}voteban*\n\n` +
                    `1) Iniciar: *${prefixo}voteban* @membro  *ou* responda a msg da pessoa com *${prefixo}voteban*\n` +
                    `2) Votar: *${prefixo}voteban*  *ou*  *${prefixo}votar*\n` +
                    `3) Ver: *${prefixo}voteban status*\n` +
                    `4) Cancelar (admin): *${prefixo}voteban cancelar*\n\n` +
                    `• Precisa de 3–5 votos (conforme tamanho do grupo)\n` +
                    `• Vale por 2 minutos\n` +
                    `• Não banir admin/bot\n` +
                    `• O bot precisa ser *admin* do grupo\n`,
                msgs: {
                    iniciada:
                        '🗳️ *Votação de ban* aberta contra @{p1}\n' +
                        'Precisa de *{p2}* votos · tempo: *{p3}s*\n' +
                        `Vote com *{p4}voteban* ou *{p4}votar*`,
                    voto_ok: '✅ Voto computado contra @{p1}\nProgresso: *{p2}/{p3}* · resta *{p4}s*',
                    banido: '🔨 @{p1} foi banido por votação (*{p2}* votos).',
                    ja_votou: '[❗] Você já votou nesta rodada.',
                    voto_alvo: '[❗] O alvo não pode votar na própria expulsão.',
                    sem_votacao: '[❗] Não há votação de ban aberta neste grupo.',
                    ja_ativa: '[❗] Já existe votação aberta contra @{p1} ({p2}/{p3}). Use *status* ou vote nela.',
                    status: '🗳️ Votação contra @{p1}: *{p2}/{p3}* votos · resta *{p4}s*',
                    cancelada: '✅ Votação de ban cancelada.',
                    alvo_admin: '[❗] Não dá pra abrir voteban em administrador.',
                    alvo_bot: '[❗] Não dá pra banir o bot.',
                    nao_membro: '[❗] Essa pessoa não está no grupo.',
                    banir_erro: '[❗] Atingiu os votos, mas não consegui banir (permissão/já saiu).'
                }
            },
            votar: {
                descricao: 'Vota na votação de ban aberta',
                guia: `Ex: *${prefixo}votar* - Confirma seu voto na *${prefixo}voteban* aberta.\n`,
                msgs: {}
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
            shh: {
                descricao: 'Silencia um membro (apaga msgs) por X min ou até off',
                guia:
                    `Ex: *${prefixo}shh* @membro 1 - Silencia por 1 minuto (apaga as msgs dele).\n` +
                    `Ex: *${prefixo}shh* @membro - Silencia por tempo indeterminado.\n` +
                    `Ex: *${prefixo}shh* @membro off - Remove o silêncio.\n` +
                    `Ex: Responder alguém com *${prefixo}shh* 5 - Silencia o respondido por 5 min.\n` +
                    `*Obs*: Só admins. Não funciona no dono do grupo. O bot precisa ser admin.\n`,
                msgs: {
                    ligado_tempo: "🤫 @{p1} silenciado por *{p2} min*. Mensagens serão apagadas.",
                    ligado_eterno: "🤫 @{p1} silenciado por tempo indeterminado. Use *shh @membro off* para liberar.",
                    off: "🔊 @{p1} não está mais silenciado.",
                    nao_silenciado: "[❗] @{p1} não estava silenciado.",
                    erro_dono: "[❗] Não é possível silenciar o dono do grupo.",
                    erro_bot: "[❗] Não dá para silenciar o bot."
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
                guia: `Ex: *${prefixo}alink* - Liga/desliga o antilink e apaga a mensagem de quem postar link.\n`+
                `*Dono e admins do grupo* podem enviar links normalmente.\n`,
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
            ofensa: {
                descricao: 'Rebate ofensas com resposta bem mais pesada (ligado por padrão)',
                guia:
                    `Ex: *${prefixo}ofensa* on — Liga (padrão).\n` +
                    `Ex: *${prefixo}ofensa* off — Desliga.\n` +
                    `Ex: *${prefixo}ofensa* — Mostra se está ligada/desligada.\n` +
                    `Quando alguém xinga no grupo, o bot devolve uma ofensa bem pior. ` +
                    `Se a ofensa for contra membro do grupo ou pessoa pública, o bot defende a vítima ` +
                    `(exceto temas gravíssimos). *Apenas admins.*\n`,
                msgs: {
                    ligado:
                        '✅ OFENSA ativada! Se alguém xingar, o bot responde bem mais pesado (e defende membro/figura pública).',
                    desligado: '✅ OFENSA desativada.'
                }
            },
            personalidade: {
                descricao: 'Define a personalidade do bot neste grupo (chat, resumo, etc.)',
                guia:
                    `Ex: *${prefixo}personalidade* fala como um tiozão fofoqueiro e chato\n` +
                    `Ex: *${prefixo}personalidade* ver — Mostra a atual\n` +
                    `Ex: *${prefixo}personalidade* padrão — Volta ao padrão do bot\n` +
                    `Vale para *chat*, *@bot*, *resumodogrupo*, automsg e afins. *Apenas admins.*\n`,
                msgs: {}
            },
            automsg: {
                descricao: 'Interações humanas esporádicas no grupo',
                guia:
                    `Ex: *${prefixo}automsg* ativar — Liga interações automáticas (ligado por padrão).\n` +
                    `Ex: *${prefixo}automsg* desativar — Desliga.\n` +
                    `Ex: *${prefixo}automsg* — Alterna o estado.\n` +
                    `Comenta o papo como pessoa real, com intervalos longos. *Apenas admins.* Sem madrugada.\n`,
                msgs: {
                    ligado:
                        '✅ AUTO-MSG ativado! O bot entra na conversa de vez em quando, de forma natural (sem spam e sem madrugada).',
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
                guia:
                    `Ao *receber* visualização única (foto/vídeo/áudio/voz), o bot reenvia automaticamente como mídia normal.\n` +
                    `Manual: responda a VO com *${prefixo}revelar* (admin).\n`,
                msgs: {}
            },
        }
}

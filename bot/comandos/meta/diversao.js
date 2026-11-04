/** Metadados da categoria `diversao` (gerado/fatiado de comandos.js). */
export function metaDiversao({ prefixo, nome_adm, nome_bot }) {
    return {
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
        }
}

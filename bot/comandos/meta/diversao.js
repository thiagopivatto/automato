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
            cancelado: {
                descricao: 'Cancelamento humorístico em áudio',
                guia: `Ex: *${prefixo}cancelado* - Gera cancelamento engraçado (texto + voz).\nEx: *${prefixo}cancelado* @membro\n`,
                msgs: {}
            },
            horoscopo: {
                descricao: 'Horóscopo engraçado personalizado',
                guia: `Ex: *${prefixo}horoscopo* - Horóscopo engraçado.\nEx: *${prefixo}horoscopo* @membro\nEx: *${prefixo}horoscopo* leão\n`,
                msgs: {}
            }
        }
}

/** Metadados da categoria `info` (gerado/fatiado de comandos.js). */
export function metaInfo({ prefixo, nome_adm, nome_bot }) {
    return {
            menu: {
                descricao: 'Lista completa de comandos (exceto dono)',
                guia:
                    `Ex: *${prefixo}menu* - Lista *todos* os comandos com breve explicação.\n` +
                    `Alias: *${prefixo}comandos*\n` +
                    `Ajuda de um comando: *${prefixo}comando guia*\n`,
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
            comandos: {
                descricao: 'Alias de !menu — lista completa de comandos',
                guia: `Ex: *${prefixo}comandos* - Mesmo que *${prefixo}menu*.\n`,
                msgs: {}
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
        }
}

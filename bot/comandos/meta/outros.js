/** Metadados da categoria `outros` (gerado/fatiado de comandos.js). */
export function metaOutros({ prefixo, nome_adm, nome_bot }) {
    return {
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
            erro_api:
                '[❗] Não consegui completar *{p1}* por erro de API. Tenta de novo em instantes.\n',
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

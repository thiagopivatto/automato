/** Metadados da categoria `downloads` (gerado/fatiado de comandos.js). */
export function metaDownloads({ prefixo, nome_adm, nome_bot }) {
    return {
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
        }
}

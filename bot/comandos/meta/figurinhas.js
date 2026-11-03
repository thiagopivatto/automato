/** Metadados da categoria `figurinhas` (gerado/fatiado de comandos.js). */
export function metaFigurinhas({ prefixo, nome_adm, nome_bot }) {
    return {
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
        }
}

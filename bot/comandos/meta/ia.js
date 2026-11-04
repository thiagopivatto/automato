/** Metadados da categoria `ia` (gerado/fatiado de comandos.js). */
export function metaIa({ prefixo, nome_adm, nome_bot }) {
    return {
            comofaz: {
                descricao: '',
                guia: `Ex: *${prefixo}comofaz* - Busca um artigo aleatório do WikiHow (como fazer algo).\n`,
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
            resumodogrupo: {
                descricao: 'Narrador agressivo/egocêntrico do grupo em áudio (3–5 min)',
                guia:
                    `Ex: *${prefixo}resumodogrupo* - Nota de voz de *3 a 5 min*, tom rebelde, egocêntrico e com palavrão.\n` +
                    `Na próxima vez, só entra o que foi dito *depois* deste pedido (anti-repetição).\n` +
                    `Personalidade deste chat: *${prefixo}personalidade*\n` +
                    `*Requisitos:* grupo; bot coletando mensagens.\n`,
                msgs: {}
            },
            resumoportema: {
                descricao: 'Resumo do grupo separado por temas (últimas ~1000 msgs)',
                guia:
                    `Ex: *${prefixo}resumoportema* - Lê ~1000 mensagens recentes (inclui áudios transcritos) e monta um resumo por temas.\n` +
                    `Cita membros e separa tópicos (futebol, cinema, conversas aleatórias, etc).\n` +
                    `*Requisitos:* grupo; bot online coletando o histórico.\n`,
                msgs: {}
            },
            personalidaderesumo: {
                descricao: 'Define a personalidade do resumodogrupo só neste grupo',
                guia:
                    `Ex: *${prefixo}personalidaderesumo* fala como um tiozão fofoqueiro e chato\n` +
                    `Ex: *${prefixo}personalidaderesumo* ver - Mostra a personalidade atual\n` +
                    `Ex: *${prefixo}personalidaderesumo* reset - Volta ao padrão agressivo/egocêntrico\n` +
                    `Alias: *${prefixo}resumopersona*\n` +
                    `*Apenas admin do grupo* (ou dono do bot).\n`,
                msgs: {}
            },
        }
}

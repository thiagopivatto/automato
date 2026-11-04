/** Metadados da categoria `ia` (gerado/fatiado de comandos.js). */
export function metaIa({ prefixo, nome_adm, nome_bot }) {
    return {
            comofaz: {
                descricao: 'Tutorial aleatório do WikiHow (passos claros)',
                guia: `Ex: *${prefixo}comofaz* - Busca um artigo aleatório do WikiHow e formata os passos.\n`,
                msgs: {}
            },
            playlist: {
                descricao: 'Playlist curada (20+ faixas) com vibe e justificativa',
                guia: `Ex: *${prefixo}playlist* rock anos 80 pra churrasco - Lista 20+ músicas reais + por quê.\n`,
                msgs: {}
            },
            explica: {
                descricao: 'Explica qualquer assunto em linguagem clara (Ultron)',
                guia:
                    `Ex: *${prefixo}explica* o que é inflação\n` +
                    `Ex: Responda um texto com *${prefixo}explica*\n` +
                    `Saída: resumo em 1 frase + como funciona + exemplo.\n`,
                msgs: {}
            },
            spoiler: {
                descricao: 'Spoiler completo de filme/série (sem frescura)',
                guia: `Ex: *${prefixo}spoiler* Interestelar - Premissa, enredo, twists e final.\n`,
                msgs: {}
            },
            argumentos: {
                descricao: 'Argumentos a favor e contra + veredito',
                guia: `Ex: *${prefixo}argumentos* home office - Pró, contra e veredito direto.\n`,
                msgs: {}
            },
            proscons: {
                descricao: 'Prós, contras e se vale a pena',
                guia: `Ex: *${prefixo}proscons* iPhone 16 - Lista concreta + recomendação.\n`,
                msgs: {}
            },
            comparar: {
                descricao: 'Comparativo lado a lado com recomendação',
                guia: `Ex: *${prefixo}comparar* Android vs iPhone\nEx: *${prefixo}comparar* item1 vs item2\n`,
                msgs: {}
            },
            cotacao: {
                descricao: '',
                guia: `Ex: *${prefixo}cotacao* PETR4 - Cotação B3/NASDAQ/NYSE/cripto.\n`+
                `Ex: *${prefixo}cotacao* BTC\nEx: *${prefixo}cotacao* AAPL\n`,
                msgs: {}
            },
            simulado: {
                descricao: 'Prova de 10 questões com gabarito comentado',
                guia: `Ex: *${prefixo}simulado* história do Brasil - 10 questões A–D + gabarito.\n`,
                msgs: {}
            },
            roteiro: {
                descricao: 'Roteiro de vídeo com gancho, blocos e CTA',
                guia: `Ex: *${prefixo}roteiro* review de fone barato - Estrutura pronta pra gravar.\n`,
                msgs: {}
            },
            resuma: {
                descricao: 'Resume texto longo em bullets + 1 frase',
                guia: `Ex: Responda uma mensagem com *${prefixo}resuma*\n`+
                `Ex: *${prefixo}resuma* texto longo...\n`,
                msgs: {}
            },
            upscale: {
                descricao: '',
                guia: `Ex: Envie/responda uma imagem com *${prefixo}upscale* - Aumenta a resolução.\n`,
                msgs: {}
            },
            criarimg: {
                descricao: 'Gera imagem por IA (Pollinations / HF / Gemini / Horde / Rapid)',
                guia:
                    `Ex: *${prefixo}criarimg* gato cyberpunk na chuva\n` +
                    `Alias: *${prefixo}criarimagem*\n` +
                    `Fontes: Pollinations → HF Flux → DeepAI → AI Horde → Gemini → Rapid.\n`,
                msgs: {
                    espera: '🎨 Gerando imagem…',
                    sem_prompt: '[❗] Digite o que quer na imagem. Ex: *{p1}criarimg* astronauta no Rio'
                }
            },
            musica: {
                descricao: 'Gera música por IA (ElevenLabs — só dono)',
                guia:
                    `Ex: *${prefixo}musica* prompt - Gera música por IA (ElevenLabs).\n` +
                    `*Só dono do bot* (consome créditos ElevenLabs).\n`,
                msgs: {}
            },
            resumodogrupo: {
                descricao: 'Narrador agressivo/egocêntrico do grupo em áudio (3–5 min)',
                guia:
                    `Ex: *${prefixo}resumodogrupo* - Nota de voz de *3 a 5 min*, tom rebelde, egocêntrico e com palavrão.\n` +
                    `Na próxima vez, só entra o que foi dito *depois* deste pedido (anti-repetição).\n` +
                    `Personalidade só deste resumo: *${prefixo}personalidaderesumo*\n` +
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
                descricao: 'Personalidade só do !resumodogrupo (não afeta o chat)',
                guia:
                    `Ex: *${prefixo}personalidaderesumo* fala como um tiozão fofoqueiro e chato\n` +
                    `Ex: *${prefixo}personalidaderesumo* ver - Mostra a personalidade atual\n` +
                    `Ex: *${prefixo}personalidaderesumo* reset - Volta ao padrão\n` +
                    `Alias: *${prefixo}resumopersona*\n` +
                    `Não altera *${prefixo}personalidade* (chat/automsg).\n` +
                    `*Apenas admin do grupo* (ou dono do bot).\n`,
                msgs: {}
            },
        }
}

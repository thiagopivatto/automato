import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { precisaPesquisaWeb } from '../../vendor/lbot-api-comandos/api/ia.js'
import { responderLocalUltron } from '../../vendor/lbot-api-comandos/api/resposta-local-chat.js'

/**
 * Falas reais de grupo. pesquisa=true só quando o pedido pede dado verificável.
 * A resposta local cobre o caso em que a IA não devolve texto.
 */
const CENARIOS = [
    { texto: 'oi', pesquisa: false },
    { texto: 'oi tudo bem', pesquisa: false },
    { texto: 'e aí, sumido', pesquisa: false },
    { texto: 'bom dia galera', pesquisa: false },
    { texto: 'boa tarde, quem tá on', pesquisa: false },
    { texto: 'boa noite pessoal', pesquisa: false },
    { texto: 'salve rapaziada', pesquisa: false },
    { texto: 'fala tu', pesquisa: false },
    { texto: 'blz contigo?', pesquisa: false },
    { texto: 'tudo bem?', pesquisa: false },
    { texto: 'kkk', pesquisa: false },
    { texto: 'kkkkkk que isso', pesquisa: false },
    { texto: 'haha para', pesquisa: false },
    { texto: 'obrigado pela força', pesquisa: false },
    { texto: 'valeu mesmo', pesquisa: false },
    { texto: 'tchau gente, fui', pesquisa: false },
    { texto: 'flw, até amanhã', pesquisa: false },
    { texto: 'como você tá', pesquisa: false },
    { texto: 'quem é você', pesquisa: false },
    { texto: 'você é um robô?', pesquisa: false },
    { texto: 'me xinga', pesquisa: false },
    { texto: 'me ofende logo', pesquisa: false },
    { texto: 'vai se foder', pesquisa: false },
    { texto: 'seu merda, cala a boca', pesquisa: false },
    { texto: 'idiota demais você', pesquisa: false },
    { texto: 'como assim?', pesquisa: false },
    { texto: 'o que vc acha disso', pesquisa: false },
    { texto: 'o que você acha do meu corte de cabelo', pesquisa: false },
    { texto: 'acha que eu devia ter respondido ela', pesquisa: false },
    { texto: 'concordo com você nessa', pesquisa: false },
    { texto: 'discordo total', pesquisa: false },
    { texto: 'conta uma piada aí', pesquisa: false },
    { texto: 'me dá um conselho, não sei o que fazer', pesquisa: false },
    { texto: 'hoje eu tô morto de cansado', pesquisa: false },
    { texto: 'que saco cheio desse expediente', pesquisa: false },
    { texto: 'ontem foi um dia horrível', pesquisa: false },
    { texto: 'agora eu só quero silêncio', pesquisa: false },
    { texto: 'tô com fome, alguém pede pizza', pesquisa: false },
    { texto: 'bora jantar depois do grupo', pesquisa: false },
    { texto: 'meu chefe me largou numa reunião inútil', pesquisa: false },
    { texto: 'odeio segunda no trabalho', pesquisa: false },
    { texto: 'terminei com o crush e tô um lixo', pesquisa: false },
    { texto: 'ciúme besta, eu sei', pesquisa: false },
    { texto: 'vamos ver um filme hoje à noite', pesquisa: false },
    { texto: 'essa série é arrastada demais', pesquisa: false },
    { texto: 'o filme de ontem me deixou puto', pesquisa: false },
    { texto: 'o jogo de truco foi roubado', pesquisa: false },
    { texto: 'perdemos o jogo de videogame feio', pesquisa: false },
    { texto: 'a galera não responde ninguém', pesquisa: false },
    { texto: 'o grupo tá uma bagunça hoje', pesquisa: false },
    { texto: 'ninguém fecha um assunto', pesquisa: false },
    { texto: 'você é foda, mandou bem', pesquisa: false },
    { texto: 'gostei de você nessa', pesquisa: false },
    { texto: 'para de drama', pesquisa: false },
    { texto: 'tá chapando', pesquisa: false },
    { texto: 'mentira descarada isso', pesquisa: false },
    { texto: 'eu não aguento mais esse assunto', pesquisa: false },
    { texto: 'deixa eu falar também', pesquisa: false },
    { texto: 'você sumiu o dia inteiro', pesquisa: false },
    { texto: 'faz tempo que não te vejo', pesquisa: false },
    { texto: 'ao mesmo tempo eu ri e fiquei com raiva', pesquisa: false },
    { texto: 'que calor humano nesse papo', pesquisa: false },
    { texto: 'me conta do rolê de sábado', pesquisa: false },
    { texto: 'a festa foi sem graça', pesquisa: false },
    { texto: 'comprei uma camisa e me arrependi', pesquisa: false },
    { texto: 'minha mãe ligou no meio da call', pesquisa: false },
    { texto: 'o cachorro comeu meu fone', pesquisa: false },
    { texto: 'tô indo pro mercado, já volto', pesquisa: false },
    { texto: 'segura aí que eu tô no banho', pesquisa: false },
    { texto: 'não gostei do jeito que falaram comigo', pesquisa: false },
    { texto: 'isso foi falta de respeito', pesquisa: false },
    { texto: 'para de me marcar à toa', pesquisa: false },
    { texto: 'eu já disse que não vou', pesquisa: false },
    { texto: 'que preguiça de responder o grupo', pesquisa: false },
    { texto: 'manda áudio, tô dirigindo', pesquisa: false },
    { texto: 'cheguei em casa agora', pesquisa: false },
    { texto: 'o almoço de hoje foi arroz e ovo', pesquisa: false },
    { texto: 'vou dormir, amanhã eu vejo isso', pesquisa: false },
    { texto: 'você tá online só pra zoar', pesquisa: false },
    { texto: 'não é pessoal, é o momento', pesquisa: false },
    { texto: 'esquece o que eu falei antes', pesquisa: false },
    { texto: 'repete com outras palavras', pesquisa: false },
    { texto: 'tá, deixa pra lá', pesquisa: false },
    { texto: 'eu pensei o dia todo nisso e não cheguei em nada', pesquisa: false },
    { texto: 'o pessoal mistura as conversas e eu me perco', pesquisa: false },
    { texto: 'fulano falou uma coisa e ciclano entendeu outra', pesquisa: false },
    { texto: 'bom dia, hoje o grupo acordou manso', pesquisa: false },
    { texto: 'boa noite, amanhã a gente continua essa briga', pesquisa: false },

    { texto: 'qual é a capital da França', pesquisa: true },
    { texto: 'notícia sobre o dólar hoje', pesquisa: true },
    { texto: 'quem é o presidente do Brasil', pesquisa: true },
    { texto: 'quanto está o bitcoin agora?', pesquisa: true },
    { texto: 'me diga o placar do jogo de ontem', pesquisa: true },
    { texto: 'placar do Corinthians hoje', pesquisa: true },
    { texto: 'cotação do dólar', pesquisa: true },
    { texto: 'resultados de jogos ao vivo', pesquisa: true },
    { texto: 'jogos ao vivo agora', pesquisa: true },
    { texto: 'quais os placares de hoje', pesquisa: true },
    { texto: 'notícias climáticas hoje', pesquisa: true },
    { texto: 'previsão do tempo em Curitiba', pesquisa: true },
    { texto: 'vai chover amanhã em Santos', pesquisa: true },
    { texto: 'ibovespa agora', pesquisa: true },
    { texto: 'quanto tá o euro', pesquisa: true },
    { texto: 'preço da gasolina hoje', pesquisa: true },
    { texto: 'quem ganhou o jogo do Flamengo', pesquisa: true },
    { texto: 'jogos de hoje do brasileirão', pesquisa: true },
    { texto: 'libertadores ao vivo', pesquisa: true },
    { texto: 'resultado do Grêmio agora', pesquisa: true },
    { texto: 'selic hoje', pesquisa: true },
    { texto: 'notícias de política agora', pesquisa: true },
    { texto: 'notícias de tecnologia hoje', pesquisa: true },
    { texto: 'quando estreia a série nova', pesquisa: true },
    { texto: 'lançamento do filme essa semana', pesquisa: true },
    { texto: 'onde fica Machu Picchu', pesquisa: true },
    { texto: 'quem inventou a lâmpada', pesquisa: true },
    { texto: 'qual a população do Brasil', pesquisa: true },
    { texto: 'qual o salário mínimo', pesquisa: true },
    { texto: 'temperatura em Recife agora', pesquisa: true },
    { texto: 'como está o tempo em Belém', pesquisa: true },
    { texto: 'alerta de temporal em Santa Catarina', pesquisa: true },
    { texto: 'eleição americana hoje', pesquisa: true },
    { texto: 'fato sobre a copa do mundo', pesquisa: true },
    { texto: 'campeonato brasileiro de hoje', pesquisa: true },
    { texto: 'em tempo real, como tá o dólar', pesquisa: true },
    { texto: 'explica o bitcoin pra mim agora', pesquisa: true },
    { texto: 'quais os jogos de hoje', pesquisa: true },
    { texto: 'o que aconteceu no jogo ontem', pesquisa: true },
    { texto: 'quanto custa um bitcoin', pesquisa: true },

    { texto: 'oi mestre, cheguei', pesquisa: false, dono: true },
    { texto: 'preciso de um conselho seu', pesquisa: false, dono: true },
    { texto: 'valeu por ontem', pesquisa: false, dono: true },
    { texto: 'como você tá hoje', pesquisa: false, dono: true },
    { texto: 'me xinga só de brincadeira', pesquisa: false, dono: true },
    { texto: 'cotação do dólar, por favor', pesquisa: true, dono: true },
    { texto: 'vai chover em Campinas?', pesquisa: true, dono: true },

    {
        texto: 'quantos graus faz em São Paulo',
        pesquisa: true,
        fonte: 'São Paulo agora faz 22,7°C, sensação 25, névoa e umidade em 81 por cento.',
        token: '22,7'
    },
    {
        texto: 'placar do Flamengo hoje',
        pesquisa: true,
        fonte: 'Brasileirão: Flamengo 3x1 Grêmio, jogo encerrado nesta rodada.',
        token: '3x1'
    },
    {
        texto: 'como tá o clima',
        pesquisa: true,
        fonte: 'SEM_CIDADE: falta a cidade para consultar o tempo.',
        token: 'cidade'
    }
]

const PROIBIDO =
    /erro de api|engasgad|pane geral|todos os provedores falharam|cota\/limites|ouvi:|claro,? posso ajudar|excelente pergunta|fico feliz em ajudar/i

describe('chat em 100 cenas reais', () => {
    it('tem pelo menos 100 falas diferentes', () => {
        const unicos = new Set(CENARIOS.map((c) => c.texto))
        assert.ok(unicos.size >= 100, `cenários únicos: ${unicos.size}`)
    })

    for (const cena of CENARIOS) {
        it(cena.texto.slice(0, 70), () => {
            assert.equal(precisaPesquisaWeb(cena.texto), cena.pesquisa, cena.texto)
            const resp = responderLocalUltron(cena.texto, {
                ehDono: !!cena.dono,
                factual: cena.pesquisa && !cena.fonte,
                pesquisa: cena.fonte || ''
            })
            assert.ok(String(resp).trim().length > 8, resp)
            assert.equal(PROIBIDO.test(resp), false, resp)
            assert.equal(/\b\d{12,}\b/.test(resp), false, resp)
            if (!cena.pesquisa && !cena.fonte) {
                assert.equal(/não invento número|sem dado novo pra cravar/i.test(resp), false, resp)
            }
            if (cena.pesquisa && !cena.fonte) {
                assert.match(
                    resp,
                    /não invento|não vou chutar|não afirmo|sem chute|não verifiquei|sem a fonte|calo o número|não saiu a checagem|não vou fabricar/i
                )
            }
            if (cena.token) assert.match(resp, new RegExp(cena.token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
            if (cena.dono) {
                assert.equal(/\b(porra|caralho|merda|foder|vsf|idiota|burro|otario)\b/i.test(resp), false, resp)
            }
        })
    }

    it('o papo comum não abre sempre do mesmo jeito', () => {
        const inicios = new Set(
            CENARIOS.filter((c) => !c.pesquisa && !c.dono).map((c) =>
                responderLocalUltron(c.texto, { factual: false }).slice(0, 22)
            )
        )
        assert.ok(inicios.size >= 12, `aberturas: ${inicios.size}`)
    })

    it('fala rotulada de grupo continua sendo conversa', () => {
        const resp = responderLocalUltron('[Maria]: bom dia, dormi tarde', { factual: false })
        assert.ok(resp.trim().length > 8)
        assert.equal(/não invento número|erro de api/i.test(resp), false)
    })

    it('crise não vira zoação nem método', () => {
        const resp = responderLocalUltron('eu quero morrer, sério', { factual: false })
        assert.match(resp, /188/)
        assert.equal(/\b(corda|lâmina|rem[eé]dio|dose)\b/i.test(resp), false)
    })
})

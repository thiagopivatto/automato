import axios from 'axios'
import {prettyNum} from 'pretty-num'
import { rastrearEncomendas } from 'correios-brasil'
import { translate } from '@vitalets/google-translate-api'
import Genius from 'genius-lyrics'
import { JSDOM } from 'jsdom'
import qs from 'querystring'
import { timestampParaData } from '../lib/util.js'
import {obterDadosBrasileiraoA, obterDadosBrasileiraoB} from '@victorsouzaleal/brasileirao'
import UserAgent from 'user-agents'


/** @deprecated comando !animes removido */
export const obterAnimesLancamento = async () => {
    throw { erro: 'Comando removido.' }
}

/** @deprecated comando !mangas removido */
export const obterMangasLancamento = async () => {
    throw { erro: 'Comando removido.' }
}

export const obterDadosBrasileirao = async(serie = "A")=>{
    return new Promise(async(resolve,reject)=>{
        try{
            let resposta = {}
            let dadosBrasileirao
            try {
                if(serie === 'A') dadosBrasileirao = await obterDadosBrasileiraoA()
                else if(serie === 'B') dadosBrasileirao = await obterDadosBrasileiraoB()
                else {
                    resposta.erro = "A série inserida não é suportada, apenas A e B."
                    reject(resposta)
                    return
                }
            } catch(pkgErr) {
                console.log(`API obterDadosBrasileirao package - ${pkgErr.message}`)
                reject({erro: `Houve um erro ao obter os dados da tabela do Brasileirão no servidor.`})
                return
            }

            const rodadas = Array.isArray(dadosBrasileirao?.rodadas) ? dadosBrasileirao.rodadas : []
            let rodada_atual = rodadas.filter(rodada => rodada.rodada_atual == true)
            if (!rodada_atual.length) {
                rodada_atual = rodadas.length ? [rodadas[rodadas.length - 1]] : []
            }

            resposta.resultado = {
                tabela: dadosBrasileirao?.tabela || [],
                rodada_atual,
                rodadas
            }
            resolve(resposta)
        } catch(err){
            console.log(`API obterDadosBrasileirao - ${err.message}`)
            reject({erro: `Houve um erro ao obter os dados da tabela do Brasileirão no servidor.`})
        }
    })
}

export const top20TendenciasDia = async(tipo = 'filmes')=>{
    return new Promise(async(resolve,reject)=>{
        try{
            let resposta = {}
            let num = 0
            switch(tipo){
                case "filmes":
                    tipo = "movie"
                    break
                case "series":
                    tipo = "tv"
                    break
            }
            await axios.get(`https://api.themoviedb.org/3/trending/${tipo}/day?api_key=6618ac868ff51ffa77d586ee89223f49&language=pt-BR`)
            .then(({data})=>{
                const dados = data.results.map((item)=>{
                    num++;
                    return `${num}°: *${item.title || item.name}.*\n\`Sinopse:\` ${item.overview} \n`
                    }).join('\n');
                resposta.resultado = dados
                resolve(resposta)
            }).catch(() =>{
                resposta.erro = `Houve um erro no servidor ao listar ${tipo === 'movie' ? "os filmes":tipo === 'tv' && "as séries"}.`
                reject(resposta)
            })
        } catch(err){
            console.log(`API top20TendenciasDia- ${err.message}`)
            reject({erro: `Houve um erro no servidor ao listar ${tipo === 'movie' ? "os filmes":tipo === 'tv' && "as séries"}.`})
        }
    })
}

export const obterCalculo = async (expressao) =>{
    return new Promise (async (resolve, reject)=>{
        try{
            let resposta = {}
            expressao = expressao.replace(/[Xx\xD7]/g, "*")
            expressao = expressao.replace(/\xF7/g, "/")
            expressao = expressao.replace(/,/g,".")
            expressao = expressao.replace("em","in")
            await axios.post(`https://api.mathjs.org/v4/`,{expr: expressao}).then((res)=>{
                let resultado = res.data.result
                if(resultado == "NaN" || resultado == "Infinity"){
                    resposta.erro = 'Foi feita uma divisão por 0 ou algum outro cálculo inválido.'
                    reject(resposta)
                }
                resultado = resultado.split(" ")
                resultado[0] = (resultado[0].includes("e")) ? prettyNum(resultado[0]) : resultado[0]
                resposta.resultado = resultado.join(" ")
                resolve(resposta)
            }).catch(()=>{
                resposta.erro = 'Houve um erro no servidor de cálculo.'
                reject(resposta)
            })
        } catch(err){
            console.log(`API obterCalculo- ${err.message}`)
            reject({erro: 'Houve um erro no servidor de cálculo.'})
        }
    })
}

/** @deprecated comando !noticias removido */
export const obterNoticias = async () => {
    throw { erro: 'Comando removido.' }
}

export const obterTraducao = async (texto, idioma)=>{
    return new Promise(async (resolve, reject)=>{
        try {
            let resposta = {}
            await translate(texto , {to: idioma}).then((res)=>{
                resposta.resultado = res.text
                resolve(resposta)
            }).catch(()=>{
                resposta.erro = "Houve um erro em processar a tradução."
                reject(resposta)
            })
        } catch(err){
            console.log(`API obterTraducao - ${err.message}`)
            reject({erro: "Houve um erro em processar a tradução."})
        }
    })
}


export const encurtarLink = async(link)=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {}
            await axios.post("https://shorter.me/page/shorten", qs.stringify({url : link, alias: '', password: ''})).then(({data})=>{
                if(!data.data){
                    resposta.erro = `O link que você inseriu é inválido.`
                    reject(resposta)
                } else {
                    resposta.resultado = data.data
                    resolve(resposta)
                }
            }).catch(err =>{
                resposta.erro = `Houve um erro no servidor do encurtador de link.`
                reject(resposta)
            })
        } catch(err){
            console.log(`API encurtarLink - ${err.message}`)
            reject({erro: `Houve um erro no servidor do encurtador de link`})
        }
    })
}

export const obterRastreioCorreios = async (codigoRastreio) =>{
    return new Promise(async (resolve,reject)=>{
        try{
            let resposta = {}
            await rastrearEncomendas([codigoRastreio]).then((res)=>{
                if(!res?.[0] || res[0].length < 1){
                    resposta.erro = 'Parece que este objeto ainda não foi postado ou não existe'
                    reject(resposta)
                } else {
                    resposta.resultado = res[0]
                    resolve(resposta)
                }
            }).catch(()=>{
                resposta.erro = 'Rastreio dos Correios indisponível no momento (API pública instável).'
                reject(resposta)
            })
        } catch(err){
            console.log(`API obterRastreioCorreios - ${err.message}`)
            reject({erro: "Rastreio dos Correios indisponível no momento (API pública instável)."})
        }  
    })
}

export const obterPesquisaWeb = async (texto) =>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {}
            const { data: html } = await axios.get('https://html.duckduckgo.com/html/', {
                params: { q: String(texto || '').trim() },
                headers: { 'User-Agent': new UserAgent().toString() },
                timeout: 15000
            })
            const dom = new JSDOM(String(html || ''))
            const cards = [...dom.window.document.querySelectorAll('.result')]
            const resultados = cards.slice(0, 10).map((el) => {
                const a = el.querySelector('a.result__a')
                const snip = el.querySelector('.result__snippet')
                let link = a?.getAttribute('href') || ''
                // DDG às vezes envolve o destino em /l/?uddg=
                try {
                    const u = new URL(link, 'https://duckduckgo.com')
                    if (u.pathname === '/l/' && u.searchParams.get('uddg')) {
                        link = decodeURIComponent(u.searchParams.get('uddg'))
                    }
                } catch { /* mantém link cru */ }
                return {
                    titulo: (a?.textContent || '').trim(),
                    link,
                    descricao: (snip?.textContent || '').trim()
                }
            }).filter((r) => r.titulo && r.link)
            if(!resultados?.length){
                resposta.erro = "Não foram encontrados resultados para esta pesquisa."
                reject(resposta)
                return
            }
            resposta.resultado = resultados
            resolve(resposta)
        } catch(err) {
            console.log(`API obterPesquisaWeb - ${err.message}`)
            reject({erro: "Houve um erro no servidor de pesquisa."})
        }
    })
}

export const obterClima = async (local) =>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {}
            const climaAPIURL = `http://api.weatherapi.com/v1/forecast.json?key=516f58a20b6c4ad3986123104242805&q=${encodeURIComponent(local)}&days=3&aqi=no&alerts=no`
            await axios.get(climaAPIURL).then(async ({data})=>{
                const {data: condicoesClima} = await axios.get("https://www.weatherapi.com/docs/conditions.json", {responseType: 'json'})
                const condicaoAtual = (condicoesClima.find((condicao)=> condicao.code == data.current.condition.code)).languages.find((idioma) => idioma.lang_iso == 'pt')
                let clima = {
                    local: {
                        nome: data.location.name,
                        estado: data.location.region,
                        pais: data.location.country,
                        horario_atual: timestampParaData(data.location.localtime_epoch * 1000)
                    },
                    atual: {
                        ultima_atualizacao: timestampParaData(data.current.last_updated_epoch * 1000),
                        temp: `${data.current.temp_c} C°`,
                        sensacao: `${data.current.feelslike_c} C°`,
                        condicao: data.current.is_day ? condicaoAtual.day_text : condicaoAtual.night_text,
                        vento: `${data.current.wind_kph} Km/h`,
                        umidade: `${data.current.humidity} %`,
                        nuvens: `${data.current.cloud} %`
                    },
                    previsao: []
                }

                data.forecast.forecastday.forEach((previsao)=>{
                    const condicaoDia = (condicoesClima.find((condicao)=> condicao.code == previsao.day.condition.code)).languages.find((idioma) => idioma.lang_iso == 'pt')
                    const [ano, mes, dia] = previsao.date.split("-")
                    const dadosPrevisao = {
                        data : `${dia}/${mes}/${ano}`,
                        max: `${previsao.day.maxtemp_c} C°`,
                        min: `${previsao.day.mintemp_c} C°`,
                        media: `${previsao.day.avgtemp_c} C°`,
                        condicao: `${condicaoDia.day_text}`,
                        max_vento: `${previsao.day.maxwind_kph} Km/h`,
                        chuva : `${previsao.day.daily_will_it_rain ? "Sim" : "Não"}`,
                        chance_chuva : `${previsao.day.daily_chance_of_rain} %`,
                        neve: `${previsao.day.daily_will_it_snow ? "Sim" : "Não"}`,
                        chance_neve : `${previsao.day.daily_chance_of_snow} %`,
                        uv: previsao.day.uv
                    }
                    clima.previsao.push(dadosPrevisao)
                })

                resposta.resultado = clima
                resolve(resposta)
            }).catch(()=>{
                resposta.erro = "Houve um erro no servidor de pesquisa de clima."
                reject(resposta)
            })
        } catch(err){
            console.log(`API obterClima - ${err.message}`)
            reject({erro: "Houve um erro no servidor de pesquisa de clima."})
        }
    })
}

export const obterLetraMusica = async (texto) =>{
    return new Promise(async (resolve,reject)=>{
        try{
            let resposta = {}
            const Client = new Genius.Client()
            await Client.songs.search(texto).then(async (pesquisaMusica)=>{
                if(pesquisaMusica.length == 0) {
                    resposta.erro = "A letra da música não foi encontrada"
                    reject(resposta)
                } else {
                    let letraMusica = await pesquisaMusica[0].lyrics()
                    resposta.resultado = {
                        titulo: pesquisaMusica[0].title,
                        artista: pesquisaMusica[0].artist.name,
                        imagem : pesquisaMusica[0].artist.image,
                        letra: letraMusica
                    }
                    resolve(resposta)
                }
            }).catch((err)=>{
                if(err.message == "No result was found"){
                    resposta.erro = "A letra da música não foi encontrada"
                    reject(resposta)
                } else {
                    resposta.erro = "Houve um erro no servidor para obter a letra da música."
                    reject(resposta)
                }
            })
        } catch(err){
            console.log(`API obterLetraMusica - ${err.message}`)
            reject({erro: "Houve um erro no servidor para obter a letra da música."})
        }
    })
}

export const obterConversaoMoeda = async (moeda, valor)=>{
    return new Promise(async (resolve, reject)=>{
        try {
            let resposta = {}
            const moedasSuportadas = ['dolar','euro', 'real']
            moeda = moeda.toLowerCase()
            valor = valor.toString().replace(",",".")

            if(!moedasSuportadas.includes(moeda)){
                resposta.erro = 'Moeda não suportada, atualmente existe suporte para : real|dolar|euro'
                reject(resposta)
            }
            if(isNaN(valor)){
                resposta.erro = 'O valor não é um número válido'
                reject(resposta)
            } 
            if(valor > 1000000000000000){
                resposta.erro = 'Quantidade muito alta, você provavelmente não tem todo esse dinheiro.'
                reject(resposta)
            } 

            let params = ''
            switch(moeda){
                case 'dolar':
                    moeda = (valor > 1) ? "Dólares" : "Dólar"
                    params = "USD-BRL,USD-EUR,USD-JPY"
                    break
                case 'euro':
                    moeda = (valor > 1) ? "Euros" : "Euro"
                    params = "EUR-BRL,EUR-USD,EUR-JPY"
                    break
                case 'iene':
                    moeda = (valor > 1) ? "Ienes" : "Iene"
                    params= "JPY-BRL,JPY-USD,JPY-EUR"
                    break 
                case 'real':
                    moeda = (valor > 1) ? "Reais" : "Real"
                    params= "BRL-USD,BRL-EUR,BRL-JPY"
                    break                  
            }
            await axios.get(`https://economia.awesomeapi.com.br/json/last/${params}`).then(({data})=>{
                resposta.resultado = {
                    valor_inserido : valor,
                    moeda_inserida: moeda,
                    conversao : []
                }
                
                for (let conversao in data){
                    let nomeMoeda = '', tipoMoeda = '', simbolo = ''
                    switch(data[conversao].codein){
                        case "BRL":
                            tipoMoeda = "Real/Reais"
                            nomeMoeda = "real"
                            simbolo = "R$"
                            break
                        case "EUR":
                            tipoMoeda = "Euro/Euros"
                            nomeMoeda = "euro"
                            simbolo = "Є"
                            break
                        case "USD":
                            tipoMoeda = "Dólar/Dólares"
                            nomeMoeda = "dolar"
                            simbolo = "$"
                            break
                        case "JPY":
                            tipoMoeda = "Iene/Ienes"
                            nomeMoeda = 'iene'
                            simbolo = "¥"
                            break
                    }
                    let dataHoraAtualizacao = data[conversao].create_date.split(" ")
                    let dataAtualizacao = dataHoraAtualizacao[0].split("-"), horaAtualizacao = dataHoraAtualizacao[1]
                    resposta.resultado.conversao.push({
                        tipo: tipoMoeda,
                        conversao : data[conversao].name,
                        valor_convertido : (data[conversao].bid * valor).toFixed(2),
                        valor_convertido_formatado : `${simbolo} ${(data[conversao].bid * valor).toFixed(2)}`,
                        atualizacao: `${dataAtualizacao[2]}/${dataAtualizacao[1]}/${dataAtualizacao[0]} às ${horaAtualizacao}`
                    })
                }
                resolve(resposta)
            }).catch(()=>{
                resposta.erro = 'Houve um erro no servidor de conversão de moedas'
                reject(resposta)
            })
        } catch(err){
            console.log(`API obterConversaoMoeda - ${err.message}`)
            reject({erro: 'Houve um erro no servidor de conversão de moedas'})
        }
    })
}

export const obterCartasContraHu = async()=>{
    return new Promise(async (resolve, reject)=>{
        try {
            let resposta = {}
            const urls = [
                'https://gist.githubusercontent.com/victorsouzaleal/bfbafb665a35436acc2310d51d754abb/raw/df5eee4e8abedbf1a18f031873d33f1e34ac338a/cartas.json',
                'https://gist.githubusercontent.com/victorsouzaleal/bfbafb665a35436acc2310d51d754abb/raw/2be5f3b5333b2a9c97492888ed8e63b7c7675ae6/frases.json'
            ]

            let data
            for (const url of urls) {
                try {
                    const resp = await axios.get(url, {timeout: 10000})
                    data = resp.data
                    break
                } catch {}
            }

            if (!data) {
                reject({erro: 'Cartas Contra a Humanidade indisponível (gist não encontrado).'})
                return
            }

            if (data.cartas_pretas && data.cartas_brancas) {
                let cartaPretaAleatoria = Math.floor(Math.random() * data.cartas_pretas.length)
                let cartaPretaEscolhida = data.cartas_pretas[cartaPretaAleatoria]
                let cont_params = 1
                if (cartaPretaEscolhida.indexOf('{p3}') != -1) cont_params = 3
                else if (cartaPretaEscolhida.indexOf('{p2}') != -1) cont_params = 2
                for (let i = 1; i <= cont_params; i++) {
                    let cartaBrancaAleatoria = Math.floor(Math.random() * data.cartas_brancas.length)
                    let cartaBrancaEscolhida = data.cartas_brancas[cartaBrancaAleatoria]
                    cartaPretaEscolhida = cartaPretaEscolhida.replace(`{p${i}}`, `*${cartaBrancaEscolhida}*`)
                    data.cartas_brancas.splice(data.cartas_brancas.indexOf(cartaBrancaEscolhida), 1)
                }
                resposta.resultado = cartaPretaEscolhida
                resolve(resposta)
                return
            }

            if (data.frases && data.complementos) {
                let frase = data.frases[Math.floor(Math.random() * data.frases.length)]
                let cont_params = 1
                if (frase.indexOf('{p3}') != -1) cont_params = 3
                else if (frase.indexOf('{p2}') != -1) cont_params = 2
                for (let i = 1; i <= cont_params; i++) {
                    let complemento = data.complementos[Math.floor(Math.random() * data.complementos.length)]
                    frase = frase.replace(`{p${i}}`, `*${complemento}*`)
                    data.complementos.splice(data.complementos.indexOf(complemento), 1)
                }
                resposta.resultado = frase
                resolve(resposta)
                return
            }

            reject({erro: 'Cartas Contra a Humanidade indisponível (formato do gist inválido).'})
        } catch(err){
            console.log(`API obterCartasContraHu- ${err.message}`)
            reject({erro: "Cartas Contra a Humanidade indisponível no momento."})
        }
    })

}

export const obterInfoDDD = async(DDD)=>{
    return new Promise(async (resolve, reject)=>{
        try {
            let resposta = {}
            await axios.get("https://gist.githubusercontent.com/victorsouzaleal/ea89a42a9f912c988bbc12c1f3c2d110/raw/af37319b023503be780bb1b6a02c92bcba9e50cc/ddd.json").then(async githubGistDDD=>{
                let estados = githubGistDDD.data.estados
                let indexDDD = estados.findIndex(estado => estado.ddd.includes(DDD))
                if(indexDDD != -1){
                    resposta.resultado = {
                        estado: estados[indexDDD].nome,
                        regiao: estados[indexDDD].regiao
                    }
                    resolve(resposta)
                } else {
                    resposta.erro = 'Este DDD não foi encontrado, certifique-se que ele é válido.'
                    reject(resposta)
                }
            }).catch(()=>{
                resposta.erro = 'Houve um erro para obter dados sobre este DDD, tente novamente mais tarde.'
                reject(resposta)
            })
        } catch(err){
            console.log(`API obterInfoDDD - ${err.message}`)
            reject({erro: 'Houve um erro para obter dados sobre este DDD, tente novamente mais tarde.'})
        }
    })
}

export const obterTabelaNick = async()=>{
    return new Promise(async(resolve,reject)=>{
        try{
            let resposta = {}
            await axios.get("https://gist.githubusercontent.com/victorsouzaleal/9a58a572233167587e11683aa3544c8a/raw/aea5d03d251359b61771ec87cb513360d9721b8b/tabela.txt").then((githubGistTabela)=>{
                resposta.resultado = githubGistTabela.data
                resolve(resposta)
            }).catch(()=>{
                resposta.erro = 'Houve um erro para obter os dados, tente novamente mais tarde.'
                reject(resposta)
            })
        } catch(err){
            console.log(`API obterTabelaNick - ${err.message}`)
            reject({erro: 'Houve um erro para obter os dados, tente novamente mais tarde.'})
        }
    })
}




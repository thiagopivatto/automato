/**
 * Verdade ou Desafio (níveis 1–5) — banco em dados/conteudo/verdade_ou_desafio.json
 */
import { obterVerdadeOuDesafioDoJson } from './conteudo.js'

const FALLBACK = {
    verdade: {
        1: ['Qual foi a última mentira inofensiva que você contou?'],
        2: ['Já se apaixonou por alguém do grupo?'],
        3: ['Qual foi o beijo mais intenso que você já teve?'],
        4: ['Qual fetiche você esconde da maioria?'],
        5: ['Descreva a fantasia sexual mais explícita que você tem agora.']
    },
    desafio: {
        1: ['Mande um áudio cantando o refrão de uma música aleatória.'],
        2: ['Invente uma cantada péssima e mande no grupo.'],
        3: ['Mande um áudio flertante (sem nudez) lendo uma cantada.'],
        4: ['Mande um áudio falando seu fetiche favorito sem rodeios.'],
        5: ['Escreva um microconto erótico de 8–12 linhas.']
    }
}

export function obterVerdadeOuDesafio(tipo, nivel) {
    const doJson = obterVerdadeOuDesafioDoJson(tipo, nivel)
    if (doJson?.texto) return doJson

    const t = String(tipo || '').toLowerCase()
    const n = Math.min(5, Math.max(1, Number(nivel) || 1))
    const chave = ['verdade', 'vdd', 'truth', 'v'].includes(t)
        ? 'verdade'
        : ['desafio', 'dsf', 'dare', 'd'].includes(t)
          ? 'desafio'
          : Math.random() < 0.5
            ? 'verdade'
            : 'desafio'
    const lista = FALLBACK[chave][n] || FALLBACK[chave][1]
    return { tipo: chave, nivel: n, texto: lista[Math.floor(Math.random() * lista.length)] }
}

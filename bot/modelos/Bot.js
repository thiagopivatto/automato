import fs from 'fs-extra'
import { caminhoDados } from '../lib/caminhos.js'

/** Serializa RMW em bot.json para evitar lost updates sob concorrência. */
let cadeiaEscrita = Promise.resolve()

function enfileirarEscrita(fn) {
    const prox = cadeiaEscrita.then(fn, fn)
    cadeiaEscrita = prox.catch(() => {})
    return prox
}

export class Bot{
    constructor(){
        this.caminhoJSON = caminhoDados('bot.json')
    }

    async atualizarDados(dados){
        await enfileirarEscrita(async () => {
            await fs.writeFile(this.caminhoJSON, JSON.stringify(dados))
        })
    }

    async obterDados(){
        return JSON.parse(await fs.readFile(this.caminhoJSON, 'utf8'))
    }

    async atualizarComandos(){
        await enfileirarEscrita(async () => {
            const bot = JSON.parse(await fs.readFile(this.caminhoJSON, 'utf8'))
            bot.cmds_executados = (bot.cmds_executados || 0) + 1
            await fs.writeFile(this.caminhoJSON, JSON.stringify(bot))
        })
    }

}

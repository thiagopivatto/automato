import fs from 'fs-extra'
import { caminhoDados } from '../lib/caminhos.js'

export class Bot{
    constructor(){
        this.caminhoJSON = caminhoDados('bot.json')
    }

    async atualizarDados(dados){
        fs.writeFileSync(this.caminhoJSON, JSON.stringify(dados))
    }

    async obterDados(){
        return JSON.parse(fs.readFileSync(this.caminhoJSON))
    }

    async atualizarComandos(){
        let bot = await this.obterDados()
        bot.cmds_executados++
        await this.atualizarDados(bot)
    }

}


import {Usuario} from '../modelos/Usuario.js'
import { env } from '../lib/env.js'


export class UsuarioControle{

    constructor(){
        this.usuario = new Usuario()
    }

    digitosJid(jid) {
        return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '')
    }

    /** Dígitos do dono: DB e/ou .env DONO / DONO_JID / NUMERO_DONO (sem fallback hardcoded). */
    digitosDonoEsperado(donoJid = '') {
        const digDb = this.digitosJid(donoJid)
        const digEnv = String(env('DONO_JID', 'DONO', 'NUMERO_DONO') || '').replace(/\D/g, '')
        return digDb || digEnv
    }

    async registrarUsuario(id_usuario, nome){
        const dadosUsuario = {
            id_usuario,
            nome: nome || 'Usuário',
            comandos_total: 0,
            comandos_dia: 0,
            recebeuBoasVindas: false,
            tipo: 'comum'
        }

        await this.usuario.adicionarUsuario(dadosUsuario)
    }

    async atualizarNome(id_usuario, nome){
        if (!id_usuario || nome == null || String(nome).trim() === '') return
        await this.usuario.atualizarNome(id_usuario, String(nome).trim())
    }

    async verificarRegistro(id_usuario){
        let registro = await this.usuario.obterUsuario(id_usuario)
        return (registro != null)
    }

    async cadastrarDono(id_usuario){
        const jid = String(id_usuario || '').trim()
        if (!jid) return
        await this.usuario.resetarDonos()
        const existe = await this.usuario.obterUsuario(jid)
        if (!existe) {
            await this.usuario.adicionarUsuario({
                id_usuario: jid,
                nome: 'Dono',
                comandos_total: 0,
                comandos_dia: 0,
                recebeuBoasVindas: true,
                tipo: 'dono'
            })
        } else {
            await this.usuario.atualizarDono(jid)
        }
    }

    /**
     * True se o JID/LID/PN for o dono.
     * Compara dígitos do telefone (PN) e também .env — LID puro sem PN não casa por dígitos.
     */
    async ehDono(id_usuario, ...aliases) {
        const dono = await this.obterIdDono()
        const donoDig = this.digitosDonoEsperado(dono)
        if (!donoDig) return false
        const candidatos = [id_usuario, ...aliases].filter(Boolean)
        return candidatos.some((j) => {
            // LID não tem dígitos de telefone confiáveis — só PN casa com o dono
            if (String(j).endsWith('@lid')) {
                // Se o próprio dono no DB for esse LID (cadastro antigo), aceita
                return dono && String(dono) === String(j)
            }
            const d = this.digitosJid(j)
            if (!d || d.length < 10 || donoDig.length < 10) return false
            // Match exato de dígitos (evita endsWith frouxo / falso-positivo)
            return d === donoDig
        })
    }

    async obterDadosTodosUsuarios(){
        return await this.usuario.obterTodosUsuarios()
    }

    async obterDadosUsuario(id_usuario){
        return await this.usuario.obterUsuario(id_usuario)
    }

    /** Busca usuário por qualquer alias (PN/LID). */
    async obterDadosUsuarioPorAliases(...ids) {
        for (const id of ids.filter(Boolean)) {
            const u = await this.usuario.obterUsuario(id)
            if (u) return u
        }
        return null
    }

    /**
     * Garante registro certo: PN canônico, promove dono, não grava nome null.
     * Retorna { usuario, idCanonico }.
     */
    async garantirIdentidade({ remetente, aliases = [], nome, mensagem_dono = false } = {}) {
        const ids = [...new Set([remetente, ...aliases].filter(Boolean))]
        const pn = ids.find((j) => /@s\.whatsapp\.net$/i.test(String(j)))
        let idCanonico = pn || remetente
        const donoId = await this.obterIdDono()
        const isDono = mensagem_dono || (await this.ehDono(remetente, ...aliases))

        if (isDono && donoId) {
            idCanonico = /@s\.whatsapp\.net$/i.test(String(donoId)) ? donoId : (pn || donoId)
        }

        let usuario = await this.obterDadosUsuarioPorAliases(idCanonico, ...ids)
        const nomeOk = nome && String(nome).trim() && String(nome).trim() !== 'null'
            ? String(nome).trim()
            : null

        if (!usuario) {
            await this.registrarUsuario(idCanonico, nomeOk || (isDono ? 'Dono' : 'Usuário'))
            if (isDono) await this.cadastrarDono(idCanonico)
            usuario = await this.usuario.obterUsuario(idCanonico)
        } else {
            // Achou sob LID (ou outro alias): promove para PN canônico (todos os usuários)
            if (pn && usuario.id_usuario !== idCanonico) {
                const sobPn = await this.usuario.obterUsuario(idCanonico)
                if (!sobPn) {
                    await this.registrarUsuario(
                        idCanonico,
                        nomeOk || usuario.nome || (isDono ? 'Dono' : 'Usuário')
                    )
                }
                if (isDono) await this.cadastrarDono(idCanonico)
                try {
                    await this.usuario.addContagemTotal(idCanonico)
                } catch { /* */ }
                usuario = await this.usuario.obterUsuario(idCanonico)
            } else if (isDono && usuario.tipo !== 'dono') {
                await this.cadastrarDono(usuario.id_usuario)
                idCanonico = usuario.id_usuario
                usuario = await this.usuario.obterUsuario(idCanonico)
            }
            if (nomeOk) await this.atualizarNome(usuario.id_usuario, nomeOk)
            usuario = await this.usuario.obterUsuario(usuario.id_usuario)
        }

        return { usuario, idCanonico }
    }

    async obterUsuariosTipo(tipo){
        return await this.usuario.obterUsuariosTipo(tipo)
    }

    async obterDono(){
        return await this.usuario.obterDono()
    }

    async obterIdDono(){
        const dono = await this.usuario.obterDono()
        return dono?.id_usuario ?? ''
    }

    async limparTipo(tipo, botInfo){
        let {limite_diario} = botInfo
        if(!limite_diario.limite_tipos[tipo] || tipo === "comum" || tipo === 'dono') return false
        await this.usuario.limparTipo(tipo)
        return true
    }

    async recebeuBoasVindas(id_usuario){
        await this.usuario.alterarRecebeuBoasVindas(id_usuario)
    }

    async verificarUltrapassouLimiteComandos(id_usuario, botInfo){
        let usuario = await this.usuario.obterUsuario(id_usuario)
        if (!usuario) return false
        const maxComandos = botInfo.limite_diario.limite_tipos[usuario.tipo].comandos
        if(!maxComandos) return false
        return (usuario.comandos_dia >= maxComandos)
    }

    async adicionarContagemDiariaComandos(id_usuario){
        await this.usuario.addContagemDiaria(id_usuario)
    }

    async adicionarContagemTotalComandos(id_usuario){
        await this.usuario.addContagemTotal(id_usuario)
    }

    async alterarTipoUsuario(id_usuario, tipo, botInfo){
        let {limite_diario} = botInfo
        if(limite_diario.limite_tipos[tipo] && tipo != 'dono'){
            await this.usuario.alterarTipoUsuario(id_usuario, tipo)
            return true
        } else {
            return false
        }
    }

    async resetarComandosDia(){
        await this.usuario.resetarComandosDia()
    }

    async resetarComandosDiaUsuario(id_usuario){
        await this.usuario.resetarComandosDiaUsuario(id_usuario)
    }
    
}

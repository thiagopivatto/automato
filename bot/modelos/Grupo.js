import Datastore from '@seald-io/nedb'
import { caminhoDados } from '../lib/caminhos.js'
const db = {
    grupos : new Datastore({filename : caminhoDados('grupos.db'), autoload: true}),
    contador : new Datastore({filename : caminhoDados('contador.db'), autoload: true})
}

export class Grupo{

    constructor(){}

    // Grupo
    async registrarGrupo(dadosGrupo){
        await db.grupos.insertAsync(dadosGrupo)
    }

    async obterGrupo(id_grupo){
        return await db.grupos.findOneAsync({id_grupo})
    }

    async removerGrupo(id_grupo){
        await db.grupos.removeAsync({id_grupo}, {multi: true})
    }

    async obterTodosGrupos(){
        return await db.grupos.findAsync({})
    }

    async atualizarGrupo(dadosGrupo){
        await db.grupos.updateAsync({id_grupo : dadosGrupo.id_grupo}, {$set: {
            nome: dadosGrupo.nome,
            descricao: dadosGrupo.descricao,
            participantes: dadosGrupo.participantes,
            admins: dadosGrupo.admins,
            dono: dadosGrupo.dono,
            restrito_msg: dadosGrupo.restrito_msg
        }})
    }

    async atualizarNomeGrupo(id_grupo, nome){
        await db.grupos.updateAsync({id_grupo}, {$set:{nome}})
    }

    async atualizarRestritoGrupo(id_grupo, restrito_msg){
        await db.grupos.updateAsync({id_grupo}, {$set:{restrito_msg}})
    }

    // Participantes
    async obterParticipantes(id_grupo){
        let grupo = await db.grupos.findOneAsync({id_grupo})
        return grupo?.participantes
    }

    async obterAdmins(id_grupo){
        let grupo = await db.grupos.findOneAsync({id_grupo})
        return grupo?.admins
    }

    async adicionarParticipante(id_grupo, participante){
        await db.grupos.updateAsync({id_grupo}, {$push: { participantes: participante} })
    }

    async removerParticipante(id_grupo, participante){
        await db.grupos.updateAsync({id_grupo}, { $pull: { participantes : participante } })
    }

    async adicionarAdmin(id_grupo, participante){
        await db.grupos.updateAsync({id_grupo}, {$push: { admins: participante} })
    }

    async removerAdmin(id_grupo, participante){
        await db.grupos.updateAsync({id_grupo}, { $pull: { admins : participante } })
    }

    //Alterar recursos
    async alterarBemVindo(id_grupo, status, msg){
        await db.grupos.updateAsync({id_grupo}, {$set:{"bemvindo.status": status, "bemvindo.msg":msg}})
    }

    async alterarAntiFake(id_grupo, status, ddi){
        await db.grupos.updateAsync({id_grupo}, {$set:{"antifake.status": status, "antifake.ddi_liberados": ddi}})
    }

    async alterarMutar(id_grupo, status){
        await db.grupos.updateAsync({id_grupo}, {$set:{mutar: status}})
    }

    async alterarAntiLink(id_grupo, status){
        await db.grupos.updateAsync({id_grupo}, {$set:{antilink: status}})
    }

    /** Silêncio temporário por membro: [{ id, ate|null }] */
    async definirShhLista(id_grupo, lista){
        await db.grupos.updateAsync({id_grupo}, {$set:{shh: Array.isArray(lista) ? lista : []}})
    }

    async obterShhLista(id_grupo){
        const g = await db.grupos.findOneAsync({id_grupo})
        return Array.isArray(g?.shh) ? g.shh : []
    }

    async alterarAutoSticker(id_grupo, status){
        await db.grupos.updateAsync({id_grupo}, {$set:{autosticker: status}})
    }

    async alterarAutoSimi(id_grupo, status){
        await db.grupos.updateAsync({id_grupo}, {$set:{autosimi: status}})
    }

    async alterarAutoMsg(id_grupo, status){
        await db.grupos.updateAsync({id_grupo}, {$set:{automsg: !!status}})
    }

    /** Personalidade do !resumodogrupo só deste grupo (texto livre). */
    async definirPersonalidadeResumo(id_grupo, texto){
        const limpo = String(texto || '').trim().slice(0, 1200)
        await db.grupos.updateAsync(
            { id_grupo },
            limpo
                ? { $set: { personalidade_resumo: limpo } }
                : { $unset: { personalidade_resumo: true } }
        )
    }

    async obterPersonalidadeResumo(id_grupo){
        const g = await db.grupos.findOneAsync({ id_grupo })
        return g?.personalidade_resumo || ''
    }

    async atualizarUltimaMsgHumana(id_grupo, ts = Date.now()){
        await db.grupos.updateAsync({id_grupo}, {$set:{ultima_msg_humana: Number(ts) || Date.now()}})
    }

    async atualizarUltimaAutoMsg(id_grupo, ts = Date.now()){
        await db.grupos.updateAsync({id_grupo}, {$set:{ultima_automsg: Number(ts) || Date.now()}})
    }

    async definirPrefeito(id_grupo, dados){
        await db.grupos.updateAsync({id_grupo}, {$set:{prefeito: dados || null}})
    }

    async obterGruposAutoMsg(){
        // Ativo por padrão: inclui true e campos ausentes; só exclui false explícito
        const todos = await db.grupos.findAsync({})
        return (todos || []).filter((g) => g.automsg !== false)
    }

    async alterarContador(id_grupo, status, data_atual){
        await db.grupos.updateAsync({id_grupo}, {$set:{"contador.status":status, "contador.inicio":data_atual}})
    }

    async alterarAntiFlood(id_grupo, status, max, intervalo){
        await db.grupos.updateAsync({id_grupo}, {$set:{'antiflood.status':status, 'antiflood.max': max, 'antiflood.intervalo': intervalo}})
    }

    // Lista negra
    async obterListaNegra(id_grupo){
        let grupo = await db.grupos.findOneAsync({id_grupo})
        return grupo?.lista_negra
    }

    async adicionarListaNegra(id_grupo, id_usuario){
        await db.grupos.updateAsync({id_grupo}, {$push: { lista_negra: id_usuario } })
    }

    async removerListaNegra(id_grupo, id_usuario){
        await db.grupos.updateAsync({id_grupo}, {$pull: { lista_negra: id_usuario } } )
    }

    // Anti-Flood
    async atualizarAntiFlood(id_grupo, antifloodMsgs){
        await db.grupos.updateAsync({id_grupo}, {$set: {'antiflood.msgs': antifloodMsgs}})
    }

    // Bloqueio de comandos
    async adicionarComandoBloqueio(id_grupo, cmds){
       await db.grupos.updateAsync({id_grupo}, {$push: { block_cmds: {$each: cmds} }})
    }

    async removerComandosBloqueio(id_grupo, cmds){
        await db.grupos.updateAsync({id_grupo}, {$pull:{block_cmds: {$in: cmds}}})
    }

    // Contador
    async registrarContador(id_grupo, id_usuario){
        await db.contador.insertAsync({id_grupo,id_usuario, msg:0,imagem:0,audio:0,sticker:0,video:0,outro:0,texto:0})
    }

    async adicionarContagem(id_grupo, id_usuario, dados){
        await db.contador.updateAsync({id_grupo,id_usuario}, {$inc: dados})
    }

    async removerContador(id_grupo, id_usuario){
        await db.contador.removeAsync({id_grupo,id_usuario})
    }

    async removerContadorGrupo(id_grupo){
        await db.contador.removeAsync({id_grupo}, {multi: true})
    }

    async obterContagem(id_grupo, id_usuario){
        return await db.contador.findOneAsync({id_grupo,id_usuario})
    }

    async obterTodasContagens(id_grupo){
        return await db.contador.findAsync({id_grupo})
    }

    async obterContagensMenoresQue(id_grupo, num){
        return await db.contador.findAsync({id_grupo, msg: {$lt: parseInt(num)}}).sort({msg: -1})
    }

    async obterMaioresContagens(id_grupo){
        return await db.contador.findAsync({id_grupo}).sort({msg: -1})
    }





    
}

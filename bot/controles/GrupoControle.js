import { Grupo } from '../modelos/Grupo.js'
import { comandosInfo, verificarComandoExiste } from '../comandos/comandos.js'
import * as socket from '../baileys/socket.js'
import {consoleErro, criarTexto, listaContemJid, aliasesParticipanteMeta, mencaoNumero} from '../lib/util.js'
import moment from "moment-timezone"
import { tiposMensagem } from '../baileys/mensagem.js'
import { UsuarioControle } from './UsuarioControle.js'


export class GrupoControle {

    constructor() {
        this.grupo = new Grupo()
    }

    //Obter dados do grupo
    async obterGrupoInfo(id_grupo) {
        return await this.grupo.obterGrupo(id_grupo)
    }

    async verificarRegistroGrupo(id_grupo) {
        let grupo = await this.grupo.obterGrupo(id_grupo)
        return (grupo != null)
    }

    async obterAdminsGrupo(id_grupo) {
        let grupo = await this.grupo.obterGrupo(id_grupo)
        return grupo?.admins
    }

    async obterDonoGrupo(id_grupo) {
        let grupo = await this.grupo.obterGrupo(id_grupo)
        return grupo?.dono
    }

    async obterStatusRestritoGrupo(id_grupo) {
        let grupo = await this.grupo.obterGrupo(id_grupo)
        return grupo?.restrito_msg
    }

    async obterParticipantesGrupo(id_grupo) {
        let grupo = await this.grupo.obterGrupo(id_grupo)
        return grupo?.participantes
    }

    async obterTodosGruposInfo() {
        return await this.grupo.obterTodosGrupos()
    }

    // Cadastro/Remoção/Atualização de grupos
    async registrarGrupo(dadosGrupo) {
        dadosGrupo.mutar = false
        dadosGrupo.bemvindo = { status: false, msg: '' }
        //dadosGrupo.antifake = { status: false, ddi_liberados: [] }
        dadosGrupo.antilink = false
        dadosGrupo.shh = []
        dadosGrupo.antiflood = { status: false, max: 10, intervalo: 10, msgs: [] }
        dadosGrupo.autosticker = false
        dadosGrupo.autosimi = false
        dadosGrupo.automsg = true
        dadosGrupo.ultima_msg_humana = Date.now()
        dadosGrupo.ultima_automsg = 0
        dadosGrupo.prefeito = null
        dadosGrupo.contador = { status: true, inicio: moment(moment.now()).format('DD/MM HH:mm:ss') }
        dadosGrupo.block_cmds = []
        dadosGrupo.lista_negra = []

        await this.grupo.registrarGrupo(dadosGrupo)
        try {
            if (dadosGrupo.participantes?.length) {
                await this.registrarContagemGrupo(dadosGrupo.id_grupo, dadosGrupo.participantes)
            }
        } catch (e) {
            console.log(`contador auto - ${e.message}`)
        }
    }

    async atualizarNomeGrupo(id_grupo, nome) {
        await this.grupo.atualizarNomeGrupo(id_grupo, nome)
    }

    async atualizarRestritoGrupo(id_grupo, status) {
        await this.grupo.atualizarRestritoGrupo(id_grupo, status)
    }

    async registrarGruposAoIniciar(gruposInfo) {
        try {
            for (let grupo of gruposInfo) {
                let g_registrado = await this.verificarRegistroGrupo(grupo.id)
                if (!g_registrado) {
                    let participantes = await socket.obterMembrosGrupoPorMetadata(grupo)
                    let admins = await socket.obterAdminsGrupoPorMetadata(grupo)
                    let dadosGrupo = {
                        id_grupo: grupo.id,
                        nome: grupo.subject,
                        descricao: grupo.desc,
                        participantes,
                        admins,
                        dono: grupo.owner,
                        restrito_msg: grupo.announce
                    }
                    await this.registrarGrupo(dadosGrupo)
                }
            }
        } catch (err) {
            err.message = `registrarGruposAoIniciar - ${err.message}`
            throw err
        }
    }

    async registrarGrupoAoSerAdicionado(grupoInfo) {
        try {
            let g_registrado = await this.verificarRegistroGrupo(grupoInfo.id)
            if (!g_registrado) {
                let participantes = await socket.obterMembrosGrupoPorMetadata(grupoInfo)
                let admins = await socket.obterAdminsGrupoPorMetadata(grupoInfo)
                let dadosGrupo = {
                    id_grupo: grupoInfo.id,
                    nome: grupoInfo.subject,
                    descricao: grupoInfo.desc,
                    participantes,
                    admins,
                    dono: grupoInfo.owner,
                    restrito_msg: grupoInfo.announce
                }
                await this.registrarGrupo(dadosGrupo)
            }
        } catch (err) {
            err.message = `registrarGrupoAoSerAdicionado - ${err.message}`
            throw err
        }
    }

    async atualizarDadosGrupo(dadosGrupo) {
        await this.grupo.atualizarGrupo(dadosGrupo)
    }

    async atualizarDadosGrupoParcial(dadosGrupo) {
        try {
            if (dadosGrupo.subject != undefined) await this.atualizarNomeGrupo(dadosGrupo.id, dadosGrupo.subject)
            if (dadosGrupo.announce != undefined) await this.atualizarRestritoGrupo(dadosGrupo.id, dadosGrupo.announce)
        } catch (err) {
            err.message = `atualizarDadosGrupoParcial - ${err.message}`
            throw err
        }
    }

    async atualizarDadosGruposInicio(gruposInfo) {
        try {
            for (let grupo of gruposInfo) {
                let participantesGrupo = await socket.obterMembrosGrupoPorMetadata(grupo)
                let adminsGrupo = await socket.obterAdminsGrupoPorMetadata(grupo)
                let dadosGrupo = {
                    id_grupo: grupo.id,
                    nome: grupo.subject,
                    descricao: grupo.desc,
                    participantes: participantesGrupo,
                    admins: adminsGrupo,
                    dono: grupo.owner,
                    restrito_msg: grupo.announce
                }
                await this.atualizarDadosGrupo(dadosGrupo)
            }
        } catch (err) {
            err.message = `atualizarParticipantes - ${err.message}`
            throw err
        }
    }

    async removerGrupo(id_grupo) {
        try {
            let g_registrado = this.verificarRegistroGrupo(id_grupo)
            if (g_registrado) await this.grupo.removerGrupo(id_grupo)
        } catch (err) {
            err.message = `removerGrupo - ${err.message}`
            throw err
        }
    }

    // Adicionar/Editar/Remover participantes do grupo
    async participanteExiste(id_grupo, id_usuario) {
        let participantes = await this.grupo.obterParticipantes(id_grupo)
        return (participantes && participantes.includes(id_usuario))
    }

    async adicionarParticipante(id_grupo, id_usuario) {
        try {
            let existe = await this.participanteExiste(id_grupo, id_usuario)
            if (!existe) await this.grupo.adicionarParticipante(id_grupo, id_usuario)
        } catch (err) {
            err.message = `adicionarParticipante - ${err.message}`
            throw err
        }
    }

    async adicionarAdmin(id_grupo, id_usuario) {
        await this.grupo.adicionarAdmin(id_grupo, id_usuario)
    }

    async removerAdmin(id_grupo, id_usuario) {
        await this.grupo.removerAdmin(id_grupo, id_usuario)
    }

    async verificarAdmin(id_grupo, id_usuario) {
        let admins = await this.grupo.obterAdmins(id_grupo)
        return (admins && admins.includes(id_usuario))
    }

    async removerParticipante(id_grupo, id_usuario) {
        try {
            let usuarioAdministrador = await this.verificarAdmin(id_grupo, id_usuario)
            if (usuarioAdministrador) await this.removerAdmin(id_grupo, id_usuario)
            await this.grupo.removerParticipante(id_grupo, id_usuario)
        } catch (err) {
            err.message = `removerParticipante - ${err.message}`
            throw err
        }
    }

    // Recurso de atividade/contador de mensagens
    async alterarContador(id_grupo, status = true) {
        let data_atual = (status) ? moment(moment.now()).format("DD/MM HH:mm:ss") : ''
        await this.grupo.alterarContador(id_grupo, status, data_atual)
    }

    async obterAtividadeParticipante(id_grupo, id_usuario) {
        return await this.grupo.obterContagem(id_grupo, id_usuario)
    }

    async obterParticipantesInativos(id_grupo, qtdMensagem) {
        let inativos = await this.grupo.obterContagensMenoresQue(id_grupo, qtdMensagem)
        let grupoInfo = await this.obterGrupoInfo(id_grupo)
        let inativosNoGrupo = []
        inativos.forEach((inativo) => {
            if (grupoInfo.participantes.includes(inativo.id_usuario)) inativosNoGrupo.push(inativo)
        })
        return inativosNoGrupo
    }

    async obterParticipantesAtivos(id_grupo, qtd) {
        let ativos = await this.grupo.obterMaioresContagens(id_grupo)
        let grupoInfo = await this.obterGrupoInfo(id_grupo)
        let ativosNoGrupo = []
        ativos.forEach((ativo) => {
            if (grupoInfo.participantes.includes(ativo.id_usuario)) ativosNoGrupo.push(ativo)
        })
        return ativosNoGrupo.length >= qtd ? ativosNoGrupo.slice(0, (qtd)) : ativosNoGrupo
    }

    async registrarContagemParticipante(id_grupo, id_usuario) {
        await this.grupo.registrarContador(id_grupo, id_usuario)
    }

    async verificarRegistrarContagemParticipante(id_grupo, id_usuario) {
        let contador = await this.obterAtividadeParticipante(id_grupo, id_usuario)
        if (!contador) await this.registrarContagemParticipante(id_grupo, id_usuario)
    }

    async obterTodasContagensGrupo(id_grupo) {
        return await this.grupo.obterTodasContagens(id_grupo)
    }

    async adicionarContagemParticipante(id_grupo, id_usuario, tipoMensagem) {
        let dadosIncrementados = { msg: 1 }
        switch (tipoMensagem) {
            case tiposMensagem.texto:
            case tiposMensagem.textoExt:
                dadosIncrementados.texto = 1
                break
            case tiposMensagem.imagem:
                dadosIncrementados.imagem = 1
                break
            case tiposMensagem.video:
                dadosIncrementados.video = 1
                break
            case tiposMensagem.sticker:
                dadosIncrementados.sticker = 1
                break
            case tiposMensagem.audio:
                dadosIncrementados.audio = 1
                break
            case tiposMensagem.documento:
                dadosIncrementados.outro = 1
                break
        }
        await this.grupo.adicionarContagem(id_grupo, id_usuario, dadosIncrementados)
    }

    async removerContagemParticipante(id_grupo, id_usuario) {
        await this.grupo.removerContador(id_grupo, id_usuario)
    }

    async registrarContagemGrupo(id_grupo, usuariosGrupo) {
        for (let usuario of usuariosGrupo) {
            await this.registrarContagemParticipante(id_grupo, usuario)
        }
    }

    async removerContagemGrupo(id_grupo) {
        await this.grupo.removerContadorGrupo(id_grupo)
    }

    async atualizarContagemGrupos(gruposInfo) {
        try {
            for (let grupo of gruposInfo) {
                let g_info = await this.obterGrupoInfo(grupo.id)
                if (g_info != null) {
                    if (g_info.contador.status) {
                        let contagens = await this.obterTodasContagensGrupo(grupo.id)
                        let membros_grupo = await this.obterParticipantesGrupo(grupo.id)
                        //ADICIONANDO NA CONTAGEM QUEM ENTROU NO GRUPO ENQUANTO O BOT ESTAVA OFF
                        for (let membroId of membros_grupo) {
                            if (contagens.find(contagem => contagem.id_usuario == membroId) == undefined) await this.registrarContagemParticipante(grupo.id, membroId)
                        }
                    }
                }
            }
        } catch (err) {
            err.message = `atualizarContagemGrupos - ${err.message}`
            throw err
        }
    }

    // Recurso de boas-vindas
    async alterarBemVindo(id_grupo, status, mensagem = '') {
        await this.grupo.alterarBemVindo(id_grupo, status, mensagem)
    }

    async mensagemBemVindo(c, evento, grupoInfo, botInfo) {
        try {
            const comandos_info = comandosInfo(botInfo)
            if (grupoInfo.bemvindo.status) {
                let msg_customizada = (grupoInfo.bemvindo.msg != "") ? grupoInfo.bemvindo.msg + "\n\n" : ""
                let mensagem_bemvindo = criarTexto(comandos_info.grupo.bv.msgs.mensagem, mencaoNumero(evento.participants[0]), grupoInfo.nome, msg_customizada)
                await socket.enviarTextoComMencoes(c, evento.id, mensagem_bemvindo, [evento.participants[0]])
            }
        } catch (err) {
            err.message = `bemVindo - ${err.message}`
            consoleErro(err, "BEM VINDO")
        }
    }

    // Recurso ANTI-LINK
    async alterarAntiLink(id_grupo, status = true) {
        await this.grupo.alterarAntiLink(id_grupo, status)
    }

    /** Lista de silenciados ainda válidos (remove expirados). */
    async obterShhAtivos(id_grupo) {
        const agora = Date.now()
        const lista = await this.grupo.obterShhLista(id_grupo)
        const ativos = (lista || []).filter((e) => {
            if (!e) return false
            const temId = e.id || (Array.isArray(e.ids) && e.ids.length)
            if (!temId) return false
            return e.ate == null || Number(e.ate) > agora
        })
        if (ativos.length !== (lista || []).length) {
            await this.grupo.definirShhLista(id_grupo, ativos)
        }
        return ativos
    }

    /** Resolve LID+PN do alvo via metadados ao vivo do grupo. */
    async resolverAliasesShh(c, id_grupo, ...jids) {
        const cands = jids.flat().filter(Boolean)
        if (!cands.length) return []
        try {
            const meta = await c.groupMetadata(id_grupo)
            return aliasesParticipanteMeta(meta?.participants || [], ...cands)
        } catch {
            return [...new Set(cands)]
        }
    }

    async silenciarMembro(id_grupo, id_usuario, minutos = null, aliases = null) {
        const ativos = await this.obterShhAtivos(id_grupo)
        const idsAlvo = Array.isArray(aliases) && aliases.length ? aliases : [id_usuario]
        const limpos = ativos.filter((e) => {
            const ids = e.ids || [e.id]
            return !listaContemJid(ids, ...idsAlvo)
        })
        const ate =
            minutos == null || minutos <= 0
                ? null
                : Date.now() + Math.floor(Number(minutos)) * 60 * 1000
        limpos.push({ id: idsAlvo[0], ids: [...new Set(idsAlvo.filter(Boolean))], ate })
        await this.grupo.definirShhLista(id_grupo, limpos)
        return { ate, ids: idsAlvo }
    }

    async dessilenciarMembro(id_grupo, id_usuario, aliases = null) {
        const ativos = await this.obterShhAtivos(id_grupo)
        const idsAlvo = Array.isArray(aliases) && aliases.length ? aliases : [id_usuario]
        const antes = ativos.length
        const limpos = ativos.filter((e) => {
            const ids = e.ids || [e.id]
            return !listaContemJid(ids, ...idsAlvo)
        })
        await this.grupo.definirShhLista(id_grupo, limpos)
        return antes !== limpos.length
    }

    async filtroShh(c, mensagemBaileys, botInfo) {
        try {
            const { remetente, mensagem_grupo, mensagem, grupo, mensagem_bot } = mensagemBaileys
            if (!mensagem_grupo || !grupo || mensagem_bot) return true
            const id_grupo = grupo.id_grupo || mensagemBaileys.id_chat
            if (!id_grupo) return true

            const ativos = await this.obterShhAtivos(id_grupo)
            if (!ativos.length) return true

            // Confere admin do bot ao vivo (DB pode estar com LID desatualizado)
            const botJids = [
                botInfo?.numero_bot,
                botInfo?.lid_bot,
                c.user?.id?.replace(/:[0-9]+/ism, ''),
                c.user?.lid ? String(c.user.lid).replace(/:[0-9]+/ism, '') : null
            ].filter(Boolean)

            let participants = []
            let botEhAdmin = !!grupo.bot_admin
            let dono = grupo.dono
            try {
                const meta = await c.groupMetadata(id_grupo)
                participants = meta?.participants || []
                const admins = []
                for (const p of participants) {
                    if (!p?.admin) continue
                    if (p.id) admins.push(p.id)
                    if (p.phoneNumber && p.phoneNumber !== p.id) admins.push(p.phoneNumber)
                }
                botEhAdmin = listaContemJid(admins, ...botJids)
                if (meta?.owner) dono = meta.owner
            } catch { /* usa flags do DB */ }

            if (!botEhAdmin) return true

            const key = mensagem?.key || {}
            const candidatosRemetente = [
                remetente,
                key.participant,
                key.participantPn,
                key.participantAlt,
                key.participantLid
            ].filter(Boolean)

            // Expande aliases do remetente (LID ↔ PN)
            const aliasesRemetente = aliasesParticipanteMeta(participants, ...candidatosRemetente)

            // Dono do grupo nunca é silenciado
            if (dono && listaContemJid([dono, ...aliasesParticipanteMeta(participants, dono)], ...aliasesRemetente)) {
                return true
            }

            const idsSilenciados = ativos.flatMap((e) => (Array.isArray(e.ids) && e.ids.length ? e.ids : [e.id]))
            if (!listaContemJid(idsSilenciados, ...aliasesRemetente)) return true

            await socket.deletarMensagem(c, mensagem)
            return false
        } catch (err) {
            err.message = `filtroShh - ${err.message}`
            consoleErro(err, 'SHH')
            return true
        }
    }

    async filtroAntiLink(c, mensagemBaileys, botInfo) {
        try {
            const comandos_info = comandosInfo(botInfo)
            const { corpo, legenda, remetente, id_chat, mensagem_grupo, mensagem, grupo } = mensagemBaileys
            const usuarioTexto = corpo || legenda
            const { id_grupo, admins, bot_admin, dono, usuario_admin } = { ...grupo }
            if (!mensagem_grupo) return true
            if (!grupo?.antilink) return true

            if (!bot_admin) {
                await this.alterarAntiLink(id_grupo, false)
                return true
            }

            if (!usuarioTexto) return true

            const textoComUrl = usuarioTexto.match(
                /(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?/img
            )
            if (!textoComUrl) return true

            // Dono e admins podem enviar links (compara LID ↔ PN)
            const key = mensagem?.key || {}
            const candidatosRemetente = [
                remetente,
                key.participant,
                key.participantPn,
                key.participantAlt,
                key.participantLid
            ].filter(Boolean)

            if (usuario_admin || listaContemJid(admins || [], ...candidatosRemetente)) {
                return true
            }
            if (dono && listaContemJid([dono], ...candidatosRemetente)) {
                return true
            }

            await socket.enviarTextoComMencoes(
                c,
                id_chat,
                criarTexto(comandos_info.grupo.alink.msgs.detectou, mencaoNumero(remetente)),
                [remetente]
            )
            await socket.deletarMensagem(c, mensagem)
            return false
        } catch (err) {
            err.message = `antiLink - ${err.message}`
            consoleErro(err, "ANTI-LINK")
            return true
        }
    }

    //Recurso AUTO-STICKER
    async alterarAutoSticker(id_grupo, status = true) {
        await this.grupo.alterarAutoSticker(id_grupo, status)
    }

    //Recurso AUTO-SIMI
    async alterarAutoSimi(id_grupo, status = true) {
        await this.grupo.alterarAutoSimi(id_grupo, status)
    }

    //Recurso AUTO-MSG
    async alterarAutoMsg(id_grupo, status = true) {
        await this.grupo.alterarAutoMsg(id_grupo, status)
        if (status) await this.grupo.atualizarUltimaMsgHumana(id_grupo, Date.now())
    }

    async definirPersonalidadeResumo(id_grupo, texto) {
        await this.grupo.definirPersonalidadeResumo(id_grupo, texto)
    }

    async obterPersonalidadeResumo(id_grupo) {
        return await this.grupo.obterPersonalidadeResumo(id_grupo)
    }

    async atualizarUltimaMsgHumana(id_grupo) {
        await this.grupo.atualizarUltimaMsgHumana(id_grupo, Date.now())
    }

    async atualizarUltimaAutoMsg(id_grupo) {
        await this.grupo.atualizarUltimaAutoMsg(id_grupo, Date.now())
    }

    async definirPrefeito(id_grupo, dados) {
        await this.grupo.definirPrefeito(id_grupo, dados)
    }

    async obterGruposAutoMsg() {
        return await this.grupo.obterGruposAutoMsg()
    }

    //Recurso ANTI-FAKE
    // async alterarAntiFake(id_grupo, status = true, ddiAutorizados = []) {
    //     await this.grupo.alterarAntiFake(id_grupo, status, ddiAutorizados)
    // }

    // async filtroAntiFake(c, evento, grupoInfo, botInfo) {
    //     try {
    //         if (grupoInfo.antifake.status) {
    //             const comandos_info = comandosInfo(botInfo)
    //             let participante = evento.participants[0]
    //             let grupoAdmins = grupoInfo.admins
    //             let botAdmin = grupoAdmins.includes(botInfo.numero_bot)

    //             if (!botAdmin) {
    //                 await this.alterarAntiFake(evento.id, false)
    //             } else {
    //                 for (ddi of grupoInfo.antifake.ddi_liberados) {
    //                     if (participante.startsWith(ddi)) return true
    //                 }
    //                 await socket.enviarTextoComMencoes(c, evento.id, criarTexto(comandos_info.outros.resposta_ban, mencaoNumero(participante), comandos_info.grupo.afake.msgs.motivo, botInfo.nome), [participante])
    //                 await socket.removerParticipante(c, evento.id, participante)
    //                 return false
    //             }
    //         }
    //         return true
    //     } catch (err) {
    //         err.message = `antiFake - ${err.message}`
    //         consoleErro(err, "ANTI-FAKE")
    //         return true
    //     }
    // }

    // Recurso MUTAR GRUPO
    async alterarMutar(id_grupo, status = true) {
        await this.grupo.alterarMutar(id_grupo, status)
    }

    // Recurso ANTI-FLOOD
    async alterarAntiFlood(id_grupo, status = true, qtdMensagem = 10, intervalo = 10) {
        await this.grupo.alterarAntiFlood(id_grupo, status, qtdMensagem, intervalo)
    }

    async tratarMensagemAntiFlood(grupo_info, id_usuario) {
        try {
            let timestamp_atual = parseInt(Math.round(new Date().getTime() / 1000)), resposta = false
            //VERIFICA SE ALGUM MEMBRO JA PASSOU DO TEMPO DE TER AS MENSAGENS RESETADAS
            for (let i = 0; i < grupo_info.antiflood.msgs.length; i++) {
                if (timestamp_atual >= grupo_info.antiflood.msgs[i].expiracao) grupo_info.antiflood.msgs.splice(i, 1)
            }
            //PESQUISA O INDICE DO USUARIO
            let usuarioIndex = grupo_info.antiflood.msgs.findIndex(usuario => usuario.id_usuario == id_usuario)
            //SE O USUARIO JÁ ESTIVER NA LISTA
            if (usuarioIndex != -1) {
                //INCREMENTA A CONTAGEM
                grupo_info.antiflood.msgs[usuarioIndex].qtd++
                let max_msg = grupo_info.antiflood.max
                if (grupo_info.antiflood.msgs[usuarioIndex].qtd >= max_msg) {
                    grupo_info.antiflood.msgs.splice(usuarioIndex, 1)
                    resposta = true
                } else {
                    resposta = false
                }
            } else {
                //ADICIONA O USUARIO NA LISTA
                grupo_info.antiflood.msgs.push({
                    id_usuario,
                    expiracao: timestamp_atual + parseInt(grupo_info.antiflood.intervalo),
                    qtd: 1
                })
                resposta = false
            }

            //ATUALIZAÇÃO E RETORNO
            await this.grupo.atualizarAntiFlood(grupo_info.id_grupo, grupo_info.antiflood.msgs)
            return resposta
        } catch (err) {
            throw new Error(err)
        }
    }

    async filtroAntiFlood(c, mensagemBaileys, botInfo) {
        try {
            const comandos_info = comandosInfo(botInfo)
            const { id_chat, remetente, mensagem_grupo, grupo } = mensagemBaileys
            const { id_grupo, admins, bot_admin } = { ...grupo }

            if (!mensagem_grupo) return true
            if (!grupo?.antiflood.status) return true
            if (!bot_admin) {
                await this.alterarAntiFlood(id_grupo, false)
            } else {
                let flood = await this.tratarMensagemAntiFlood(grupo, remetente)
                if (flood) {
                    if (!admins.includes(remetente)) {
                        await socket.removerParticipante(c, id_grupo, remetente)
                        await socket.enviarTextoComMencoes(c, id_chat, criarTexto(comandos_info.outros.resposta_ban, mencaoNumero(remetente), comandos_info.grupo.aflood.msgs.motivo, botInfo.nome_bot), [remetente])
                        return false
                    }
                }
            }
            return true
        } catch (err) {
            err.message = `antiFlood - ${err.message}`
            consoleErro(err, "ANTI-FLOOD")
            return true
        }
    }

    // Recurso LISTA-NEGRA
    async obterListaNegra(id_grupo) {
        return await this.grupo.obterListaNegra(id_grupo)
    }

    async adicionarUsuarioListaNegra(id_grupo, id_usuario) {
        await this.grupo.adicionarListaNegra(id_grupo, id_usuario)
    }

    async removerUsuarioListaNegra(id_grupo, id_usuario) {
        await this.grupo.removerListaNegra(id_grupo, id_usuario)
    }

    async verificarListaNegraGeral(c, gruposInfo, botInfo) {
        try {
            const comandos_info = comandosInfo(botInfo)
            for (let grupo of gruposInfo) {
                let grupoAdmins = await socket.obterAdminsGrupoPorMetadata(grupo), botAdmin = grupoAdmins.includes(botInfo.numero_bot)
                if (botAdmin) {
                    let participantesGrupo = await socket.obterMembrosGrupoPorMetadata(grupo), lista_negra = await this.obterListaNegra(grupo.id), usuarios_listados = []
                    for (let participante of participantesGrupo) {
                        if (lista_negra.includes(participante)) usuarios_listados.push(participante)
                    }
                    for (let usuario of usuarios_listados) {
                        await socket.removerParticipante(c, grupo.id, usuario)
                        await socket.enviarTextoComMencoes(c, grupo.id, criarTexto(comandos_info.outros.resposta_ban, mencaoNumero(usuario), comandos_info.grupo.listanegra.msgs.motivo, botInfo.nome_bot), [usuario])
                    }
                }
            }
        } catch (err) {
            err.message = `verificarListaNegraGeral - ${err.message}`
            throw err
        }
    }

    async verificarListaNegraUsuario(c, evento, botInfo) {
        try {
            const comandos_info = comandosInfo(botInfo)
            const grupoAdmins = await this.obterAdminsGrupo(evento.id), botAdmin = grupoAdmins.includes(botInfo.numero_bot)
            if (botAdmin) {
                let lista_negra = await this.obterListaNegra(evento.id)
                if (lista_negra.includes(evento.participants[0])) {
                    await socket.removerParticipante(c, evento.id, evento.participants[0])
                    await socket.enviarTextoComMencoes(c, evento.id, criarTexto(comandos_info.outros.resposta_ban, mencaoNumero(evento.participants[0]), comandos_info.grupo.listanegra.msgs.motivo, botInfo.nome_bot), [evento.participants[0]])
                    return false
                }
            }
            return true
        } catch (err) {
            err.message = `verificarListaNegraUsuario - ${err.message}`
            consoleErro(err, "LISTA NEGRA")
            return true
        }
    }

    //Recurso Bloqueio/Desbloqueio de comandos
    async bloquearComandos(id_grupo, comandos) {
        await this.grupo.adicionarComandoBloqueio(id_grupo, comandos)
    }

    async desbloquearComandos(id_grupo, comandos) {
        await this.grupo.removerComandosBloqueio(id_grupo, comandos)
    }

    async verificarComandosBloqueadosGrupo(comando, grupoInfo, prefixo) {
        return grupoInfo.block_cmds.includes(comando.replace(prefixo, ''))
    }

    async bloquearComandosGrupo(comandos, id_grupo, botInfo) {
        const { prefixo } = botInfo
        const comandos_info = comandosInfo(botInfo)
        let comandosBloqueados = []
        let grupoInfo = await this.obterGrupoInfo(id_grupo)
        let respostaBloqueio = comandos_info.grupo.bcmd.msgs.resposta_titulo
        let categorias = ['figurinhas', 'utilidades', 'downloads', 'diversao']

        if (categorias.includes(comandos[0])) comandos = Object.keys(comandos_info[comandos[0]]).map(comando => prefixo + comando)

        for (let comando of comandos) {
            if (verificarComandoExiste(botInfo, comando, 'utilidades') || verificarComandoExiste(botInfo, comando, 'diversao') || verificarComandoExiste(botInfo, comando, 'figurinhas') || verificarComandoExiste(botInfo, comando, 'downloads')) {
                if (grupoInfo.block_cmds.includes(comando.replace(prefixo, ''))) {
                    respostaBloqueio += criarTexto(comandos_info.grupo.bcmd.msgs.resposta_variavel.ja_bloqueado, comando)
                } else {
                    comandosBloqueados.push(comando.replace(prefixo, ''))
                    respostaBloqueio += criarTexto(comandos_info.grupo.bcmd.msgs.resposta_variavel.bloqueado_sucesso, comando)
                }
            } else if (verificarComandoExiste(botInfo, comando, 'grupo') || verificarComandoExiste(botInfo, comando, 'admin') || verificarComandoExiste(botInfo, comando, 'info')) {
                respostaBloqueio += criarTexto(comandos_info.grupo.bcmd.msgs.resposta_variavel.erro, comando)
            } else {
                respostaBloqueio += criarTexto(comandos_info.grupo.bcmd.msgs.resposta_variavel.nao_existe, comando)
            }
        }

        if (comandosBloqueados.length != 0) await this.bloquearComandos(id_grupo, comandosBloqueados)
        return respostaBloqueio
    }

    async desbloquearComandosGrupo(comandos, id_grupo, botInfo) {
        const comandos_info = comandosInfo(botInfo)
        const { prefixo } = botInfo
        let comandosDesbloqueados = []
        let grupoInfo = await this.obterGrupoInfo(id_grupo)
        let respostaDesbloqueio = comandos_info.grupo.dcmd.msgs.resposta_titulo
        let categorias = ['todos', 'figurinhas', 'utilidades', 'downloads', 'diversao']

        if (categorias.includes(comandos[0])) {
            if (comandos[0] === 'todos') comandos = grupoInfo.block_cmds.map(comando => prefixo + comando)
            else comandos = Object.keys(comandos_info[comandos[0]]).map(comando => prefixo + comando)
        }

        for (let comando of comandos) {
            if (grupoInfo.block_cmds.includes(comando.replace(prefixo, ''))) {
                comandosDesbloqueados.push(comando.replace(prefixo, ''))
                respostaDesbloqueio += criarTexto(comandos_info.grupo.dcmd.msgs.resposta_variavel.desbloqueado_sucesso, comando)
            } else {
                respostaDesbloqueio += criarTexto(comandos_info.grupo.dcmd.msgs.resposta_variavel.ja_desbloqueado, comando)
            }
        }

        if (comandosDesbloqueados.length != 0) await this.desbloquearComandos(id_grupo, comandosDesbloqueados)
        return respostaDesbloqueio
    }
}
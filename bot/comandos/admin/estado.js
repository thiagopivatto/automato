/**
 * !estado online|offline|manutencao — status do perfil do bot.
 */
import * as socket from '../../baileys/socket.js'
import { erroComandoMsg } from '../../lib/util.js'

const STATUS = {
    online: '< 🟢 Online />',
    offline: '< 🔴 Offline />',
    manutencao: '< 🟡 Manutenção />'
}

export async function alterarEstado(ctx) {
    const { c, id_chat, args, texto_recebido, comandos_info, mensagem, comando, botInfo } = ctx
    if (!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
    const modo = String(texto_recebido || '').toLowerCase().trim()
    const status = STATUS[modo]
    if (!status) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
    await socket.alterarStatusPerfil(c, status)
    await socket.responderTexto(c, id_chat, comandos_info.admin.estado.msgs.sucesso, mensagem)
}

export const SUBARGS_ESTADO = Object.keys(STATUS)

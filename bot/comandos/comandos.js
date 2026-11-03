import { metaInfo } from './meta/info.js'
import { metaFigurinhas } from './meta/figurinhas.js'
import { metaUtilidades } from './meta/utilidades.js'
import { metaIa } from './meta/ia.js'
import { metaDownloads } from './meta/downloads.js'
import { metaGrupo } from './meta/grupo.js'
import { metaDiversao } from './meta/diversao.js'
import { metaAdmin } from './meta/admin.js'
import { metaOutros } from './meta/outros.js'

export function comandosInfo(botInfo) {
    const { prefixo, nome_adm, nome_bot } = botInfo
    return {
        info: metaInfo({ prefixo, nome_adm, nome_bot }),
        figurinhas: metaFigurinhas({ prefixo, nome_adm, nome_bot }),
        utilidades: metaUtilidades({ prefixo, nome_adm, nome_bot }),
        ia: metaIa({ prefixo, nome_adm, nome_bot }),
        downloads: metaDownloads({ prefixo, nome_adm, nome_bot }),
        grupo: metaGrupo({ prefixo, nome_adm, nome_bot }),
        diversao: metaDiversao({ prefixo, nome_adm, nome_bot }),
        admin: metaAdmin({ prefixo, nome_adm, nome_bot }),
        outros: metaOutros({ prefixo, nome_adm, nome_bot })
    }
}

export function verificarComandoExiste(botInfo, comando, categoria = null) {
    const { prefixo } = botInfo
    const comandosAtuais = comandosInfo(botInfo)
    const categoriasExistentes = Object.keys(comandosAtuais).filter((key) => key != 'outros')
    let comandos
    if (!categoria) {
        comandos = [
            ...Object.keys(comandosAtuais.utilidades),
            ...Object.keys(comandosAtuais.ia || {}),
            ...Object.keys(comandosAtuais.diversao),
            ...Object.keys(comandosAtuais.info),
            ...Object.keys(comandosAtuais.grupo),
            ...Object.keys(comandosAtuais.admin),
            ...Object.keys(comandosAtuais.figurinhas),
            ...Object.keys(comandosAtuais.downloads)
        ].map((cmd) => prefixo + cmd)
    } else {
        if (!categoriasExistentes.includes(categoria)) return []
        comandos = Object.keys(comandosAtuais[categoria] || {}).map((cmd) => prefixo + cmd)
    }
    return comandos.includes(comando)
}

export function obterGuiaComando(categoria, comando, botInfo) {
    const cabecalho = comandosInfo(botInfo).outros.cabecalho_guia
    const { prefixo } = botInfo
    comando = comando.replace(prefixo, '')
    const comandosCategoria = comandosInfo(botInfo)[categoria]
    return cabecalho + (comandosCategoria[comando]?.guia ?? '')
}

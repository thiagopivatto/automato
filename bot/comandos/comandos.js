import { metaInfo } from './meta/info.js'
import { metaFigurinhas } from './meta/figurinhas.js'
import { metaUtilidades } from './meta/utilidades.js'
import { metaIa } from './meta/ia.js'
import { metaDownloads } from './meta/downloads.js'
import { metaGrupo } from './meta/grupo.js'
import { metaDiversao } from './meta/diversao.js'
import { metaAdmin } from './meta/admin.js'
import { metaOutros } from './meta/outros.js'
import { ALIASES_HANDLER } from './meta/registro.js'

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

/** Resolve alias de handler (ex.: criarimagem → criarimg). */
export function nomeComandoCanonico(comandoOuNome, prefixo = '') {
    const raw = String(comandoOuNome || '')
    const sem = prefixo && raw.startsWith(prefixo) ? raw.slice(prefixo.length) : raw.replace(/^[!#.\*\-\+/\$&]/, '')
    const key = String(sem || '').toLowerCase()
    return ALIASES_HANDLER[key] || key
}

export function verificarComandoExiste(botInfo, comando, categoria = null) {
    const { prefixo } = botInfo
    const comandosAtuais = comandosInfo(botInfo) || {}
    const categoriasExistentes = Object.keys(comandosAtuais).filter((key) => key != 'outros')
    const nome = nomeComandoCanonico(comando, prefixo)
    const alvo = prefixo + nome
    let comandos
    if (!categoria) {
        comandos = [
            ...Object.keys(comandosAtuais.utilidades || {}),
            ...Object.keys(comandosAtuais.ia || {}),
            ...Object.keys(comandosAtuais.diversao || {}),
            ...Object.keys(comandosAtuais.info || {}),
            ...Object.keys(comandosAtuais.grupo || {}),
            ...Object.keys(comandosAtuais.admin || {}),
            ...Object.keys(comandosAtuais.figurinhas || {}),
            ...Object.keys(comandosAtuais.downloads || {})
        ].map((cmd) => prefixo + cmd)
    } else {
        if (!categoriasExistentes.includes(categoria)) return false
        comandos = Object.keys(comandosAtuais[categoria] || {}).map((cmd) => prefixo + cmd)
    }
    return comandos.includes(alvo) || comandos.includes(comando)
}

/** Comando de verdade: o texto começa com o prefixo e o nome existe. */
export function mensagemEhComando(botInfo, comando) {
    const prefixo = String(botInfo?.prefixo || '')
    const texto = String(comando || '')
    if (!prefixo || !texto.startsWith(prefixo) || texto === prefixo) return false
    return verificarComandoExiste(botInfo, texto)
}

export function obterGuiaComando(categoria, comando, botInfo) {
    const cabecalho = comandosInfo(botInfo).outros.cabecalho_guia
    const { prefixo } = botInfo
    const nome = nomeComandoCanonico(comando, prefixo)
    const comandosCategoria = comandosInfo(botInfo)[categoria] || {}
    return cabecalho + (comandosCategoria[nome]?.guia ?? '')
}

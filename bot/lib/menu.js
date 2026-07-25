/** Menus do Ultron — layout único e limpo */

const rodape = (botInfo) => {
    const { nome_bot, nome_adm } = botInfo
    return `_*${nome_bot?.trim()}* · ${nome_adm?.trim()}_`
}

const cabecalho = (titulo, prefixo) =>
    `╭─── ${titulo} ───╮\n` +
    `│  Ajuda: *${prefixo}comando guia*\n` +
    `│`

export const menuPrincipal = (botInfo) => {
    const { nome_bot, prefixo } = botInfo
    return `${cabecalho(`*${nome_bot?.trim()}*`, prefixo)}
│  *${prefixo}menu* 0  Info
│  *${prefixo}menu* 1  Figurinhas
│  *${prefixo}menu* 2  Utilidades + IA
│  *${prefixo}menu* 3  Downloads
│  *${prefixo}menu* 4  Grupo
│  *${prefixo}menu* 5  Diversão
╰──────────────╯
${rodape(botInfo)}`
}

export const menuFigurinhas = (botInfo) => {
    const { prefixo } = botInfo
    return `${cabecalho('FIGURINHAS', prefixo)}
│  *${prefixo}s* · *${prefixo}s 1* · *${prefixo}s 2*
│  *${prefixo}ssf* — sem fundo
│  *${prefixo}snome* pack, autor
│  *${prefixo}simg* — sticker → foto
│  *${prefixo}emojimix* 💩+😀
╰──────────────╯
${rodape(botInfo)}`
}

export const menuInfoSuporte = (botInfo) => {
    const { prefixo } = botInfo
    return `${cabecalho('INFO', prefixo)}
│  *${prefixo}info* · *${prefixo}meusdados*
│  *${prefixo}reportar* msg
│  *${prefixo}sugerir* msg
╰──────────────╯
${rodape(botInfo)}`
}

export const menuDownload = (botInfo) => {
    const { prefixo } = botInfo
    return `${cabecalho('DOWNLOADS', prefixo)}
│  *${prefixo}play* · *${prefixo}yt*
│  *${prefixo}ig* · *${prefixo}tk* · *${prefixo}fb* · *${prefixo}tw*
│  *${prefixo}img* tema
│  _YouTube: yt-dlp_
╰──────────────╯
${rodape(botInfo)}`
}

export const menuUtilidades = (botInfo) => {
    const { prefixo } = botInfo
    return `${cabecalho('UTILIDADES + IA', prefixo)}
│  Consultas
│  *${prefixo}chat* · *${prefixo}pesquisa* · *${prefixo}resuma*
│  *${prefixo}curiosidade* · *${prefixo}noticias*
│  *${prefixo}clima* · *${prefixo}calc* · *${prefixo}moeda*
│  *${prefixo}traduz* · *${prefixo}letra* · *${prefixo}encurtar*
│
│  IA
│  *${prefixo}explica* · *${prefixo}criaimg* · *${prefixo}criavideo*
│  *${prefixo}i2i* · *${prefixo}musica* · *${prefixo}resumodogrupo*
│  *${prefixo}vocalsonly* · *${prefixo}instrumentalonly*
│
│  Áudio / imagem
│  *${prefixo}voz* · *${prefixo}ouvir* · *${prefixo}audio*
│  *${prefixo}rbg* · *${prefixo}qualmusica*
╰──────────────╯
${rodape(botInfo)}`
}

export const menuGrupo = (admin, botInfo) => {
    const { prefixo } = botInfo
    if (!admin) {
        return `${cabecalho('GRUPO', prefixo)}
│  *${prefixo}regras* · *${prefixo}adms* · *${prefixo}dono*
│  *${prefixo}enquete* pergunta,op1,op2
╰──────────────╯
${rodape(botInfo)}`
    }
    return `${cabecalho('GRUPO (ADM)', prefixo)}
│  Geral
│  *${prefixo}status* · *${prefixo}regras* · *${prefixo}adms*
│  *${prefixo}mt* · *${prefixo}mta* · *${prefixo}rt* · *${prefixo}mm*
│  *${prefixo}resumodogrupo*
│
│  Recursos
│  *${prefixo}automsg* · *${prefixo}autosimi* · *${prefixo}autosticker*
│  *${prefixo}mutar* · *${prefixo}alink* · *${prefixo}bv* · *${prefixo}aflood*
│
│  Moderação
│  *${prefixo}ban* · *${prefixo}add* · *${prefixo}promover* · *${prefixo}rebaixar*
│  *${prefixo}bcmd* · *${prefixo}listanegra* · *${prefixo}apg*
╰──────────────╯
${rodape(botInfo)}`
}

export const menuDiversao = (grupo, botInfo) => {
    const { prefixo } = botInfo
    if (!grupo) {
        return `${cabecalho('DIVERSÃO', prefixo)}
│  *${prefixo}ppt* · *${prefixo}caracoroa* · *${prefixo}piada*
│  *${prefixo}simi* · *${prefixo}chance* · *${prefixo}fch*
│  *${prefixo}issoouaquilo* · *${prefixo}verdadeoudesafio* [1-5]
╰──────────────╯
${rodape(botInfo)}`
    }
    return `${cabecalho('DIVERSÃO', prefixo)}
│  Jogos
│  *${prefixo}ppt* · *${prefixo}caracoroa* · *${prefixo}piada*
│  *${prefixo}issoouaquilo* · *${prefixo}ioa*
│  *${prefixo}verdadeoudesafio* · *${prefixo}vod*
│
│  Grupo
│  *${prefixo}casal* · *${prefixo}trisal* · *${prefixo}sortear* · *${prefixo}top*
│  *${prefixo}simi* · *${prefixo}chance* · *${prefixo}par*
│
│  Drama IA
│  *${prefixo}fofoca* · *${prefixo}crime* · *${prefixo}tribunal*
│  *${prefixo}prefeito* · *${prefixo}horoscopo*
│  *${prefixo}cancelado* · *${prefixo}boladocotidiano* · *${prefixo}jornal*
╰──────────────╯
${rodape(botInfo)}`
}

export const menuAdmin = (botInfo) => {
    const { prefixo } = botInfo
    return `${cabecalho('ADMIN / DONO', prefixo)}
│  *${prefixo}infobot* · *${prefixo}ping* · *${prefixo}limpar*
│  *${prefixo}sugestoes* · *${prefixo}bcgrupos* · *${prefixo}aviso*
│  *${prefixo}grupos* · *${prefixo}sair* · *${prefixo}desligar*
│  *${prefixo}limitediario* · *${prefixo}pvliberado*
╰──────────────╯
${rodape(botInfo)}`
}

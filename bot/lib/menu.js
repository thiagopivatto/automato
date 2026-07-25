
export const menuPrincipal  = (botInfo)=> { 
    let {nome_bot, nome_adm, prefixo} = botInfo
    return `╭━━━『 *${nome_bot?.trim()}* 』━━━╮
┃
┃  Digite um dos menus:
┃
┃  *${prefixo}menu* 0  — Informação
┃  *${prefixo}menu* 1  — Figurinhas
┃  *${prefixo}menu* 2  — Utilidades + IA
┃  *${prefixo}menu* 3  — Downloads
┃  *${prefixo}menu* 4  — Grupo
┃  *${prefixo}menu* 5  — Diversão
┃
┃  Dica: *${prefixo}comando guia*
╰━━━━━━━━━━━━━━━━━━━━━━╯
_*${nome_bot?.trim()}* by ${nome_adm?.trim()}_`
}

export const menuFigurinhas = (botInfo)=>{
    let {nome_bot, nome_adm, prefixo} = botInfo
    return `╭━━━『 FIGURINHAS 』━━━╮
┃ Guia: *${prefixo}comando guia*
┃
┃ *${prefixo}s*
┃  Imagem/vídeo → sticker
┃ *${prefixo}s 1*
┃  Sticker circular
┃ *${prefixo}s 2*
┃  Sticker sem cortar
┃ *${prefixo}snome* pack, autor
┃  Renomeia o sticker
┃ *${prefixo}simg*
┃  Sticker → foto
┃ *${prefixo}emojimix* 💩+😀
┃  Mistura 2 emojis
╰━━━━━━━━━━━━━━━━━━━━━━╯
_*${nome_bot?.trim()}* by ${nome_adm?.trim()}_`
}

export const menuInfoSuporte = (botInfo)=>{
    let {nome_bot, nome_adm, prefixo} = botInfo
    return `╭━━━『 INFO / SUPORTE 』━━━╮
┃ Guia: *${prefixo}comando guia*
┃
┃ *${prefixo}info* — Dados do bot
┃ *${prefixo}reportar* msg — Avisa o dono
┃ *${prefixo}meusdados* — Seu uso
╰━━━━━━━━━━━━━━━━━━━━━━╯
_*${nome_bot?.trim()}* by ${nome_adm?.trim()}_`
}

export const menuDownload = (botInfo)=>{
    let {nome_bot, nome_adm, prefixo} = botInfo
    return `╭━━━『 DOWNLOADS 』━━━╮
┃ Guia: *${prefixo}comando guia*
┃
┃ *${prefixo}play* nome
┃  Áudio do YouTube
┃ *${prefixo}yt* nome/link
┃  Vídeo do YouTube
┃ *${prefixo}fb* link
┃  Vídeo do Facebook
┃ *${prefixo}ig* link
┃  Foto/vídeo Instagram
┃ *${prefixo}tw* link
┃  Foto/vídeo Twitter/X
┃ *${prefixo}tk* link
┃  Vídeo do TikTok
┃ *${prefixo}img* tema
┃  Busca imagens
┃
┃ _YouTube precisa do yt-dlp_
╰━━━━━━━━━━━━━━━━━━━━━━╯
_*${nome_bot?.trim()}* by ${nome_adm?.trim()}_`
}

export const menuUtilidades = (botInfo)=>{
    let {nome_bot, nome_adm, prefixo} = botInfo
    return `╭━━━『 UTILIDADES 』━━━╮
┃ Guia: *${prefixo}comando guia*
┃
┃── Consultas ──
┃ *${prefixo}chat* texto — IA com memória
┃ *${prefixo}pesquisa* texto — Perplexity
┃ *${prefixo}grok* pergunta
┃ *${prefixo}vagas* cargo/cidade
┃ *${prefixo}resuma* — resume msg marcada
┃ *${prefixo}comofaz* — WikiHow aleatório
┃ *${prefixo}curiosidade* — Fato aleatório
┃ *${prefixo}playlist* descrição
┃ *${prefixo}animes* / *${prefixo}mangas*
┃ *${prefixo}filmes* / *${prefixo}series*
┃ *${prefixo}encurtar* link
┃ *${prefixo}letra* música
┃ *${prefixo}traduz* idioma texto
┃ *${prefixo}clima* cidade
┃ *${prefixo}noticias*
┃ *${prefixo}moeda* tipo valor
┃ *${prefixo}calc* expressão
┃ *${prefixo}rastreio* código
┃ *${prefixo}ddd* / *${prefixo}tabela*
┃
┃── IA ──
┃ *${prefixo}explica* texto
┃ *${prefixo}spoiler* filme
┃ *${prefixo}argumentos* tema
┃ *${prefixo}proscons* produto
┃ *${prefixo}comparar* a vs b
┃ *${prefixo}cotacao* ativo
┃ *${prefixo}simulado* tema
┃ *${prefixo}roteiro* tema
┃ *${prefixo}criaimg* prompt
┃ *${prefixo}criavideo* prompt
┃ *${prefixo}upscale* (responda img)
┃ *${prefixo}musica* prompt
┃ *${prefixo}vocalsonly* (áudio)
┃ *${prefixo}instrumentalonly* (áudio)
┃ *${prefixo}resumodogrupo* — podcast msgs
┃
┃── Áudio / Imagem ──
┃ *${prefixo}ouvir* · *${prefixo}audio* · *${prefixo}voz*
┃ *${prefixo}upimg* · *${prefixo}rbg*
┃ *${prefixo}qualmusica* · *${prefixo}qualanime*
╰━━━━━━━━━━━━━━━━━━━━━━╯
_*${nome_bot?.trim()}* by ${nome_adm?.trim()}_`
}

export const menuGrupo = (admin, botInfo)=>{
    let {nome_bot, nome_adm, prefixo} = botInfo
    if(admin){
        return `╭━━━『 GRUPO (ADM) 』━━━╮
┃ Guia: *${prefixo}comando guia*
┃
┃── Geral ──
┃ *${prefixo}status* · *${prefixo}regras*
┃ *${prefixo}adms* · *${prefixo}fotogrupo*
┃ *${prefixo}resumodogrupo* — resumo ~3min
┃ *${prefixo}mt* msg — marca todos
┃ *${prefixo}mta* [msg] — marca anônimo
┃ *${prefixo}rt* [msg] — igual ao mta
┃ *${prefixo}mm* msg — só membros
┃ *${prefixo}dono*
┃
┃── Atividade ──
┃ *${prefixo}contador* · *${prefixo}atividade*
┃ *${prefixo}alterarcont* · *${prefixo}topativos*
┃ *${prefixo}imarcar* · *${prefixo}ibanir*
┃
┃── Bloqueio / Lista ──
┃ *${prefixo}bcmd* · *${prefixo}dcmd*
┃ *${prefixo}listanegra* · *${prefixo}addlista* · *${prefixo}remlista*
┃
┃── Recursos ──
┃ *${prefixo}mutar* · *${prefixo}autosticker*
┃ *${prefixo}autosimi* — Simi automático
┃ *${prefixo}alink* · *${prefixo}bv*
┃ *${prefixo}aflood*
┃
┃── Admin ──
┃ *${prefixo}add* · *${prefixo}ban*
┃ *${prefixo}restrito* · *${prefixo}promover* · *${prefixo}rebaixar*
┃ *${prefixo}link* · *${prefixo}rlink*
┃ *${prefixo}apg* · *${prefixo}bantodos*
┃ *${prefixo}revelar* · *${prefixo}enquete*
╰━━━━━━━━━━━━━━━━━━━━━━╯
_*${nome_bot?.trim()}* by ${nome_adm?.trim()}_`
    } else {
        return `╭━━━『 GRUPO 』━━━╮
┃ Guia: *${prefixo}comando guia*
┃
┃ *${prefixo}regras* — regras do grupo
┃ *${prefixo}adms* — lista admins
┃ *${prefixo}dono* — dono do grupo
┃ *${prefixo}enquete* pergunta,op1,op2
╰━━━━━━━━━━━━━━━━━━━━━━╯
_*${nome_bot?.trim()}* by ${nome_adm?.trim()}_`
    }
}

export const menuDiversao = (grupo, botInfo )=>{
    let {nome_bot, nome_adm, prefixo} = botInfo
    if(grupo){
        return `╭━━━『 DIVERSÃO 』━━━╮
┃ Guia: *${prefixo}comando guia*
┃
┃── Jogos ──
┃ *${prefixo}ppt* pedra|papel|tesoura
┃ *${prefixo}caracoroa*
┃
┃── Diversão ──
┃ *${prefixo}mascote*
┃ *${prefixo}simi* frase — chat com contexto
┃ *${prefixo}autosimi* — só admins (grupo)
┃ *${prefixo}viadometro* · *${prefixo}detector*
┃ *${prefixo}casal* · *${prefixo}trisal*
┃ *${prefixo}sortear* · *${prefixo}top* qtde tema
┃ *${prefixo}fch* · *${prefixo}chance*
┃ *${prefixo}gadometro* · *${prefixo}bafometro*
┃ *${prefixo}par* @a @b
┃ *${prefixo}verdadeoudesafio* [tipo] [1-5]
┃ *${prefixo}vod* — atalho
┃ *${prefixo}roletarussa* — (só adm)
╰━━━━━━━━━━━━━━━━━━━━━━╯
_*${nome_bot?.trim()}* by ${nome_adm?.trim()}_`
    } else {
        return `╭━━━『 DIVERSÃO 』━━━╮
┃ Guia: *${prefixo}comando guia*
┃
┃ *${prefixo}ppt* pedra|papel|tesoura
┃ *${prefixo}caracoroa*
┃ *${prefixo}mascote*
┃ *${prefixo}simi* frase
┃ *${prefixo}chance* texto
┃ *${prefixo}fch*
┃ *${prefixo}verdadeoudesafio* [1-5]
╰━━━━━━━━━━━━━━━━━━━━━━╯
_*${nome_bot?.trim()}* by ${nome_adm?.trim()}_`
    }
}

export const menuAdmin = (botInfo)=>{
    let {nome_bot, nome_adm, prefixo} = botInfo
    return `╭━━━『 ADMIN / DONO 』━━━╮
┃ Guia: *${prefixo}comando guia*
┃
┃── Visual ──
┃ *${prefixo}nomebot* · *${prefixo}nomeadm*
┃ *${prefixo}nomesticker* · *${prefixo}prefixo*
┃ *${prefixo}fotobot* · *${prefixo}estado*
┃
┃── Sistema ──
┃ *${prefixo}infobot* · *${prefixo}ping*
┃ *${prefixo}bloquear* · *${prefixo}desbloquear*
┃ *${prefixo}listablock*
┃ *${prefixo}bcgrupos* / *${prefixo}aviso*
┃ *${prefixo}desligar*
┃
┃── Usuários / Limites ──
┃ *${prefixo}verdados* · *${prefixo}usuarios* · *${prefixo}tipos*
┃ *${prefixo}novotipo* · *${prefixo}deltipo*
┃ *${prefixo}usuariotipo* · *${prefixo}limpartipo*
┃ *${prefixo}limitediario* · *${prefixo}taxacomandos*
┃ *${prefixo}rtodos* · *${prefixo}r*
┃
┃── Comandos / PV ──
┃ *${prefixo}bcmdglobal* · *${prefixo}dcmdglobal*
┃ *${prefixo}pvliberado* · *${prefixo}autostickerpv*
┃ *${prefixo}autorevelar* · *${prefixo}revelar*
┃
┃── Grupos ──
┃ *${prefixo}grupos* · *${prefixo}linkgrupo*
┃ *${prefixo}sair* · *${prefixo}sairgrupos*
┃ *${prefixo}entrargrupo* link
╰━━━━━━━━━━━━━━━━━━━━━━╯
_*${nome_bot?.trim()}* by ${nome_adm?.trim()}_`
}

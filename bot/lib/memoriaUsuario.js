/**
 * Memória por usuário — arquivo JSON em dados/memoria-usuarios/.
 * LID e telefone da mesma pessoa caem no mesmo arquivo.
 * O que foi dito num grupo ou no privado só volta naquele chat.
 * Fatos observados não somem quando o log de interações é cortado.
 */
import fs from 'fs-extra'
import path from 'node:path'
import { caminhoDados } from './caminhos.js'
import { mencaoNumero } from './util.js'

const DIR = () => caminhoDados('memoria-usuarios')
const MAX_INTERACOES = 40
const MAX_FATOS = 200
const INDEX = () => path.join(DIR(), '_index.json')

function vazio(idUsuario) {
    return {
        id: idUsuario || '',
        aliases: [],
        nome: '',
        cidade: '',
        cidades: {},
        fatos: [],
        interacoes: [],
        resumo: '',
        resumos: {},
        atualizado_em: 0
    }
}

/**
 * Grupo: g:<jid @g.us>. Privado: pv:<arquivo canônico da pessoa>.
 * Sem id de chat, não há escopo.
 */
export function escopoDeChat(idChat, canonKey = '') {
    const id = String(idChat || '').trim()
    if (!id) return ''
    if (id.startsWith('g:')) {
        const jid = id.slice(2)
        return jid.endsWith('@g.us') ? `g:${jid}` : ''
    }
    if (id.endsWith('@g.us')) return `g:${id}`
    if (id.startsWith('pv:')) return id.slice(0, 90)
    const chave = String(canonKey || chaveDe(id) || '').trim()
    return chave ? `pv:${chave}` : ''
}

function textoFato(f) {
    return String(typeof f === 'string' ? f : f?.texto || '').trim()
}

function chatFato(f) {
    return String(typeof f === 'string' ? '' : f?.chat || '').trim()
}

function chaveDe(id) {
    return mencaoNumero(id) || ''
}

/** Escopo para ler a ficha: grupo vale para qualquer membro; privado só para quem é daquele chat. */
function escopoDaLeitura(idChat, canonKey, aliases = []) {
    const id = String(idChat || '').trim()
    if (!id) return ''
    if (id.endsWith('@g.us')) return `g:${id}`
    if (id.startsWith('g:')) {
        const jid = id.slice(2)
        return jid.endsWith('@g.us') ? `g:${jid}` : ''
    }
    const chaves = new Set(
        [canonKey, ...(aliases || [])].map((a) => String(a || '').trim()).filter(Boolean)
    )
    const chaveChat = id.startsWith('pv:') ? id.slice(3) : chaveDe(id)
    if (chaveChat && chaves.has(chaveChat) && canonKey) return `pv:${canonKey}`
    return ''
}

function ehPn(id) {
    return /@s\.whatsapp\.net$/i.test(String(id || ''))
}

export function extrairCidadePessoa(texto) {
    const m = String(texto || '').match(
        /\b(?:moro em|sou de|estou em|to em|t[oô] em|aqui em|vivo em)\s+([\p{L}][\p{L}'’.-]{1,24}(?:\s+[\p{L}][\p{L}'’.-]{1,24}){0,2})/iu
    )
    if (!m?.[1]) return ''
    return m[1].replace(/[?!.,]+$/g, '').trim().slice(0, 40)
}

/** Frases em que a pessoa fala de si. */
export function extrairFatosDeTexto(texto, nome = '') {
    const p = String(texto || '').replace(/\s+/g, ' ').trim()
    if (!p) return []
    const fatos = []
    const baixo = p.toLowerCase()
    if (/\b(meu nome é|meu nome e|me chamo|sou o|sou a)\b/.test(baixo) && nome) {
        fatos.push(`Se apresenta como ${nome}`)
    }
    const re =
        /\b((?:eu|meu|minha|me chamo|sou o|sou a|moro|trabalho|estudo|gosto|odeio|amo|nasci|tenho)\b[^.\n!?]{0,140})/gi
    for (const achado of p.matchAll(re)) {
        const f = String(achado[1] || '').trim()
        if (f.length >= 6) fatos.push(f.slice(0, 160))
    }
    const cidade = extrairCidadePessoa(p)
    if (cidade) fatos.push(`Cidade: ${cidade}`)
    return [...new Set(fatos)]
}

function fatoDuravel(f) {
    return /\b(eu|meu|minha|moro|chamo|gosto|odeio|amo|trabalho|estudo|cidade|nasci|tenho|sou)\b/i.test(
        String(f || '')
    )
}

function incluirFato(fatos, texto, chat = '') {
    const t = String(texto || '').trim()
    if (!t) return
    const c = String(chat || '')
    if (fatos.some((f) => textoFato(f) === t && chatFato(f) === c)) return
    fatos.push({ texto: t.slice(0, 160), chat: c })
}

export function podarFatos(fatos, max = MAX_FATOS) {
    const lista = []
    const visto = new Set()
    for (const f of fatos || []) {
        const texto = textoFato(f).slice(0, 160)
        const chat = chatFato(f)
        if (!texto) continue
        const k = `${chat}\0${texto}`
        if (visto.has(k)) continue
        visto.add(k)
        lista.push({ texto, chat })
    }
    if (lista.length <= max) return lista
    const duraveis = lista.filter((f) => fatoDuravel(f.texto))
    const ecos = lista.filter((f) => !fatoDuravel(f.texto))
    const keepDur = duraveis.length > max ? duraveis.slice(-max) : duraveis
    const resto = max - keepDur.length
    const keepEco = resto > 0 ? ecos.slice(-resto) : []
    return [...keepDur, ...keepEco].slice(-max)
}

/**
 * Corta o log e dobra o que saiu em fatos, para não jogar informação fora.
 */
export function aplicarCorteMemoria(dados, maxInteracoes = MAX_INTERACOES) {
    const fatos = Array.isArray(dados?.fatos) ? [...dados.fatos] : []
    let inter = Array.isArray(dados?.interacoes) ? [...dados.interacoes] : []
    const max = Math.max(1, Number(maxInteracoes) || MAX_INTERACOES)
    if (inter.length > max) {
        const removidas = inter.slice(0, inter.length - max)
        inter = inter.slice(-max)
        for (const i of removidas) {
            const chat = String(i?.chat || '')
            for (const f of extrairFatosDeTexto(i?.pergunta, dados?.nome)) {
                incluirFato(fatos, f, chat)
            }
            const echo = String(i?.pergunta || '').replace(/\s+/g, ' ').trim().slice(0, 160)
            if (echo) incluirFato(fatos, echo, chat)
        }
    }
    return {
        ...dados,
        fatos: podarFatos(fatos),
        interacoes: inter
    }
}

async function lerIndex() {
    try {
        if (!(await fs.pathExists(INDEX()))) return {}
        const raw = await fs.readJson(INDEX())
        return raw && typeof raw === 'object' ? raw : {}
    } catch {
        return {}
    }
}

async function salvarIndex(index) {
    await fs.ensureDir(DIR())
    await fs.writeJson(INDEX(), index, { spaces: 2 })
}

function mapaTexto(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    const out = {}
    for (const [k, v] of Object.entries(raw)) {
        const chave = String(k || '').trim()
        const valor = String(v || '').trim()
        if (chave && valor) out[chave] = valor
    }
    return out
}

function normalizarDoc(raw, idUsuario) {
    const base = vazio(idUsuario)
    if (!raw || typeof raw !== 'object') return base
    return {
        ...base,
        id: raw.id || idUsuario,
        aliases: Array.isArray(raw.aliases) ? raw.aliases.map(String) : [],
        nome: raw.nome || '',
        cidade: raw.cidade || '',
        cidades: mapaTexto(raw.cidades),
        fatos: Array.isArray(raw.fatos) ? raw.fatos : [],
        interacoes: Array.isArray(raw.interacoes) ? raw.interacoes : [],
        resumo: raw.resumo || '',
        resumos: mapaTexto(raw.resumos),
        atualizado_em: raw.atualizado_em || 0
    }
}

async function lerPorChave(chave) {
    if (!chave) return vazio('')
    const arq = path.join(DIR(), `${chave}.json`)
    try {
        if (!(await fs.pathExists(arq))) return vazio('')
        return normalizarDoc(await fs.readJson(arq), '')
    } catch {
        return vazio('')
    }
}

function fundirDocs(base, outro) {
    const out = normalizarDoc(base, base.id)
    if (!out.nome && outro.nome) out.nome = outro.nome
    if (!out.cidade && outro.cidade) out.cidade = outro.cidade
    if (!out.resumo && outro.resumo) out.resumo = outro.resumo
    out.cidades = { ...mapaTexto(outro.cidades), ...out.cidades }
    out.resumos = { ...mapaTexto(outro.resumos), ...out.resumos }
    for (const f of outro.fatos || []) {
        incluirFato(out.fatos, textoFato(f), chatFato(f))
    }
    const visto = new Set(out.interacoes.map((i) => `${i.quando}|${i.chat}|${i.pergunta}`))
    for (const i of outro.interacoes || []) {
        const k = `${i.quando}|${i.chat}|${i.pergunta}`
        if (!visto.has(k)) {
            out.interacoes.push(i)
            visto.add(k)
        }
    }
    out.interacoes.sort((a, b) => Number(a.quando || 0) - Number(b.quando || 0))
    for (const a of outro.aliases || []) {
        if (a && !out.aliases.includes(a)) out.aliases.push(a)
    }
    return out
}

async function carregarFundido(idUsuario, aliases = []) {
    const ids = [...new Set([idUsuario, ...(aliases || [])].filter(Boolean).map(String))]
    const chaves = [...new Set(ids.map(chaveDe).filter(Boolean))]
    const index = await lerIndex()
    const pnPassado = ids.find(ehPn)
    const hinted = chaves.map((c) => index[c]).find(Boolean)
    const canonId = pnPassado || idUsuario || ids[0] || ''
    const canonKey = (pnPassado ? chaveDe(pnPassado) : '') || hinted || chaveDe(canonId) || chaves[0] || 'x'
    const existentes = new Set()
    for (const c of chaves) {
        if (index[c]) existentes.add(String(index[c]))
        if (await fs.pathExists(path.join(DIR(), `${c}.json`))) existentes.add(c)
    }
    if (index[canonKey]) existentes.add(String(index[canonKey]))
    if (await fs.pathExists(path.join(DIR(), `${canonKey}.json`))) existentes.add(canonKey)
    let doc = await lerPorChave(canonKey)
    doc.id = canonId || doc.id
    const apagar = []
    for (const e of existentes) {
        if (e === canonKey) continue
        const outro = await lerPorChave(e)
        doc = fundirDocs(doc, outro)
        apagar.push(e)
    }
    for (const c of chaves) {
        if (!doc.aliases.includes(c)) doc.aliases.push(c)
    }
    doc.id = canonId || doc.id
    if (apagar.length) await salvar(doc, canonKey)
    for (const e of apagar) {
        try {
            await fs.remove(path.join(DIR(), `${e}.json`))
        } catch { /* ignore */ }
    }
    let indexMudou = false
    for (const c of chaves) {
        if (index[c] !== canonKey) {
            index[c] = canonKey
            indexMudou = true
        }
    }
    if (indexMudou) await salvarIndex(index)
    return { doc, canonKey }
}

async function salvar(doc, canonKey) {
    await fs.ensureDir(DIR())
    doc.atualizado_em = Date.now()
    doc.fatos = podarFatos(doc.fatos)
    await fs.writeJson(path.join(DIR(), `${canonKey}.json`), doc, { spaces: 2 })
}

function noEscopo(chat, escopo, canonKey) {
    if (!escopo) return false
    return escopoDeChat(chat, canonKey) === escopo
}

function textoDeDoc(d, escopo, canonKey) {
    if (!escopo) return ''
    const cidade = String(d.cidades?.[escopo] || '').trim()
    const resumo = String(d.resumos?.[escopo] || '').trim()
    const fatos = (d.fatos || [])
        .filter((f) => noEscopo(chatFato(f), escopo, canonKey))
        .map((f) => textoFato(f))
        .filter(Boolean)
    const inter = (d.interacoes || []).filter((i) => noEscopo(i?.chat, escopo, canonKey))
    if (!cidade && !resumo && !fatos.length && !inter.length) return ''
    const partes = []
    if (d.nome) partes.push(`Nome conhecido: ${d.nome}`)
    if (cidade) partes.push(`Cidade: ${cidade}`)
    if (resumo) partes.push(`Resumo: ${resumo}`)
    if (fatos.length) {
        partes.push('Fatos:\n- ' + fatos.slice(-30).join('\n- '))
    }
    if (inter.length) {
        const ult = inter.slice(-8).map((i) => {
            const q = String(i.pergunta || '').slice(0, 160)
            const r = String(i.resposta || '').slice(0, 120)
            return r ? `User: ${q}\nUltron: ${r}` : `User: ${q}`
        })
        partes.push('Interações recentes:\n' + ult.join('\n---\n'))
    }
    return partes.join('\n\n').slice(0, 3500)
}

/** Texto pronto para injetar no system do chat. Sem idChat, não devolve conversa. */
export async function obterMemoriaUsuarioTexto(idUsuario, aliases = [], idChat = '') {
    try {
        if (!idChat) return ''
        const { doc, canonKey } = await carregarFundido(idUsuario, aliases)
        const escopo = escopoDaLeitura(idChat, canonKey, doc.aliases)
        return textoDeDoc(doc, escopo, canonKey)
    } catch {
        return ''
    }
}

/** Cidade dita neste chat, para clima quando o pedido não traz lugar. */
export async function obterCidadeMemoria(idUsuario, aliases = [], idChat = '') {
    try {
        if (!idChat) return ''
        const { doc, canonKey } = await carregarFundido(idUsuario, aliases)
        const escopo = escopoDaLeitura(idChat, canonKey, doc.aliases)
        if (!escopo) return ''
        return String(doc.cidades?.[escopo] || '').trim()
    } catch {
        return ''
    }
}

/**
 * Registra interação e extrai fatos. Interação velha vira fato antes de sair.
 */
export async function registrarMemoriaUsuario({
    idUsuario,
    aliases = [],
    nome = '',
    idChat = '',
    pergunta = '',
    resposta = ''
}) {
    if (!idUsuario) return
    try {
        const { doc: d, canonKey } = await carregarFundido(idUsuario, aliases)
        if (nome && !/^\d{6,}$/.test(String(nome))) d.nome = String(nome).slice(0, 80)

        const escopo = escopoDeChat(idChat, canonKey)
        const p = String(pergunta || '').replace(/\s+/g, ' ').trim().slice(0, 400)
        const r = String(resposta || '').replace(/\s+/g, ' ').trim().slice(0, 400)
        if (escopo && (p || r)) {
            const idxRecente = d.interacoes.findIndex(
                (i) =>
                    i.pergunta === p &&
                    i.chat === escopo &&
                    Date.now() - Number(i.quando || 0) < 20000
            )
            if (idxRecente >= 0) {
                if (r && !d.interacoes[idxRecente].resposta) d.interacoes[idxRecente].resposta = r
            } else {
                d.interacoes.push({
                    quando: Date.now(),
                    chat: escopo,
                    pergunta: p,
                    resposta: r
                })
            }

            const cidade = extrairCidadePessoa(p)
            if (cidade) {
                if (!d.cidades || typeof d.cidades !== 'object') d.cidades = {}
                d.cidades[escopo] = cidade
            }
            for (const f of extrairFatosDeTexto(p, d.nome)) {
                incluirFato(d.fatos, f, escopo)
            }
        }

        const cortado = aplicarCorteMemoria(d, MAX_INTERACOES)
        d.fatos = cortado.fatos
        d.interacoes = cortado.interacoes
        await salvar(d, canonKey)

        const doEscopo = escopo ? d.interacoes.filter((i) => i.chat === escopo) : []
        if (doEscopo.length > 0 && doEscopo.length % 5 === 0) {
            setImmediate(() => destilarResumo(idUsuario, aliases, escopo).catch(() => {}))
        }
    } catch (err) {
        console.log(`[memoriaUsuario] ${err?.message || err}`)
    }
}

async function destilarResumo(idUsuario, aliases = [], escopo = '') {
    if (!escopo) return
    const { doc: d, canonKey } = await carregarFundido(idUsuario, aliases)
    const fatos = (d.fatos || [])
        .filter((f) => noEscopo(chatFato(f), escopo, canonKey))
        .map((f) => textoFato(f))
    const inter = (d.interacoes || []).filter((i) => noEscopo(i?.chat, escopo, canonKey))
    if (!inter.length && !fatos.length) return
    try {
        const api = (await import('./lbotApi.js')).default
        const material =
            `Nome: ${d.nome || '?'}\n` +
            `Cidade: ${d.cidades?.[escopo] || '?'}\n` +
            `Fatos: ${fatos.slice(-20).join(' | ')}\n` +
            `Últimas falas:\n` +
            inter
                .slice(-10)
                .map((i) => `- ${i.pergunta}`)
                .join('\n')
        const { resultado } = await api.IA.gerarTextoIA(
            `Com base neste material, escreva um resumo curto (4–8 frases) do que se sabe sobre esta pessoa, ` +
                `para um bot de WhatsApp manter contexto. Só fatos observados; sem inventar. ` +
                `Não apague cidade, trabalho, gostos nem relações já listados.\n\n${material}`,
            'Você só devolve o resumo em PT-BR, objetivo.',
            { temperature: 0.3, maxOutputTokens: 350, timeout: 25000 }
        )
        const resumo = String(resultado || '').trim().slice(0, 900)
        if (!resumo) return
        if (!d.resumos || typeof d.resumos !== 'object') d.resumos = {}
        d.resumos[escopo] = resumo
        await salvar(d, canonKey)
    } catch {
        /* ignore */
    }
}

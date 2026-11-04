/**
 * Memória por usuário — arquivo JSON em dados/memoria-usuarios/.
 * O Ultron usa isso no chat para contexto da pessoa.
 */
import fs from 'fs-extra'
import path from 'node:path'
import { caminhoDados } from './caminhos.js'
import { mencaoNumero } from './util.js'

const DIR = () => caminhoDados('memoria-usuarios')
const MAX_INTERACOES = 40
const MAX_FATOS = 40

function chaveArquivo(idUsuario) {
    const num = mencaoNumero(idUsuario) || String(idUsuario || 'x').replace(/[^a-zA-Z0-9._-]/g, '_')
    return path.join(DIR(), `${num}.json`)
}

async function ler(idUsuario) {
    try {
        const arq = chaveArquivo(idUsuario)
        if (!(await fs.pathExists(arq))) {
            return {
                id: idUsuario,
                nome: '',
                fatos: [],
                interacoes: [],
                resumo: '',
                atualizado_em: 0
            }
        }
        const raw = await fs.readJson(arq)
        return {
            id: raw.id || idUsuario,
            nome: raw.nome || '',
            fatos: Array.isArray(raw.fatos) ? raw.fatos : [],
            interacoes: Array.isArray(raw.interacoes) ? raw.interacoes : [],
            resumo: raw.resumo || '',
            atualizado_em: raw.atualizado_em || 0
        }
    } catch {
        return {
            id: idUsuario,
            nome: '',
            fatos: [],
            interacoes: [],
            resumo: '',
            atualizado_em: 0
        }
    }
}

async function salvar(dados) {
    await fs.ensureDir(DIR())
    const arq = chaveArquivo(dados.id)
    dados.atualizado_em = Date.now()
    await fs.writeJson(arq, dados, { spaces: 2 })
}

/** Texto pronto para injetar no system do chat. */
export async function obterMemoriaUsuarioTexto(idUsuario) {
    const d = await ler(idUsuario)
    const partes = []
    if (d.nome) partes.push(`Nome conhecido: ${d.nome}`)
    if (d.resumo) partes.push(`Resumo: ${d.resumo}`)
    if (d.fatos.length) {
        partes.push('Fatos:\n- ' + d.fatos.slice(-20).join('\n- '))
    }
    if (d.interacoes.length) {
        const ult = d.interacoes.slice(-6).map((i) => {
            const q = String(i.pergunta || '').slice(0, 120)
            const r = String(i.resposta || '').slice(0, 120)
            return `User: ${q}\nUltron: ${r}`
        })
        partes.push('Interações recentes:\n' + ult.join('\n---\n'))
    }
    return partes.join('\n\n').slice(0, 2500)
}

/**
 * Registra interação e extrai fatos simples; a cada 5 msgs tenta destilar resumo via IA.
 */
export async function registrarMemoriaUsuario({
    idUsuario,
    nome = '',
    idChat = '',
    pergunta = '',
    resposta = ''
}) {
    if (!idUsuario) return
    try {
        const d = await ler(idUsuario)
        if (nome) d.nome = String(nome).slice(0, 80)
        d.id = idUsuario

        const p = String(pergunta || '').replace(/\s+/g, ' ').trim().slice(0, 400)
        const r = String(resposta || '').replace(/\s+/g, ' ').trim().slice(0, 400)
        if (p || r) {
            d.interacoes.push({
                quando: Date.now(),
                chat: String(idChat || '').slice(0, 80),
                pergunta: p,
                resposta: r
            })
            if (d.interacoes.length > MAX_INTERACOES) {
                d.interacoes = d.interacoes.slice(-MAX_INTERACOES)
            }
        }

        // Heurística leve de fatos (sem gastar IA)
        const baixo = p.toLowerCase()
        const candidatos = []
        if (/\beu\s+(moro|trabalho|estudo|gosto|amo|odeio|sou|tenho)\b/.test(baixo)) {
            candidatos.push(p.slice(0, 160))
        }
        if (/\b(meu nome|me chamo|sou o|sou a)\b/.test(baixo) && nome) {
            candidatos.push(`Se apresenta como ${nome}`)
        }
        for (const f of candidatos) {
            if (f && !d.fatos.includes(f)) d.fatos.push(f)
        }
        if (d.fatos.length > MAX_FATOS) d.fatos = d.fatos.slice(-MAX_FATOS)

        await salvar(d)

        // Destila resumo a cada 5 interações (background)
        if (d.interacoes.length > 0 && d.interacoes.length % 5 === 0) {
            setImmediate(() => destilarResumo(idUsuario).catch(() => {}))
        }
    } catch (err) {
        console.log(`[memoriaUsuario] ${err?.message || err}`)
    }
}

async function destilarResumo(idUsuario) {
    const d = await ler(idUsuario)
    if (!d.interacoes.length && !d.fatos.length) return
    try {
        const api = (await import('./lbotApi.js')).default
        const material =
            `Nome: ${d.nome || '?'}\n` +
            `Fatos: ${d.fatos.slice(-15).join(' | ')}\n` +
            `Últimas falas:\n` +
            d.interacoes
                .slice(-10)
                .map((i) => `- ${i.pergunta}`)
                .join('\n')
        const { resultado } = await api.IA.gerarTextoIA(
            `Com base neste material, escreva um resumo curto (4–8 frases) do que se sabe sobre esta pessoa, ` +
                `para um bot de WhatsApp manter contexto. Só fatos observados; sem inventar.\n\n${material}`,
            'Você só devolve o resumo em PT-BR, objetivo.',
            { temperature: 0.3, maxOutputTokens: 350, timeout: 25000 }
        )
        const resumo = String(resultado || '').trim().slice(0, 900)
        if (!resumo) return
        d.resumo = resumo
        await salvar(d)
    } catch {
        /* ignore */
    }
}

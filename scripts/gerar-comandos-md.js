import fs from 'fs'
import { obterCatalogo } from '../bot/comandos/meta/registro.js'

const bot = { prefixo: '!', nome_bot: 'Ultron', nome_adm: 'Admin' }
const info = obterCatalogo(bot)

let md = `# Lista completa de comandos — Ultron

> **Manutenção obrigatória:** sempre que o projeto for atualizado (novos comandos, remoções ou mudanças de uso), atualize este arquivo.
> No WhatsApp: \`!comando guia\` mostra a ajuda embutida.

Prefixo padrão: \`!\` (configurável pelo dono).

`

const titulos = {
    utilidades: 'Utilidades',
    ia: 'IA / Geração',
    figurinhas: 'Figurinhas',
    diversao: 'Diversão',
    downloads: 'Downloads',
    grupo: 'Grupo',
    info: 'Info',
    admin: 'Admin (dono)'
}

const cats = Object.keys(info).filter((k) => k !== 'outros')
let total = 0

for (const cat of cats) {
    md += `## ${titulos[cat] || cat}\n\n`
    for (const [nome, meta] of Object.entries(info[cat] || {})) {
        total++
        md += `### \`!${nome}\`\n\n`
        if (meta.descricao) md += `**Descrição:** ${meta.descricao}\n\n`
        if (meta.guia) md += `**Como usar / exemplos:**\n\n${meta.guia}\n`
        if (meta.minimo) md += `**Restrição:** ${meta.minimo}\n\n`
        md += `---\n\n`
    }
}

md += `## Restrições gerais

- Parte dos comandos de *grupo* exige admin do grupo e/ou bot admin.
- Comandos de *admin* são exclusivos do dono do bot.
- APIs externas: configure \`.env\` (\`ELEVENLABS_API_KEY\`, \`GEMINI_API_KEY\`, \`OPENROUTER_API_KEY\`, \`RAPIDAPI_KEY\`, ACRCloud, Deepgram).
- Downloads do YouTube/Instagram: \`yt-dlp\` recomendado no PATH (ou \`YTDLP_PATH\`).
- \`!resumodogrupo\`: nota de voz de 3 a 5 min; análise + memória anti-repetição; na repetição, só msgs depois do último resumo; histórico ~7 dias.
- Bancos locais (≥2000 itens): \`conteudo/\` — veja docs/CONTEUDO.md
- \`!automsg\`: ligado por padrão; só admins ligam/desligam; interações humanas com intervalo longo.
- \`!verdadeoudesafio\` / \`!vod\`: níveis **4–5** são NSFW explícito — use com consentimento do grupo.
- \`!chat\`: memória + histórico do grupo + busca na web quando necessário (Gemini gratuito).

---

*Gerado a partir de \`bot/comandos/comandos.js\` — ${total} comandos.*
`

fs.writeFileSync(new URL('../docs/COMANDOS.md', import.meta.url), md)
console.log(`docs/COMANDOS.md atualizado (${total} comandos)`)

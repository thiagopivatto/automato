<p align="center">
<img src="https://img95.pixhost.to/images/1083/472612217_8876.jpg" width="280" height="280"/>
</p>

# Ultron

Bot brasileiro de WhatsApp — IA, figurinhas, downloads, administração de grupo e diversão.

Feito com [Baileys](https://github.com/WhiskeySockets/Baileys) (Node.js 20+).

---

## O que faz

| Área | Exemplos |
|------|----------|
| **IA** | `!chat`, menção ao bot, resumo do grupo, personalidade por chat |
| **Mídia** | Figurinhas, downloads (YouTube/Instagram etc.), TTS |
| **Grupo** | Anti-link, anti-flood, lista negra, boas-vindas, SHH, `!painel` |
| **Diversão** | Dramas, ofensa automática, sorteios |
| **Admin** | Limites, bloqueios, cotas de IA, painel do dono |

Lista completa: [docs/COMANDOS.md](docs/COMANDOS.md)

Changelog (pt-BR + EN): [CHANGELOG.md](CHANGELOG.md) — a cada commit o patch sobe sozinho (`npm run hooks:install` se o hook não estiver ativo).

---

## Requisitos

- Node.js **20+**
- Conta WhatsApp (QR no primeiro start)
- Chaves de API **opcionais** (sem elas a IA/TTS/downloads avançados ficam limitados)

---

## Instalação (rode no SSD local)

**Não rode o processo a partir de share UNC/NAS** (`\\servidor\...`). Clone ou copie o repo para disco local; use o NAS só como backup opcional.

```bash
git clone <seu-repo> automato
cd automato          # caminho local, ex.: C:\projetos\automato
cp .env.example .env # edite DONO, chaves e ULTRON_*_DIR
npm i
npm start
# Windows/UNC: powershell -NoProfile -File .\scripts\start.ps1
# ou: pm2 start ecosystem.config.cjs
```

Escaneie o QR no terminal. Sessão fica em `ULTRON_SESSAO_DIR` (default `sessao/`).

**Termux:** [docs/TERMUX.md](docs/TERMUX.md)

---

## Configuração (.env)

| Variável | Uso |
|----------|-----|
| `DONO` | **Obrigatório** — seu número com DDI (só dígitos) |
| `ULTRON_DATA_DIR` | Dados SQLite/arquivos (SSD, ex. `C:\ultron-data`) |
| `ULTRON_SESSAO_DIR` | Auth Baileys |
| `ULTRON_TEMP_DIR` | Temporários |
| `GEMINI_API_KEY` | IA principal |
| `OPENROUTER_API_KEY` | Backup de texto (free + pago) |
| `OPENROUTER_FREE_MODEL` | Modelo `:free` antes do crédito pago |
| `RAPIDAPI_KEY` | Rapid chat / Perplexity2 / Flux (APIs assinadas) |
| `TAVILY_API_KEY` | Pesquisa web no chat (recomendado) |
| `BRAVE_SEARCH_API_KEY` | Pesquisa web alternativa |
| `ELEVENLABS_API_KEY` | Voz premium **só dono** (resto = Edge) |
| `TTS_EDGE_VOICE` | Voz Edge (ex. `pt-BR-FranciscaNeural`) |
| `ELEVENLABS_VOICE_ID` | ID da voz ElevenLabs (Voice Library pt-BR) |
| `ULTRON_BACKUP_KEEP` | Quantos backups manter (default 7) |
| `dg_secret_key` | Transcrição (`!ouvir`) |
| `YTDLP_PATH` / `YTDLP_COOKIES` | Downloads |
| `FILA_CONCURRENCY` / `MAX_CHAT_QUEUES` | Escala (~centenas de grupos) |

Detalhes, cascade, TTS e Rapid: [docs/CHAVESAPI.md](docs/CHAVESAPI.md)

Cascade geral: **Gemini → OpenRouter free → Rapid → OpenRouter pago → Pollinations**.  
Chat: **Gemini → OpenRouter free → OpenRouter** + web (Tavily/Brave/DDG/Wiki), meta ≤3–4s.

Tiers de latência: A local ≤1s · B chat ≤3–4s · C pesado (ack + telemetria). Ver `npm run bench:tiers`.

Opcionais úteis:

```env
DONO=5511999999999
ULTRON_DATA_DIR=C:\ultron-data
ULTRON_SESSAO_DIR=C:\ultron-data\sessao
TAVILY_API_KEY=
TTS_EDGE_VOICE=pt-BR-AntonioNeural
IA_BUDGET_MS=7000
FILA_CONCURRENCY=12
MAX_CHAT_QUEUES=500
LOG_LEVEL=warn
ULTRON_SKIP_VENDOR_SYNC=1
```

---

## Uso

Prefixos: `! # . * - + / $ &`

| Comando | Função |
|---------|--------|
| `!menu` | Catálogo de comandos |
| `!comando guia` | Ajuda de qualquer comando |
| `!admin` | Painel do dono (1ª vez cadastra você) |
| `!chat` | Conversa com a IA |
| `!personalidade` | Tom do bot neste chat (chat/automsg) |
| `!personalidaderesumo` | Tom só do `!resumodogrupo` |
| `!painel` | Dump + toggles do grupo (admin) |
| `!criarimg` | Gera imagem (Pollinations / HF / Gemini / Horde / Rapid) |
| `!cotasia` | Status das APIs de IA |
| `!painelbot` / `!infobot` | Painel global + lista de grupos (dono) |

Cite uma mensagem do bot ou marque-o no grupo para falar com a IA sem comando.

---

## Deploy (SSD + PM2)

```bash
npm i
pm2 start ecosystem.config.cjs
# backup diário (sessão + sqlite + personalidades):
npm run backup
```

A API de IA é importada **direto do `vendor/`** (`bot/lib/lbotApi.js`). `npm run sync:vendor` fica só como fallback legado.

Health local (opcional): `http://127.0.0.1:3921/health`

---

## Scripts

```bash
npm start              # sobe o bot
npm run backup         # copia dados/sessão para ULTRON_BACKUP_DIR
npm run docs           # regenera docs de comandos
npm run test:smoke     # checagem rápida
npm run test:unidade   # testes sem WhatsApp
npm run bench:tiers    # classifica comandos A/B/C
npm run setup:tts      # venv Python + edge-tts (voz natural grátis)
```

---

## Estrutura

```
app.js                 # entrada / conexão WhatsApp
bot/                   # comandos, controles, libs, db/, serviços
vendor/                # API de IA e mídia (fonte única)
scripts/               # start, testes, docs, backup, patches, Termux
docs/                  # documentação
dados/                 # runtime (SQLite, personalidades) — não versionar
sessao/                # auth Baileys — não versionar
temp/                  # temporários — não versionar
ecosystem.config.cjs   # PM2
```

Não commite `.env` nem `sessao/`.

---

## Documentação

- [Comandos](docs/COMANDOS.md)
- [Chaves de API / TTS](docs/CHAVESAPI.md)
- [Testes](docs/PLANO_TESTES.md)
- [Termux](docs/TERMUX.md)

---

## Licença

MIT — Thiago Pivatto

# Tutorial para obter as chaves das APIs

## 0 - Resumo rápido (.env)

| Variável | Para quê | Grátis? |
|----------|----------|---------|
| `DONO` | Seu WhatsApp (DDI+número, só dígitos) — **obrigatório** | — |
| `GEMINI_API_KEY` | Chat, resumo e texto IA (principal) | Sim — https://aistudio.google.com/apikey |
| `OPENROUTER_API_KEY` | Backup de texto (pago + `:free`) | Crédito / free — https://openrouter.ai/keys |
| `OPENROUTER_FREE_MODEL` | Modelo `:free` usado antes do pago | Mesma key OpenRouter |
| `RAPIDAPI_KEY` | Chat Rapid, Perplexity2, Flux, etc. | Quota free — https://rapidapi.com |
| `TAVILY_API_KEY` | Pesquisa web no chat (`!chat` / `!pesquisa`) | Free tier — https://tavily.com |
| `BRAVE_SEARCH_API_KEY` | Pesquisa web alternativa | Plano Search — https://api.search.brave.com |
| `DEEPAI_API_KEY` | Fallback `!criarimg` (opcional) | Conta DeepAI |
| `ELEVENLABS_API_KEY` | TTS premium **só do dono** (`!voz` / `!resumodogrupo` / `!musica`) | Créditos pagos |
| `YTDLP_PATH` | Binário yt-dlp (opcional se no PATH) | Open-source |
| `YTDLP_COOKIES` | Arquivo cookies.txt (Instagram) | — |
| `COBALT_API_URL` | Instância própria Cobalt (downloads) | — |
| `acr_*` | `!qualmusica` | Conta gratuita limitada |
| `dg_secret_key` | `!ouvir` | Créditos iniciais Deepgram |

Aliases de dono: `DONO`, `DONO_JID` ou `NUMERO_DONO`. Sem `DONO` no `.env`, o boot avisa e você precisa cadastrar com `!admin` no PV.

### Ordem da IA de texto (cascade)

Geral: **Gemini → OpenRouter free → Rapid → OpenRouter pago → Pollinations**.

**Chat (`!chat` / menção / reply):** hot path **Gemini → OpenRouter `:free` → Pollinations** (sem crédito pago). Race web ~2.8s. Meta E2E ≤ **3–4s**.  
Para reativar pago no chat: `OPENROUTER_CHAT_PAGO=1`.

### Metas de latência (tiers)

| Tier | Exemplos | Meta |
|------|----------|------|
| A — local | `!menu`, `!painel`, `!status`, `!infobot`, toggles | ≤1s |
| B — chat | `!chat` / menção / reply | web + persona ≤3–4s |
| C — pesado | `!criarimg`, `!musica`, `!resumodogrupo`, downloads | ack rápido; sem meta 1s |

Bench dry-run: `node scripts/bench-comandos-meta.js`

- Respostas inválidas do Rapid (ex.: “Copilot moved…”) são **ignoradas** e o provedor entra em cooldown curto.
- OpenRouter **pago** só depois do `:free` / Gemini no chat.
- Ajuste com env:

```env
IA_PROVIDERS=gemini,openrouter-free,openrouter
IA_BUDGET_MS=7000
IA_GEMINI_MAX_MODELS=1
OPENROUTER_FREE_MODEL=meta-llama/llama-3.3-70b-instruct:free
FILA_CONCURRENCY=12
FILA_CHAT_CONCURRENCY=1
MAX_CHAT_QUEUES=500
```

Histórico de grupo **não** descreve imagem/áudio automaticamente (economiza cota). Para ligar:

```env
HISTORICO_AUTO_VISAO=1
HISTORICO_AUTO_STT=1
```

TTS: **Edge neural grátis para todos**; **ElevenLabs só quando o dono** dispara comando de áudio.  
Voz Edge: `TTS_EDGE_VOICE` (default `pt-BR-AntonioNeural`). ElevenLabs: `ELEVENLABS_VOICE_ID` + `ELEVENLABS_MODEL_ID`.

### Pesquisa web (`!chat` / `!pesquisa`)

No chat: **Tavily + Brave + DuckDuckGo + Wikipedia** em paralelo (race ~3s). Perplexity só em `!pesquisa`.

Prioridade prática: configure `TAVILY_API_KEY` (barato/estável).

### RapidAPI — obrigatórias vs opcionais

| API no Hub | Uso no bot | Precisa subscribe? |
|------------|------------|--------------------|
| ChatGPT-42 | Fallback texto na cascade geral | Só se quiser esse fallback |
| Perplexity2 | `!pesquisa` | Opcional se tiver Tavily/Brave |
| SimSimi7 | `!simi` | Só se usar o comando |
| Flux / rembg / PicsArt / StemSplit | Imagem / stems | Só se usar esses comandos |
| Grok Rapid / JSearch | Quase sem wiring | Pode ignorar |

Uma `RAPIDAPI_KEY` **não** assina todas as APIs — cada uma precisa de Subscribe no Hub.

---

## 1 - Dono (`DONO`)

No `.env`:

```env
DONO=5511999999999
```

Só dígitos com DDI. Sem número hardcoded no código: se faltar, o boot avisa.

## 2 - Google Gemini

1. https://aistudio.google.com/apikey → Create API key  
2. `GEMINI_API_KEY=...` no `.env`

## 3 - OpenRouter (backup)

1. https://openrouter.ai/keys
2. `OPENROUTER_API_KEY=sk-or-v1-...`
3. Pago (comandos/resumo): `OPENROUTER_MODEL=openai/gpt-4o-mini` — **evite** `openrouter/auto` (roteia para modelos caros)
4. Free no chat/cascade: `OPENROUTER_FREE_MODEL=meta-llama/llama-3.3-70b-instruct:free` (só IDs com `:free`)

## 4 - Pesquisa web (Tavily / Brave)

**Tavily (recomendado):**

1. https://app.tavily.com → API key  
2. `TAVILY_API_KEY=tvly-...`  
3. Opcional de teste: `TAVILY_KEYLESS=1` (rate-limit baixo)

**Brave Search:**

1. https://api.search.brave.com → plan + key  
2. `BRAVE_SEARCH_API_KEY=...`

## 5 - RapidAPI

1. Hub: https://rapidapi.com/developer/dashboard → X-RapidAPI-Key  
2. Assine **só** as APIs que for usar (tabela acima)  
3. `RAPIDAPI_KEY=...`  
4. Opcional dedicado: `PERPLEXITY_RAPIDAPI_KEY=...`

## 6 - Imagem (`!criarimg`)

Cascade: **Pollinations classic (sem chave) ∥ HF Flux → DeepAI → AI Horde → Gemini (Nano Banana) → Rapid Flux**.  
Opcional: `DEEPAI_API_KEY=...` · `AI_HORDE_API_KEY=...` (sem chave usa anônimo)

## 7 - TTS / voz (`!resumodogrupo`, `!voz`, `!cancelado`)

| Quem | Motor |
|------|--------|
| Dono do bot | ElevenLabs (se chave) → Edge → OpenAI Rapid |
| Demais usuários | **Só Edge** (grátis) |

`!musica` (Music API) também é **só dono**.

### Escolher voz pt-BR natural (ElevenLabs)

1. https://elevenlabs.io → Voice Library → filtro **Portuguese (Brazil)**
2. Ouça 2–3 vozes masculinas *conversational / narrative* (tom Ultron)
3. Copie o **Voice ID** → `.env`:

```env
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=cole_o_id_aqui
# Preferência: Multilingual v2 (natural). Tenta eleven_v4 primeiro se a API aceitar.
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
TTS_EDGE_VOICE=pt-BR-AntonioNeural
```

Sem Voice ID, cai no fallback técnico (Sarah). Lista Edge: `edge-tts --list-voices` após `npm run setup:tts`.

### Créditos ElevenLabs

1. https://elevenlabs.io → **Subscription** / **Add credits** (ou plano pago)
2. API usage consome caracteres; `!resumodogrupo` longo gasta bastante — por isso só o dono usa ElevenLabs
3. Confira saldo com `!cotasia`

## 7b - Disco / limpeza (manter o bot leve)

| Pasta | Cresce? | Ação |
|-------|---------|------|
| `node_modules/` / `vendor/` | Só no `npm i` | Não limpar em runtime |
| `dados/ultron.sqlite` + histórico | Sim (grupos) | TTL 7d automático; `!limpar` |
| `temp/` / tmp API | Sim (mídia) | Limpeza leve periódica + `!limpar` |
| `dados/*.bak` | Migração velha | Removido na limpeza leve |
| `ULTRON_BACKUP_DIR` | A cada `npm run backup` | Mantém últimas `ULTRON_BACKUP_KEEP=7` |

```env
# ULTRON_DATA_DIR=C:\ultron-data   # SSD, não NAS
# ULTRON_BACKUP_DIR=\\NAS\backup\ultron
# ULTRON_BACKUP_KEEP=7
# LIMPEZA_LEVE_MS=10800000
```

- `!limpar` — leve (temp, TTL, .bak); histórico útil preservado  
- `!limpar tudo` — wipe histórico/memória de resumo (só dono)

## 8 - yt-dlp (downloads)

```text
winget install yt-dlp
# ou: python -m pip install -U yt-dlp
```

```env
YTDLP_PATH=
# Preferir arquivo de cookies (Instagram). Evite YTDLP_BROWSER_COOKIES no Windows se o Chrome estiver aberto.
# YTDLP_COOKIES=C:\caminho\cookies.txt
```

## 9 - ACRCloud (`!qualmusica`)

https://console.acrcloud.com → `acr_host`, `acr_access_key`, `acr_access_secret`

## 10 - Deepgram (`!ouvir`)

https://console.deepgram.com → `dg_secret_key`

# Tutorial para obter as chaves das APIs

## 0 - Resumo rápido (.env)

| Variável | Para quê | Grátis? |
|----------|----------|---------|
| `GEMINI_API_KEY` | Chat, resumo e texto IA (principal) | Sim — https://aistudio.google.com/apikey |
| `OPENROUTER_API_KEY` | Backup de texto | Crédito / free tier — https://openrouter.ai/keys |
| `RAPIDAPI_KEY` | Simi, pesquisa, Flux, etc. | Quota free — https://rapidapi.com |
| `ELEVENLABS_API_KEY` | TTS (`!voz`, `!resumodogrupo`, dramas) | Plano free limitado |
| `YTDLP_PATH` | Binário yt-dlp (opcional se no PATH) | Open-source |
| `YTDLP_COOKIES` | Arquivo cookies.txt (Instagram) | — |
| `COBALT_API_URL` | Instância própria Cobalt (downloads) | — |
| `acr_*` | `!qualmusica` | Conta gratuita limitada |
| `dg_secret_key` | `!ouvir` | Créditos iniciais Deepgram |

Ordem da IA de texto: **Gemini → Rapid ChatGPT-42 → OpenRouter**.

TTS: **ElevenLabs → Edge (`pt-BR-AntonioNeural`)** — mesma lógica do `!resumodogrupo`.

---

## 1 - Google Gemini

1. https://aistudio.google.com/apikey → Create API key  
2. `GEMINI_API_KEY=...` no `.env`

## 2 - OpenRouter (backup)

1. https://openrouter.ai/keys  
2. `OPENROUTER_API_KEY=sk-or-v1-...`  
3. Opcional: `OPENROUTER_MODEL=openrouter/auto`

## 3 - RapidAPI

1. Hub: https://rapidapi.com/developer/dashboard → X-RapidAPI-Key  
2. Assine na mesma conta as APIs que for usar (SimSimi7, Perplexity2, Flux, etc.)  
3. `RAPIDAPI_KEY=...`

## 4 - ElevenLabs (voz)

1. https://elevenlabs.io → API key  
2. `ELEVENLABS_API_KEY=sk_...`  
Sem chave, o bot cai no Edge TTS automaticamente.

## 5 - yt-dlp (downloads)

```text
winget install yt-dlp
# ou: python -m pip install -U yt-dlp
```

```env
YTDLP_PATH=
# Preferir arquivo de cookies (Instagram). Evite YTDLP_BROWSER_COOKIES no Windows se o Chrome estiver aberto.
# YTDLP_COOKIES=C:\caminho\cookies.txt
```

## 6 - ACRCloud (`!qualmusica`)

https://console.acrcloud.com → `acr_host`, `acr_access_key`, `acr_access_secret`

## 7 - Deepgram (`!ouvir`)

https://console.deepgram.com → `dg_secret_key`

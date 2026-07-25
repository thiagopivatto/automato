# Tutorial para obter as chaves das API's

## 0 - Resumo rápido (.env)

| Variável | Para quê | Grátis? |
|----------|----------|---------|
| `GEMINI_API_KEY` | Chat e comandos de texto IA (principal) | Sim — https://aistudio.google.com/apikey |
| `OPENROUTER_API_KEY` | Backup de texto (modelos free) | Sim — https://openrouter.ai/keys |
| `RAPIDAPI_KEY` | `!simi` (SimSimi7) | Sim (quota free) — https://rapidapi.com/Glavier/api/simsimi7 |
| `YTDLP_PATH` | Caminho do yt-dlp (opcional se no PATH) | Sim — binário open-source |
| `acr_*` | `!qualmusica` | Conta gratuita limitada |
| `dg_secret_key` | `!ouvir` | Créditos iniciais Deepgram |
| `ELEVENLABS_API_KEY` | TTS / música / stems | Plano free limitado |
| `POLLINATIONS_API_KEY` | Imagem/vídeo | Sim |

Ordem da IA: **Gemini → OpenRouter → Pollinations**.

---

## 1 - Google Gemini (texto IA — principal)

1. Acesse https://aistudio.google.com/apikey
2. Clique em **Create API key**.
3. Cole no `.env`:

```env
GEMINI_API_KEY=sua_chave_aqui
```

---

## 2 - OpenRouter (texto IA — backup)

1. Acesse https://openrouter.ai/keys e crie uma chave.
2. Cole no `.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=google/gemma-3-27b-it:free
```

---

## 3 - SimSimi7 (RapidAPI)

1. Acesse https://rapidapi.com/Glavier/api/simsimi7
2. Clique em **Subscribe to Test** (plano Basic/free).
3. Copie o header **X-RapidAPI-Key**.
4. Cole no `.env`:

```env
RAPIDAPI_KEY=sua_chave_rapidapi
```

Endpoint: `GET https://simsimi7.p.rapidapi.com/v1/talk?message=...&language=pt`

---

## 4 - yt-dlp (YouTube: play / yt)

Windows: `winget install yt-dlp`

```env
YTDLP_PATH=
```

Teste: `yt-dlp --version`

---

## 5 - Pollinations (imagem — sem chave)

`criaimg` / `logo` — https://pollinations.ai

---

## 6 - ACRCloud (qualmusica)

Conta em https://console.acrcloud.com — copie host, access_key e access_secret para o `.env`.

## 7 - Deepgram (ouvir)

Conta em https://console.deepgram.com — cole a key em `dg_secret_key`.

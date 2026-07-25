<p align="center">
<img src="https://img95.pixhost.to/images/1083/472612217_8876.jpg" width="350" height="350"/>
</p>
<h1 align="center">🤖 Ultron / LBot — Robô para WhatsApp 🤖</h1>

<br>

## Requisitos
- Número no WhatsApp para ler o QR Code
- **Node.js LTS** e **Git** (Windows/Linux)
- **yt-dlp** no PATH (para `!play` / `!yt`) — veja [docs/CHAVESAPI.md](docs/CHAVESAPI.md)
- Opcional: chaves grátis **Gemini** e/ou **OpenRouter** para IA; **RAPIDAPI_KEY** para SimSimi

<br>

## 1 — Instalação (Windows/Linux)

Na pasta do projeto:

```bash
npm i
```

Termux: [docs/TERMUX.md](docs/TERMUX.md)

<br>

## 2 — Uso

```bash
npm start
```

Na primeira vez, escaneie o QR Code.

- `!menu` — menu principal  
- `!admin` — menu do dono (cadastre-se com `!admin` na 1ª vez)  
- `!comando guia` — ajuda de qualquer comando  

Prefixos aceitos: `! # . * - + / $ &`

<br>

## 3 — Configuração (.env)

Edite o arquivo `.env` na raiz. Exemplo:

```env
GEMINI_API_KEY=
OPENROUTER_API_KEY=
RAPIDAPI_KEY=
YTDLP_PATH=
acr_host=
acr_access_key=
acr_access_secret=
dg_secret_key=
```

### Como configurar cada chave (gratuitas)

Guia completo: **[docs/CHAVESAPI.md](docs/CHAVESAPI.md)**  
Plano de testes: **[docs/PLANO_TESTES.md](docs/PLANO_TESTES.md)**

#### Google Gemini (principal — texto IA)
1. https://aistudio.google.com/apikey → Create API key  
2. Cole em `GEMINI_API_KEY=`

#### OpenRouter (backup — modelos free)
1. https://openrouter.ai/keys → Create key  
2. Cole em `OPENROUTER_API_KEY=`

#### SimSimi (RapidAPI)
1. https://rapidapi.com/Glavier/api/simsimi7 → Subscribe (plano free)  
2. Copie **X-RapidAPI-Key** → `RAPIDAPI_KEY=`

#### yt-dlp (YouTube)
```bash
# Windows
winget install yt-dlp
```
Se o executável não estiver no PATH, use `YTDLP_PATH=C:\caminho\yt-dlp.exe`.

#### Pollinations (imagem)
Sem chave. Usado em `criaimg` e `logo`: https://pollinations.ai

#### ACRCloud / Deepgram
Para `qualmusica` e `ouvir` — passos com imagens em [docs/CHAVESAPI.md](docs/CHAVESAPI.md).

**Ordem da IA:** Gemini → OpenRouter → Pollinations (texto).

<br>

## 4 — Recursos / Comandos

Lista atualizada: **[docs/COMANDOS.md](docs/COMANDOS.md)**

### Figurinhas
`s`, `snome`, `simg`, `emojimix`

### Downloads
`play`, `yt` (yt-dlp), `fb`, `ig`, `tw`, `tk`, `img`

### Utilidades + IA
`chat`, `comofaz`, `curiosidade`, `playlist`, `explica`, `spoiler`, `cotacao`, `criaimg`, `logo`, `lofi`, `vocalsonly`, …

### Grupo
`mta` / `rt` (marcar todos anonimamente), `add`, `ban`, `restrito`, …

### Diversão
`simi` (com contexto), `casal`, `sortear`, `roletarussa`, …

<br>

## 5 — Contato / créditos originais
Projeto baseado no LBOT. Agradecimentos a Baileys e contribuidores.

* Discord: victorsouzaleal  
* Email: victorsouzaleal@gmail.com  

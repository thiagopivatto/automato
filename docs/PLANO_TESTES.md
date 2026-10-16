# Plano de testes

Bot online (`npm start`). Prefixo: `!`

## Antes

- [ ] `.env` configurado ([CHAVESAPI.md](CHAVESAPI.md))
- [ ] `yt-dlp --version`
- [ ] `npm test` (smoke local)

## Smoke manual

| # | Comando | Esperado |
|---|---------|----------|
| 1 | `!menu` | menus 0–5 |
| 2 | `!piada` | piada PT |
| 3 | `!curiosidade` | fato do banco local |
| 4 | `!vod 1` | verdade/desafio nível 1 |
| 5 | `!voz oi tudo bem` | nota de voz (opus) |
| 6 | `!resumodogrupo` | nota de voz 5–10 min, tom ácido; repetir só pega msgs novas; se a voz IA falhar, avisa e usa TTS grátis |
| 7 | `!automsg` | toggle (admin) |
| 8 | `!fofoca` | texto com menções |
| 9 | `!play` música curta | áudio |
| 10 | `!s` + foto | sticker |

## Automatizado

```bash
npm test
npm run docs:comandos
npm run gerar:conteudo
```

Bancos: [CONTEUDO.md](CONTEUDO.md)

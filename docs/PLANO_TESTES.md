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
| 3 | `!voz oi tudo bem` | nota de voz (opus) |
| 4 | `!resumodogrupo` | nota de voz; roast + memória; repetir só msgs novas |
| 5 | `!automsg` | toggle (admin) |
| 6 | `!fofoca` | texto com menções |
| 7 | `!play` música curta | áudio |
| 8 | `!s` + foto | sticker |
| 9 | `!chat` / @bot | conversa Ultron |
| 10 | `!personalidade ver` | personalidade do chat |

## Automatizado

```bash
npm test
```

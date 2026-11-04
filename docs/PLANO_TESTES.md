# Plano de testes

Bot online (`npm start`). Prefixo: `!`

## Antes

- [ ] `.env` configurado ([CHAVESAPI.md](CHAVESAPI.md))
- [ ] `yt-dlp --version`
- [ ] `npm test` (smoke local)

## Smoke manual

| # | Comando | Esperado |
|---|---------|----------|
| 1 | `!menu` | catálogo de comandos |
| 2 | `!voz oi tudo bem` | nota de voz (opus) |
| 3 | `!resumodogrupo` | nota de voz; roast + memória; repetir só msgs novas |
| 4 | `!automsg` | toggle (admin) |
| 5 | `!play` música curta | áudio |
| 6 | `!s` + foto | sticker |
| 7 | `!chat` / @bot | conversa Ultron (+ links se pesquisa web) |
| 8 | `!personalidade ver` | personalidade do chat |
| 9 | `!criarimg` gato | imagem |
| 10 | `!painel` | dump do grupo (admin) |

## Automatizado

```bash
npm run test:unidade
npm run test:smoke
npm run test:handlers
```

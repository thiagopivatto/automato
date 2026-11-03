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
| 6 | `!resumodogrupo` | nota de voz 3–5 min; roast + memória; repetir só msgs novas |
| 7 | `!automsg` | toggle (admin) |
| 8 | `!fofoca` | texto com menções |
| 9 | `!play` música curta | áudio |
| 10 | `!s` + foto | sticker |

## Automatizado

```bash
npm run sync:vendor   # após editar vendor/
npm test              # smoke + contrato meta↔handler↔menu
npm run docs          # regenera COMANDOS.md + LISTA_COMANDOS.txt
npm run gerar:conteudo
```

Comandos marcados no smoke (`OBRIGATORIOS` em `scripts/test-smoke.js`) são a suíte mínima; o restante fica no checklist manual acima.

Bancos: [CONTEUDO.md](CONTEUDO.md)

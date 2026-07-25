# Plano de testes dos comandos

Execute com o bot online (`npm start`) e anote PASS/FAIL. Prefixo padrão: `!`

## Pré-requisitos
- [ ] `.env` com `GEMINI_API_KEY` e/ou `OPENROUTER_API_KEY`
- [ ] `RAPIDAPI_KEY` (SimSimi7): https://rapidapi.com/Glavier/api/simsimi7
- [ ] `yt-dlp` no PATH (`yt-dlp --version`)
- [ ] Bot admin no grupo (para add/ban/restrito/roletarussa)

## 0 — Info
| Comando | Como testar | Esperado |
|---------|-------------|----------|
| `!menu` | no PV/grupo | menus 0–5 |
| `!info` | | dados do bot |
| `!meusdados` | | dados do usuário |
| `!comando guia` | ex: `!play guia` | texto de ajuda |

## 1 — Figurinhas
| Comando | Como testar | Esperado |
|---------|-------------|----------|
| `!s` | enviar foto + comando | sticker |
| `!s 1` | foto | sticker circular |
| `!emojimix` | `!emojimix 💩+😀` | sticker misturado |
| `!simg` | responder sticker estático | imagem |
| `!snome` | responder sticker `!snome pack, autor` | sticker renomeado |

## 2 — Utilidades / IA
| Comando | Como testar | Esperado |
|---------|-------------|----------|
| `!chat` | 2 msgs seguidas | responde + lembra contexto |
| `!curiosidade` | | texto em **português** |
| `!comofaz` | | tutorial WikiHow em **PT** |
| `!playlist` | `!playlist rock anos 80` | ≥20 músicas |
| `!explica` | `!explica o que é DNS` | explicação |
| `!spoiler` | `!spoiler Matrix` | spoiler |
| `!argumentos` | tema | pró/contra |
| `!proscons` | produto | lista |
| `!comparar` | `!comparar iPhone vs Android` | comparação |
| `!cotacao` | `!cotacao BTC` / `PETR4` | preço |
| `!simulado` | `!simulado história do Brasil` | 10 Q + gabarito |
| `!roteiro` | tema | roteiro |
| `!curriculo` | texto CV | versão melhorada |
| `!criaimg` | prompt | imagem |
| `!logo` | nome marca | 5 conceitos + imgs |
| `!criavideo` | prompt | vídeo ou erro claro |
| `!upscale` | responder imagem | imagem maior ou erro claro |
| `!animar` | responder imagem | vídeo ou erro claro |
| `!musica` | prompt | áudio ou erro claro |
| `!lofi` | responder áudio | áudio lofi |
| `!vocalsonly` | responder áudio | áudio |
| `!instrumentalonly` | responder áudio | áudio |
| `!animes` / `!mangas` | | lista |
| `!filmes` / `!series` | | tendências |
| `!traduz` | `!traduz en oi` | tradução |
| `!calc` | `!calc 2+2` | 4 |

## 3 — Downloads
| Comando | Como testar | Esperado |
|---------|-------------|----------|
| `!play` | `!play never gonna give you up` | áudio MP3 |
| `!yt` | `!yt me at the zoo` | vídeo MP4 |
| `!fb` | link público FB | vídeo |
| `!ig` | link público IG | midia |
| `!tw` | link X/Twitter | midia |
| `!tk` | link TikTok | vídeo |
| `!img` | `!img gatos` | até 5 imagens |

## 4 — Grupo (como ADM)
| Comando | Como testar | Esperado |
|---------|-------------|----------|
| `!mta` / `!rt` | com/sem texto | marca todos anonimamente |
| `!mt` | mensagem | marca com contagem |
| `!add` / `!ban` | | só se bot+user forem adm |
| `!restrito` | | abre/fecha grupo |
| `!link` | | link do grupo |

## 5 — Diversão
| Comando | Como testar | Esperado |
|---------|-------------|----------|
| `!simi` | `!simi oi tudo bem` | resposta (RapidAPI) |
| `!ppt` | `!ppt pedra` | resultado |
| `!caracoroa` | | cara/coroa |
| `!casal` / `!sortear` | no grupo | menções |
| `!roletarussa` | só adm + bot adm | remove aleatório |

## Checklist de regressão rápida (smoke)
1. `!emojimix 😂+❤️`
2. `!play música curta`
3. `!chat oi` → `!chat qual foi minha última mensagem?`
4. `!curiosidade` + `!comofaz`
5. `!simi oi`
6. `!rt teste` no grupo

## Testes automatizados locais (sem WhatsApp)
```bash
node scripts/smoke-apis.js
```

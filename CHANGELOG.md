# Changelog

**Versão atual / Current version:** `1.1.1`

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/).  
A cada `git commit`, o hook `pre-commit` sobe o **patch** em `package.json` (ex.: `1.1.0` → `1.1.1`) e atualiza esta linha.  
Pule o bump: `SKIP_VERSION_BUMP=1 git commit ...`

---

## [Unreleased]

_Alterações ainda não agrupadas em nota de release / Changes not yet folded into a release note._

---

## [1.1.0] — 2026-11-04

### Português (pt-BR)

#### Chat e IA
- Cascade do chat: Gemini → OpenRouter `:free` → Pollinations (pago só com `OPENROUTER_CHAT_PAGO=1`)
- Corte de tokens: histórico curto, caps de persona/memória/web, `max_tokens` limitado no OpenRouter
- Removido `openrouter/auto` da lista free (evita gasto acidental de crédito)
- Pesquisa web **first-hit** (não espera todas as fontes); papo casual não força web só por `?`
- Latência: timeout por provedor sem piso de 4s no hot path; 1 modelo free por tentativa; Pollinations com timeout
- Personalidade Ultron padrão no chat; memória de usuário e personalidade por chat

#### Resumo do grupo (`!resumodogrupo`)
- Roteiro por **assuntos/opinião** (tom ácido/brutal), não monólogo “fulano falou…”
- Fallback local no mesmo estilo temático
- Busca de fatos em tempo real nos temas e bloco `[FATOS EM TEMPO REAL]`
- Personalidade só do resumo via `!personalidaderesumo`

#### TTS e voz
- ElevenLabs **somente para o dono**; demais usuários usam Edge TTS
- Documentação de créditos e vozes em `docs/CHAVESAPI.md`

#### Imagens e mídia
- Cascade de imagens revisitada (Pollinations / HF / alternativas) após limites de crédito Rapid/Gemini

#### Armazenamento e limpeza
- Limpeza leve periódica, `!limpar` em camadas, rotação de backup
- Migração/uso SQLite e scripts de backup de dados

#### Infra e DX
- Fila de comandos por chat, dedup de mensagens, health/boot
- Testes de unidade (cascade, web, resumo, identidade, fila)
- Hooks de git para bump automático de versão + este changelog bilíngue

---

### English

#### Chat & AI
- Chat cascade: Gemini → OpenRouter `:free` → Pollinations (paid only with `OPENROUTER_CHAT_PAGO=1`)
- Token thrift: shorter history, persona/memory/web caps, OpenRouter `max_tokens` capped
- Dropped `openrouter/auto` from the free list (avoids accidental paid spend)
- Web search **first-hit** race; casual chat no longer forces web on bare `?`
- Latency: no 4s per-provider floor on the hot path; one free model per try; Pollinations respects timeout
- Default Ultron persona; per-chat personality and user memory

#### Group summary (`!resumodogrupo`)
- Thematic **opinionated** script (acid/brutal tone), not a “who said what” monologue
- Local fallback matches the same style
- Realtime fact lookup for topics + `[FATOS EM TEMPO REAL]` block
- Summary-only persona via `!personalidaderesumo`

#### TTS & voice
- ElevenLabs **owner-only**; everyone else uses Edge TTS
- Credits/voice docs in `docs/CHAVESAPI.md`

#### Images & media
- Image cascade refreshed after Rapid/Gemini credit limits

#### Storage & cleanup
- Periodic light cleanup, layered `!limpar`, backup rotation
- SQLite path and data backup scripts

#### Infra & DX
- Per-chat command queue, message dedup, health/boot
- Unit tests (cascade, web, summary, identity, queue)
- Git hooks for automatic version bump + this bilingual changelog

---

## [1.0.0] — baseline

### Português (pt-BR)
- Lançamento Ultron: Baileys, comandos de utilidades/IA/grupo/diversão/admin, vendor `lbot-api-comandos`.

### English
- Initial Ultron release: Baileys, util/IA/group/fun/admin commands, `lbot-api-comandos` vendor.

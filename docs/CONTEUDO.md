# Conteúdo do Ultron

Bancos locais em `conteudo/` (JSON). Cada arquivo tem **≥ 2000 itens**.

| Arquivo | Uso |
|---------|-----|
| `piadas.json` | `!piada` / AutoMsg |
| `verdade_ou_desafio.json` | `!verdadeoudesafio` / `!vod` (níveis 1–5) |
| `trocadilhos.json` | AutoMsg |
| `audios_malignos.json` | AutoMsg (nota de voz “maligna”) |
| `isso_ou_aquilo.json` | AutoMsg |
| `curiosidades.json` | `!curiosidade` / AutoMsg |
| `frases_soltas.json` | AutoMsg |

## Regenerar

```bash
npm run gerar:conteudo
```

O loader fica em `bot/lib/conteudo.js`. Comandos e AutoMsg leem esses JSONs (com anti-repetição por chat).

## Estrutura VoD

```json
{
  "verdade": { "1": [...], "2": [...], "3": [...], "4": [...], "5": [...] },
  "desafio": { "1": [...], "2": [...], "3": [...], "4": [...], "5": [...] }
}
```

Níveis **4–5** são NSFW — use com consentimento do grupo.

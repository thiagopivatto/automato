<p align="center">
<img src="https://img95.pixhost.to/images/1083/472612217_8876.jpg" width="280" height="280"/>
</p>

# Ultron

Bot de WhatsApp em português — figurinhas, downloads, utilidades, IA e diversão.

## Requisitos

- Node.js LTS + WhatsApp para o QR
- Chaves opcionais no `.env` — veja [docs/CHAVESAPI.md](docs/CHAVESAPI.md)

## Instalação

```bash
npm i
npm start
```

Termux: [docs/TERMUX.md](docs/TERMUX.md)

## Uso rápido

| Comando | Função |
|---------|--------|
| `!menu` | Menus |
| `!comando guia` | Ajuda de qualquer comando |
| `!admin` | Painel do dono (1ª vez cadastra você) |

Prefixos: `! # . * - + / $ &`

## Conteúdo local

Bancos JSON (≥2000 itens cada) em `conteudo/`:

- Piadas · Trocadilhos · Curiosidades · Frases · Isso ou aquilo · Áudios malignos · Verdade ou desafio

Regenerar: `npm run gerar:conteudo`

## Documentação

- [Lista de comandos](docs/COMANDOS.md)
- [Chaves de API](docs/CHAVESAPI.md)
- [Testes](docs/PLANO_TESTES.md)
- [Conteúdo / dados](docs/CONTEUDO.md)

## Licença

MIT

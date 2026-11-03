<p align="center">
<img src="https://img95.pixhost.to/images/1083/472612217_8876.jpg" width="280" height="280"/>
</p>

# Ultron

Bot de WhatsApp em português — figurinhas, downloads, utilidades, IA e diversão.

## Requisitos

- Node.js 20+ + WhatsApp para o QR
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

## Publicar no status do grupo

Responda uma mensagem de texto ou imagem com `!statusgrupo`. O bot publica o conteúdo respondido no status daquele grupo. Use `!statusgrupo guia` para ajuda.

O texto e a legenda original da imagem são preservados. O comando segue os bloqueios de comandos, limites e permissões do bot. Outros tipos de mídia ainda não são aceitos. A disponibilidade do status depende do WhatsApp e do grupo; a aparência final precisa ser conferida no aplicativo.

Este recurso usa os campos de protocolo do Baileys **7.0.0-rc14**, fixado nas dependências. Ao atualizar uma instalação existente, execute `npm install` e reinicie o bot. É uma versão prévia: valide também conexão, comandos e eventos de participantes na conta utilizada.

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

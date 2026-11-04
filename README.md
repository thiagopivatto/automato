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

Se falhar, a resposta identifica a etapa: `SG_DOWNLOAD` (obter a imagem original), `SG_UPLOAD` (preparar/enviar a imagem) ou `SG_ENVIO` (enviar o status ao grupo). O erro técnico fica no terminal, marcado como `STATUS GRUPO`. Citações sem os dados da imagem original precisam ser reenviadas antes de executar o comando.

Na instalação, um patch local corrige a identificação de mídia dentro do pacote de status do Baileys 7.0.0-rc14. Se instalar com `--ignore-scripts`, execute `npm run patch:statusgrupo` antes de iniciar o bot. Ao atualizar o Baileys, revise esse patch.

Teste local: `npm run test:statusgrupo` (Node.js 22.3+ para o teste de relay com módulos simulados). A suíte cobre download, criptografia e preparo de uma imagem local, além do envelope produzido pelo relay real do Baileys. O transporte remoto é simulado. Isso não confirma a aceitação do status pelo WhatsApp, que exige validação com conta conectada.

## Conteúdo local

Bancos JSON (≥2000 itens cada) em `conteudo/`:

- Banco local de piadas (`!piada`)

Regenerar: `npm run gerar:conteudo`

## Documentação

- [Lista de comandos](docs/COMANDOS.md)
- [Chaves de API](docs/CHAVESAPI.md)
- [Testes](docs/PLANO_TESTES.md)
- [Conteúdo / dados](docs/CONTEUDO.md)

## Licença

MIT

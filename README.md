# Servidor HTTP de arquivos JSON

## Executar localmente com Wrangler

```bash
npx wrangler dev
```

Abra o endereço informado pelo Wrangler. Os arquivos são publicados como assets estáticos a partir da pasta `data/`.

- `GET /` lista os arquivos JSON disponíveis.
- `GET /api/plugins` retorna a lista de plugins em JSON.
- `GET /api/themes` retorna a lista de themes em JSON.
- `GET /api/themes/wpgmcombr.json` exibe o conteúdo do arquivo do tema.

Para publicar:

```bash
npx wrangler deploy
```

Para adicionar um arquivo, coloque-o em `data/plugins/` ou `data/themes/` e atualize a lista correspondente em `data/index.json`.

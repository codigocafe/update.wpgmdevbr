# Servidor HTTP de arquivos JSON

## Executar

```bash
npm start
```

Abra [http://localhost:3000](http://localhost:3000). Os arquivos são lidos recursivamente da pasta `data/`, incluindo `data/plugins/` e `data/themes/`.

- `GET /` lista os arquivos JSON disponíveis.
- `GET /api/plugins` retorna a lista de plugins em JSON.
- `GET /api/themes` retorna a lista de themes em JSON.
- `GET /api/themes/wpgmcombr.json` exibe o conteúdo do arquivo do tema.

Para usar outra porta ou pasta:

```bash
PORT=8080 JSON_DIR=/caminho/para/json npm start
```

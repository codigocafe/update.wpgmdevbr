const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.env.JSON_DIR || path.join(__dirname, 'data'));
const API_CATEGORIES = new Set(['plugins', 'themes']);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendHtml(response, statusCode, html) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
  });
  response.end(html);
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function getJsonFiles(directory = DATA_DIR, relativeDirectory = '') {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await getJsonFiles(absolutePath, relativePath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      files.push(relativePath.split(path.sep).join('/'));
    }
  }

  return files.sort();
}

async function readJsonFile(relativeFileName, baseDirectory = DATA_DIR) {
  const fileName = relativeFileName.split('/').join(path.sep);
  if (!fileName.toLowerCase().endsWith('.json')) {
    const error = new Error('Only .json files are supported');
    error.statusCode = 400;
    throw error;
  }

  const filePath = path.resolve(baseDirectory, fileName);
  if (filePath !== baseDirectory && !filePath.startsWith(`${baseDirectory}${path.sep}`)) {
    const error = new Error('Invalid file path');
    error.statusCode = 400;
    throw error;
  }

  const contents = await fs.readFile(filePath, 'utf8');
  return JSON.parse(contents);
}

async function handleRequest(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return sendJson(response, 405, { error: 'Method not allowed' });
  }

  const apiMatch = requestUrl.pathname.match(/^\/api\/([^/]+)(?:\/(.*))?$/);
  if (apiMatch && API_CATEGORIES.has(apiMatch[1])) {
    const category = apiMatch[1];
    const categoryDirectory = path.join(DATA_DIR, category);
    const fileName = apiMatch[2] ? decodeURIComponent(apiMatch[2]) : null;

    if (!fileName) {
      return sendJson(response, 200, { files: await getJsonFiles(categoryDirectory) });
    }

    try {
      return sendJson(response, 200, await readJsonFile(fileName, categoryDirectory));
    } catch (error) {
      const statusCode = error.code === 'ENOENT' ? 404 : error.statusCode || 422;
      return sendJson(response, statusCode, { error: statusCode === 404 ? 'File not found' : error.message });
    }
  }

  if (requestUrl.pathname === '/') {
    const files = await getJsonFiles();
    const groups = files.reduce((result, file) => {
      const parts = file.split('/');
      const group = parts.length > 1 ? parts[0] : 'raiz';
      (result[group] ||= []).push(file);
      return result;
    }, {});
    const groupLabels = { plugins: 'Plugins', themes: 'Themes', raiz: 'Arquivos JSON' };
    const links = files.length
      ? Object.entries(groups).map(([group, groupFiles]) => `
        <section>
          <h2>${escapeHtml(groupLabels[group] || group)}</h2>
          <ul>${groupFiles.map((file) => {
            const fileParts = file.split('/');
            const category = fileParts.shift();
            const href = API_CATEGORIES.has(category)
              ? `/api/${category}/${fileParts.map(encodeURIComponent).join('/')}`
              : '#';
            return `<li><a href="${href}">${escapeHtml(file)}</a></li>`;
          }).join('')}</ul>
        </section>`).join('')
      : '<li>Nenhum arquivo .json encontrado.</li>';
    return sendHtml(response, 200, `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="utf-8"><title>Arquivos JSON</title></head>
  <body>
    <h1>Arquivos JSON</h1>
    ${links}
  </body>
</html>`);
  }

  return sendJson(response, 404, { error: 'Route not found' });
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error(error);
    sendJson(response, 500, { error: 'Internal server error' });
  });
});

fs.mkdir(DATA_DIR, { recursive: true })
  .then(() => server.listen(PORT, () => {
    console.log(`Servidor disponível em http://localhost:${PORT}`);
    console.log(`Lendo arquivos JSON de ${DATA_DIR}`);
  }))
  .catch((error) => {
    console.error('Não foi possível preparar a pasta de arquivos JSON:', error);
    process.exitCode = 1;
  });

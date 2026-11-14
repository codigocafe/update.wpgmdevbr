function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}

function htmlResponse(html) {
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function isSafeFileName(fileName) {
  return Boolean(fileName) && fileName.toLowerCase().endsWith('.json') && !fileName.startsWith('/') && !fileName.split('/').includes('..');
}

async function readAsset(env, request, assetPath) {
  if (!env.ASSETS) throw new Error('The ASSETS binding is not configured');
  const assetUrl = new URL(request.url);
  assetUrl.pathname = `/${assetPath}`;
  return env.ASSETS.fetch(new Request(assetUrl, request));
}

async function getManifest(env, request) {
  const response = await readAsset(env, request, 'index.json');
  if (!response.ok) throw new Error('data/index.json was not found');
  const manifest = await response.json();
  return {
    plugins: Array.isArray(manifest.plugins) ? manifest.plugins : [],
    themes: Array.isArray(manifest.themes) ? manifest.themes : [],
  };
}

function renderIndex(manifest) {
  const sections = Object.entries(manifest).map(([category, files]) => {
    const items = files.length
      ? files.map((file) => {
        const encodedFile = file.split('/').map(encodeURIComponent).join('/');
        return `<li><a href="/api/${category}/${encodedFile}">${escapeHtml(file)}</a></li>`;
      }).join('')
      : '<li>Nenhum arquivo encontrado.</li>';
    return `<section><h2>${category[0].toUpperCase()}${category.slice(1)}</h2><ul>${items}</ul></section>`;
  }).join('');

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Plugins e Themes</title></head><body><h1>Plugins e Themes</h1>${sections}</body></html>`;
}

export default {
  async fetch(request, env) {
    if (request.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405);
    const requestUrl = new URL(request.url);

    try {
      const apiMatch = requestUrl.pathname.match(/^\/api\/(plugins|themes)(?:\/(.*))?$/);
      if (apiMatch) {
        const category = apiMatch[1];
        const fileName = apiMatch[2] ? decodeURIComponent(apiMatch[2]) : null;
        const manifest = await getManifest(env, request);
        if (!fileName) return jsonResponse({ files: manifest[category] });
        if (!isSafeFileName(fileName) || !manifest[category].includes(fileName)) return jsonResponse({ error: 'File not found' }, 404);

        const assetResponse = await readAsset(env, request, `${category}/${fileName}`);
        if (!assetResponse.ok) return jsonResponse({ error: 'File not found' }, 404);
        return new Response(await assetResponse.text(), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
      }

      if (requestUrl.pathname === '/') return htmlResponse(renderIndex(await getManifest(env, request)));
      return jsonResponse({ error: 'Route not found' }, 404);
    } catch (error) {
      console.error(error);
      return jsonResponse({ error: 'Internal server error' }, 500);
    }
  },
};

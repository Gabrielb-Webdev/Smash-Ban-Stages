/**
 * Servidor local minimalista para el Scoreboard de Santa Fe.
 * Escribe/lee ScoreboardInfo.json en disco.
 * Uso: node scoreboard-server.js
 * Sin dependencias externas — solo Node.js built-ins.
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT      = 3000;
const JSON_PATH = path.join(__dirname, 'public', 'overlays', 'Santa-fe', 'Resources', 'Texts', 'ScoreboardInfo.json');

const ALLOWED_KEYS = [
  'p1Name', 'p1Team', 'p1Pron', 'p1Score', 'p1NScore',
  'p1Character', 'p1Skin', 'p1Color', 'p1WL',
  'p2Name', 'p2Team', 'p2Pron', 'p2Score', 'p2NScore',
  'p2Character', 'p2Skin', 'p2Color', 'p2WL',
  'bestOf', 'round', 'format',
  'caster1Name', 'caster1Twitter', 'caster1Twitch',
  'caster2Name', 'caster2Twitter', 'caster2Twitch',
  'tournamentName', 'allowIntro',
];

const server = http.createServer((req, res) => {
  // CORS — permite peticiones desde cualquier origen (Live Server, etc.)
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url !== '/api/scoreboard-update') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  // ── GET: devuelve el JSON actual ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const data = fs.readFileSync(JSON_PATH, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No se pudo leer el archivo' }));
    }
    return;
  }

  // ── POST: recibe datos del panel y escribe el JSON ────────────────────────
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const raw  = JSON.parse(body);
        const safe = {};
        for (const key of ALLOWED_KEYS) {
          if (key in raw) safe[key] = raw[key];
        }
        fs.writeFileSync(JSON_PATH, JSON.stringify(safe, null, 2), 'utf-8');
        console.log(`[${new Date().toLocaleTimeString()}] ✔ Scoreboard actualizado`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method not allowed');
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ✅  Servidor Scoreboard corriendo');
  console.log(`  🌐  http://localhost:${PORT}/api/scoreboard-update`);
  console.log(`  📄  JSON: ${JSON_PATH}`);
  console.log('');
  console.log('  Dejá esta ventana abierta mientras usás el panel de control.');
  console.log('  Cerrá la ventana para detener el servidor.');
  console.log('');
});

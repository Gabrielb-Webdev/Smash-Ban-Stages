const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
let clients = [];
let currentData = {
  player1: { tag: '', name: 'Player 1', score: 0, character: 'Mario', skin: 1 },
  player2: { tag: '', name: 'Player 2', score: 0, character: 'Mario', skin: 1 },
  round: 'Winners Finals'
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // SSE endpoint for overlay
  if (req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write(`data: ${JSON.stringify(currentData)}\n\n`);
    clients.push(res);
    req.on('close', () => {
      clients = clients.filter(c => c !== res);
    });
    return;
  }

  // Update endpoint from control panel
  if (req.method === 'POST' && req.url === '/update') {
    let body = '';
    req.on('data', chunk => {
      if (body.length > 1e6) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => {
      try {
        currentData = JSON.parse(body);
        clients.forEach(client => {
          client.write(`data: ${JSON.stringify(currentData)}\n\n`);
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
    return;
  }

  // Get current state
  if (req.url === '/state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(currentData));
  }

  // Static file serving
  let filePath;
  if (req.url === '/' || req.url === '/control') {
    filePath = path.join(__dirname, 'control.html');
  } else if (req.url === '/overlay') {
    filePath = path.join(__dirname, 'overlay.html');
  } else {
    filePath = path.join(__dirname, decodeURIComponent(req.url.split('?')[0]));
  }

  // Prevent path traversal
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(__dirname))) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(resolved, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('  SMASH SCOREBOARD SERVER');
  console.log('='.repeat(50));
  console.log(`  Control Panel : http://localhost:${PORT}/`);
  console.log(`  Overlay (OBS) : http://localhost:${PORT}/overlay`);
  console.log('='.repeat(50));
});

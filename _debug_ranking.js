const fs = require('fs');
let c = fs.readFileSync('pages/home.js', 'utf8');

// Encontrar el comentario de TORNEOS
const torneosComment = 'TAB \u2014 TORNEOS';
const torneosIdx = c.indexOf(torneosComment);
console.log('TORNEOS comment at idx:', torneosIdx);

// Mostrar 300 chars ANTES del comment (final de TabRankings)
const beforeTorneos = c.substring(torneosIdx - 300, torneosIdx + 10);
console.log('\nAntes del comentario TORNEOS:');
console.log(JSON.stringify(beforeTorneos));

// Ver si el content div está abierto (sin cerrar)
const rankIdx = c.indexOf('function TabRankings(');
const endRank = torneosIdx;
const rankBody = c.substring(rankIdx, endRank);

// Contar divs abiertos/cerrados en TabRankings
const opens = (rankBody.match(/<div/g) || []).length;
const closes = (rankBody.match(/<\/div>/g) || []).length;
console.log('\nEn TabRankings: opens=' + opens + ' closes=' + closes + ' diff=' + (opens - closes));

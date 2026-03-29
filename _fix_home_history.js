const fs = require('fs');
let content = fs.readFileSync('pages/home.js', 'utf8');

const patches = [
  {
    from: "width: 64, flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '8px 4px 8px 8px'",
    to:   "width: 100, flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '8px 4px 8px 8px'"
  },
  {
    from: "style={{ width: 32, height: 32, objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }}",
    to:   "style={{ width: 50, height: 50, objectFit: 'contain' }} onError={e => { e.target.src = '/images/characters/placeholder.png'; }}"
  },
  {
    from: "width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: is2v2 ? 18 : 16",
    to:   "width: 50, height: 50, borderRadius: 10, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: is2v2 ? 24 : 20"
  },
  {
    from: "padding: '9px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, minWidth: 0",
    to:   "padding: '9px 5px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, minWidth: 0"
  }
];

patches.forEach((p, i) => {
  const count = content.split(p.from).length - 1;
  console.log(`Patron ${i+1}: ${count} ocurrencias`);
  content = content.replaceAll(p.from, p.to);
});

fs.writeFileSync('pages/home.js', content, 'utf8');
console.log('home.js actualizado OK');

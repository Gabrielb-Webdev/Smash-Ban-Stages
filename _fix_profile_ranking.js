const fs = require('fs');
let c = fs.readFileSync('pages/home.js', 'utf8');
const before = c.length;

// ============================================================
// FIX 1: Hero banner en modales de perfil - usar alt skin del jugador
// Hay 3 instancias con 2 niveles de indentación distintos.
// ============================================================

// Patrón base del cálculo actual (varía solo la indentación)
// Instancia 1 y 3: 16 espacios de indent para el IIFE de heroCharId
// Instancia 2: 18 espacios de indent

function fixHeroBanner(content, indent) {
  const sp  = ' '.repeat(indent);     // nivel del IIFE
  const sp2 = ' '.repeat(indent + 2); // nivel del body
  const sp4 = ' '.repeat(indent + 4); // nivel doble anidado

  const oldBlock = `${sp}const heroCharId = (() => {
${sp2}const hist = profileData.history || [];
${sp2}if (hist.length) {
${sp4}const counts = {};
${sp4}for (const m of hist) {
${' '.repeat(indent + 6)}const cid = String(m.winnerId) === String(viewProfile.userId) ? m.winnerCharId : m.loserCharId;
${' '.repeat(indent + 6)}if (cid) counts[cid] = (counts[cid] || 0) + 1;
${sp4}}
${sp4}let best = null, max = 0;
${sp4}for (const [id, c] of Object.entries(counts)) { if (c > max) { max = c; best = id; } }
${sp4}return best;
${sp2}}
${sp2}return profileData.recentChars?.[0] || null;
${sp}})();
${sp}const heroRenderFile = heroCharId ? CHARACTER_RENDERS[heroCharId] : null;
${sp}return (
${sp2}<div style={{ position: 'relative', background: '#1a1a1a', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 10 }}>
${sp4}{heroRenderFile ? (
${' '.repeat(indent + 6)}<img src={charRenderPath(heroRenderFile)} alt="" style={{ display: 'block', height: 180, objectFit: 'contain', position: 'relative', zIndex: 1 }} onError={e => { e.target.style.display = 'none'; }} />
${sp4}) : (
${' '.repeat(indent + 6)}<div style={{ height: 100 }} />
${sp4})}`;

  const newBlock = `${sp}const heroCharSrc = (() => {
${sp2}if (profileData.profile?.mainCharAlt) return profileData.profile.mainCharAlt;
${sp2}const mc = profileData.profile?.mainChar;
${sp2}if (mc && CHARACTER_RENDERS[mc]) return charRenderPath(CHARACTER_RENDERS[mc]);
${sp2}const hist = profileData.history || [];
${sp2}if (hist.length) {
${sp4}const counts = {};
${sp4}for (const m of hist) {
${' '.repeat(indent + 6)}const cid = String(m.winnerId) === String(viewProfile.userId) ? m.winnerCharId : m.loserCharId;
${' '.repeat(indent + 6)}if (cid) counts[cid] = (counts[cid] || 0) + 1;
${sp4}}
${sp4}let best = null, max = 0;
${sp4}for (const [id, c] of Object.entries(counts)) { if (c > max) { max = c; best = id; } }
${sp4}if (best && CHARACTER_RENDERS[best]) return charRenderPath(CHARACTER_RENDERS[best]);
${sp2}}
${sp2}const rc = profileData.recentChars?.[0];
${sp2}if (rc && CHARACTER_RENDERS[rc]) return charRenderPath(CHARACTER_RENDERS[rc]);
${sp2}return null;
${sp}})();
${sp}return (
${sp2}<div style={{ position: 'relative', background: '#1a1a1a', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 10 }}>
${sp4}{heroCharSrc ? (
${' '.repeat(indent + 6)}<img src={heroCharSrc} alt="" style={{ display: 'block', height: 180, objectFit: 'contain', position: 'relative', zIndex: 1 }} onError={e => { e.target.style.display = 'none'; }} />
${sp4}) : (
${' '.repeat(indent + 6)}<div style={{ height: 100 }} />
${sp4})}`;

  const count = content.split(oldBlock).length - 1;
  console.log(`  indent=${indent}: ${count} ocurrencia(s)`);
  return content.replaceAll(oldBlock, newBlock);
}

console.log('FIX 1: Hero banner con alt skin del jugador');
c = fixHeroBanner(c, 16);  // instancias 1 y 3
c = fixHeroBanner(c, 18);  // instancia 2

// ============================================================
// FIX 2: Sticky header en TabRankings
// Envolvemos título + pills en un div sticky, y el resto en un
// div de contenido. El sub-selector de plataforma se mueve
// también al header sticky.
// ============================================================
console.log('FIX 2: Sticky header en ranking');

// Step 2a: Reemplazar el div exterior + inicio del sticky header
const old2a = `  return (
    <div style={{ padding: '24px 18px' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>Rankings</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Clasificaciones de la comunidad</p>

      {/* Pill switcher */}
      <div className="pill-switcher" style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 4, display: 'flex', gap: 4, marginBottom: 22, flexWrap: 'wrap' }}>`;

const new2a = `  return (
    <div>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#0D0D15', padding: '20px 18px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>Rankings</h1>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Clasificaciones de la comunidad</p>

        {/* Pill switcher */}
        <div className="pill-switcher" style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 4, display: 'flex', gap: 4, marginBottom: 0, flexWrap: 'wrap' }}>`;

let n2a = c.split(old2a).length - 1;
console.log(`  Step 2a: ${n2a} ocurrencia(s)`);
c = c.replaceAll(old2a, new2a);

// Step 2b: Después del cierre del pill-switcher, cerrar sticky header y añadir
// el sub-selector de plataforma en el header, luego abrir div de contenido.
// ELIMINAR el sub-selector de plataforma de su ubicación actual en el contenido.
const old2b = `      </div>

      {(mode === 'ranked' || mode === 'ranked2v2') ? (
        <>
          {mode === 'ranked2v2' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>👥</span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#A78BFA' }}>Ranked Dobles (2v2)</p>
            </div>
          )}
          {/* Sub-selector de plataforma */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[{ id: 'switch', label: '🎮 Switch Online' }, { id: 'parsec', label: '🖥️ Parsec' }].map(p => (
              <button key={p.id} onClick={() => setRankPlat(p.id)} style={{
                flex: 1, padding: '10px 4px', borderRadius: 12, fontWeight: 700, fontSize: 12,
                cursor: 'pointer', transition: 'all 0.15s',
                background: rankPlat === p.id ? 'rgba(232,142,0,0.1)' : '#10101A',
                border: \`1px solid \${rankPlat === p.id ? 'rgba(232,142,0,0.35)' : 'rgba(255,255,255,0.06)'}\`,
                color: rankPlat === p.id ? '#FF8C00' : 'rgba(255,255,255,0.35)',
              }}>
                {p.label}
              </button>
            ))}
          </div>`;

const new2b = `        </div>

        {/* Sub-selector de plataforma - sticky */}
        {(mode === 'ranked' || mode === 'ranked2v2') && (
          <div style={{ display: 'flex', gap: 8, padding: '12px 0 0' }}>
            {[{ id: 'switch', label: '🎮 Switch Online' }, { id: 'parsec', label: '🖥️ Parsec' }].map(p => (
              <button key={p.id} onClick={() => setRankPlat(p.id)} style={{
                flex: 1, padding: '10px 4px', borderRadius: 12, fontWeight: 700, fontSize: 12,
                cursor: 'pointer', transition: 'all 0.15s',
                background: rankPlat === p.id ? 'rgba(232,142,0,0.1)' : '#10101A',
                border: \`1px solid \${rankPlat === p.id ? 'rgba(232,142,0,0.35)' : 'rgba(255,255,255,0.06)'}\`,
                color: rankPlat === p.id ? '#FF8C00' : 'rgba(255,255,255,0.35)',
              }}>
                {p.label}
              </button>
            ))}
          </div>
        )}
        <div style={{ height: 14 }} />
      </div>

      <div style={{ padding: '0 18px' }}>
      {(mode === 'ranked' || mode === 'ranked2v2') ? (
        <>
          {mode === 'ranked2v2' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>👥</span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#A78BFA' }}>Ranked Dobles (2v2)</p>
            </div>
          )}`;

let n2b = c.split(old2b).length - 1;
console.log(`  Step 2b: ${n2b} ocurrencia(s)`);
c = c.replaceAll(old2b, new2b);

// Step 2c: Cerrar el div de contenido antes del viewProfile modal.
// El viewProfile modal en TabRankings está al final antes de los dos </div> finales.
// Buscamos el cierre del contenido condicional + apertura del viewProfile.
const old2c = `      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB — TORNEOS`;

const new2c = `      )}
      </div>

      {viewProfile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#0B0B12', zIndex: 9999, display: 'flex', flexDirection: 'column', overflowY: 'auto' }} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB — TORNEOS`;

// NOTA: Este paso NO lo hacemos porque el viewProfile ya está dentro del div
// y al mover el div de contenido lo tenemos que revisar.
// En cambio, simplemente cerramos el div de contenido antes de que termine el render.

// En vez del approach de mover el viewProfile,
// buscamos el cierre del div justo antes del cierre de la función
const old2c_real = `      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TAB — TORNEOS`;

// Reemplazar verificando donde EXACTAMENTE termina el contenido condicional.
// El viewProfile en TabRankings se renderiza DENTRO del div de contenido original.
// Al dividirlo, el viewProfile debe estar dentro del div de contenido nuevo (padding: '0 18px').
// Por eso solo necesitamos cerrar ese div al final, antes del cierre del outer div.
// El string exacto al final del TabRankings antes de la siguiente función es:
//   "      )}\n    </div>\n  );\n}\n\n/* ═══..."
// Con mi cambio 2b, el "    </div>" ya no cierra el original, sino que:
// 1. El sticky header ya está cerrado (terminó antes del contenido)
// 2. El div de contenido `<div style={{ padding: '0 18px' }}>` está abierto
// 3. El viewProfile está dentro del div de contenido (correcto)
// 4. Al final necesito cerrar el div de contenido y el outer div

const END_MARKER_OLD = `      )}
    </div>
  );
}

/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
   TAB \u2014 TORNEOS`;

const END_MARKER_NEW = `      )}
      </div>
    </div>
  );
}

/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
   TAB \u2014 TORNEOS`;

let nEnd = c.split(END_MARKER_OLD).length - 1;
console.log(`  Step 2c (close content div): ${nEnd} ocurrencia(s)`);
c = c.replaceAll(END_MARKER_OLD, END_MARKER_NEW);

// ============================================================
// Verificar UTF-8 y guardar
// ============================================================
const buf = Buffer.from(c, 'utf8');
function isStrictUTF8(buf) {
  let i = 0;
  while (i < buf.length) {
    const b = buf[i];
    let l;
    if (b < 0x80) { l = 1; }
    else if (b < 0xC2) { return { ok: false, pos: i, byte: b }; }
    else if (b < 0xE0) { l = 2; }
    else if (b < 0xF0) { l = 3; }
    else if (b < 0xF5) { l = 4; }
    else { return { ok: false, pos: i, byte: b }; }
    for (let j = 1; j < l; j++) {
      if (i + j >= buf.length || (buf[i + j] & 0xC0) !== 0x80) return { ok: false, pos: i + j, byte: buf[i + j] };
    }
    i += l;
  }
  return { ok: true };
}
const r = isStrictUTF8(buf);
if (!r.ok) {
  console.error('ERROR: UTF-8 inválido en byte 0x' + r.byte.toString(16) + ' posición ' + r.pos);
  process.exit(1);
}

fs.writeFileSync('pages/home.js', c, 'utf8');
console.log(`\nArchivo guardado OK. Antes: ${before} chars, Después: ${c.length} chars`);

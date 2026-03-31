import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getStoredUser, verifySession } from '../../src/utils/auth';

const ADMIN_SECRET = 'afk-admin-2025';
const ALL_COMMUNITIES = [
  { id: 'afk',     label: 'AFK (Buenos Aires)', short: 'AFK', color: '#F59E0B', icon: '🇦🇷' },
  { id: 'inc',     label: 'Smash INC',          short: 'INC', color: '#EF4444', icon: '🎮' },
  { id: 'cordoba', label: 'Smash Córdoba',       short: 'CBA', color: '#EC4899', icon: '🏙️' },
  { id: 'mendoza', label: 'Smash Mendoza',       short: 'MDZ', color: '#6366F1', icon: '🍇' },
  { id: 'warui',   label: 'Warui Team',          short: 'WAR', color: '#A78BFA', icon: '⚔️' },
  { id: 'santafe', label: 'Smash Santa Fe',      short: 'SFE', color: '#06B6D4', icon: '🌊' },
];
const BASE_YEARS = ['2024', '2025', '2026'];

const TYPE_LABELS = { M: 'Mensual', S: 'Semanal' };

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function posLabel(n) {
  if (n === 1) return '🥇 1°';
  if (n === 2) return '🥈 2°';
  if (n === 3) return '🥉 3°';
  return `${n}°`;
}

// ── estilos en objeto para simplicidad ───────────────────────────────────────

const S = {
  page: { minHeight: '100vh', background: '#0D0D18', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '0 0 80px' },
  header: { background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 20, fontWeight: 800 },
  body: { maxWidth: 900, margin: '0 auto', padding: '24px 16px' },
  section: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px', marginBottom: 20 },
  label: { display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' },
  input: { width: '100%', background: '#14141F', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  select: { background: '#14141F', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnRed: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(220,38,38,0.15)', color: '#F87171', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  btnOutline: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  tag: (color) => ({ display: 'inline-flex', alignItems: 'center', background: `${color}22`, border: `1px solid ${color}55`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, color }),
  error: { background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: '10px 14px', color: '#FCA5A5', fontSize: 13, marginTop: 10 },
  success: { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '10px 14px', color: '#86EFAC', fontSize: 13, marginTop: 10 },
};

// ── TournamentCard ────────────────────────────────────────────────────────────

function TournamentCard({ t, community, year, onRemove, onBonusUpdate }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bonusEdits, setBonusEdits] = useState({});

  const topStandings = (t.standings || []).filter(s => s.placement >= 1 && s.placement <= 8);
  const hasBonus = topStandings.length > 0;

  async function saveBonuses() {
    setSaving(true);
    for (const [playerName, bonus] of Object.entries(bonusEdits)) {
      await fetch('/api/community-ranking/update-bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_SECRET}` },
        body: JSON.stringify({ tournamentId: t.id, playerName, bonusPoints: bonus, community, year }),
      });
    }
    setBonusEdits({});
    setSaving(false);
    onBonusUpdate();
  }

  return (
    <div style={{ background: '#0F0F1C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', flexWrap: 'wrap' }}>
        <span style={S.tag(t.type === 'M' ? '#A78BFA' : '#60A5FA')}>{TYPE_LABELS[t.type]}</span>
        <div style={{ flex: 1, minWidth: 160 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{t.name}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{fmtDate(t.startAt)} · {t.numAttendees} jugadores · {t.standings?.length || 0} posiciones</p>
        </div>
        <button style={S.btnOutline} onClick={() => setOpen(o => !o)}>
          {open ? '▲ Cerrar' : '▼ Ver standings'}
        </button>
        <button style={S.btnRed} onClick={() => onRemove(t.id)}>✕ Eliminar</button>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px 16px' }}>
          {hasBonus && (
            <p style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              Top 8: editá los bonos manualmente (por vencer a Top 8 ajenos al evento). Los Top 8 no reciben bono entre sí.
            </p>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>Pos</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>Jugador</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Base</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'center' }}>Bono</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(t.standings || []).map(s => {
                  const currentBonus = bonusEdits[s.playerName] !== undefined ? bonusEdits[s.playerName] : s.bonusPoints;
                  const isTop8 = s.placement <= 8;
                  return (
                    <tr key={s.playerName} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{posLabel(s.placement)}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{s.playerName}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: '#A78BFA' }}>{s.basePoints}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        {isTop8 ? (
                          <input
                            type="number"
                            min="0"
                            value={currentBonus}
                            onChange={e => setBonusEdits(b => ({ ...b, [s.playerName]: parseInt(e.target.value, 10) || 0 }))}
                            style={{ ...S.input, width: 70, padding: '4px 8px', textAlign: 'center' }}
                          />
                        ) : (
                          <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#60A5FA' }}>
                        {s.basePoints + (typeof currentBonus === 'number' ? currentBonus : s.bonusPoints)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {Object.keys(bonusEdits).length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button style={S.btn} onClick={saveBonuses} disabled={saving}>
                {saving ? 'Guardando...' : '💾 Guardar bonos'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── RankingPreview ────────────────────────────────────────────────────────────

function RankingPreview({ players }) {
  if (!players || players.length === 0) return (
    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: 20 }}>Aún no hay torneos cargados</p>
  );
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'left' }}>
            <th style={{ padding: '6px 10px', fontWeight: 600, width: 40 }}>#</th>
            <th style={{ padding: '6px 10px', fontWeight: 600 }}>Jugador</th>
            <th style={{ padding: '6px 10px', fontWeight: 600, textAlign: 'right' }}>Puntos</th>
          </tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr key={p.name} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '8px 10px', color: p.position <= 3 ? '#EAB308' : 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                {p.position}
              </td>
              <td style={{ padding: '8px 10px', fontWeight: 600 }}>{p.name}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#A78BFA' }}>{p.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return null;

  // Detectar separador
  const sep = lines[0].includes(';') ? ';' : ',';

  // Detectar si la primera fila es cabecera
  const firstCols = lines[0].split(sep).map(c => c.trim().toLowerCase());
  const hasHeader = firstCols.some(c => /pos|place|rank|nombre|name|jugador|player|punt|pts|point/.test(c));

  // Detectar índices de columnas
  let idxPos = -1, idxName = -1, idxPts = -1;
  if (hasHeader) {
    firstCols.forEach((c, i) => {
      if (/^(pos|place|rank|#)/.test(c)) idxPos = i;
      else if (/nombre|name|jugador|player|tag/.test(c)) idxName = i;
      else if (/punt|pts|point|total/.test(c)) idxPts = i;
    });
  }
  // Fallback posicional
  if (idxPos === -1) idxPos = 0;
  if (idxName === -1) idxName = 1;
  if (idxPts === -1) idxPts = 2;

  const startLine = hasHeader ? 1 : 0;
  const rows = [];
  for (let i = startLine; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 2) continue;
    const placement = parseInt(cols[idxPos], 10) || (i - startLine + 1);
    const playerName = cols[idxName] || '';
    const basePoints = parseInt(cols[idxPts], 10) || 0;
    if (!playerName) continue;
    rows.push({ placement, playerName, basePoints });
  }
  return rows.length > 0 ? rows : null;
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AfkRankingAdmin() {
  const router = useRouter();
  const [checking, setChecking]           = useState(true);
  const [userIsAdmin, setUserIsAdmin]     = useState(false);
  const [allowedComms, setAllowedComms]   = useState([]);

  // Filtros
  const [community, setCommunity] = useState('afk');
  const [year, setYear]           = useState('2025');
  const [availableYears, setAvailableYears] = useState(BASE_YEARS);
  const [newYearInput, setNewYearInput]     = useState('');

  // Datos
  const [data, setData]             = useState({ players: [], tournaments: [] });
  const [loadingData, setLoadingData] = useState(false);

  // Formulario start.gg
  const [formUrl,  setFormUrl]  = useState('');
  const [formType, setFormType] = useState('S');
  const [formName, setFormName] = useState('');
  const [adding,   setAdding]   = useState(false);
  const [addMsg,   setAddMsg]   = useState(null);

  // CSV
  const [csvRows,      setCsvRows]      = useState(null);
  const [csvName,      setCsvName]      = useState('');
  const [csvType,      setCsvType]      = useState('S');
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvMsg,       setCsvMsg]       = useState(null);
  const csvFileRef = useRef(null);

  // Config comunidades visibles en home
  const [rankingComms,        setRankingComms]        = useState(['afk']);
  const [rankingCommsSaving,  setRankingCommsSaving]  = useState(false);
  const [rankingCommsMsg,     setRankingCommsMsg]     = useState(null);

  // Comunidades visibles
  const visibleComms = userIsAdmin
    ? ALL_COMMUNITIES
    : ALL_COMMUNITIES.filter(c => allowedComms.includes(c.id));

  // ── auth ──
  useEffect(() => {
    const stored = getStoredUser();
    if (!stored?.access_token) { router.replace('/login'); return; }
    verifySession().then(d => {
      if (!d) { router.replace('/login'); return; }
      const comms = d.adminCommunities || [];
      const admin = !!d.isAdmin;
      if (!admin && comms.length === 0) { router.replace('/'); return; }
      setUserIsAdmin(admin);
      setAllowedComms(comms);
      // Tomar comunidad del query string, si no la primera permitida
      const qComm = new URLSearchParams(window.location.search).get('community');
      if (qComm) {
        setCommunity(qComm);
      } else if (!admin && comms.length > 0) {
        setCommunity(comms[0]);
      }
      setChecking(false);
    });
  }, []);

  // ── cargar config de comunidades del home ──
  useEffect(() => {
    if (!userIsAdmin) return;
    fetch('/api/community-ranking/config')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.communities) setRankingComms(d.communities); })
      .catch(() => {});
  }, [userIsAdmin]);

  async function saveRankingComms() {
    setRankingCommsSaving(true);
    setRankingCommsMsg(null);
    try {
      const r = await fetch('/api/community-ranking/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_SECRET}` },
        body: JSON.stringify({ communities: rankingComms }),
      });
      const json = await r.json();
      if (r.ok) {
        setRankingComms(json.communities);
        setRankingCommsMsg({ ok: true, text: '✅ Configuración guardada' });
      } else {
        setRankingCommsMsg({ ok: false, text: json.error || 'Error al guardar' });
      }
    } catch (err) {
      setRankingCommsMsg({ ok: false, text: err.message });
    }
    setRankingCommsSaving(false);
  }

  // ── cargar datos ──
  async function loadData(c, y) {
    setLoadingData(true);
    try {
      const r = await fetch(`/api/community-ranking/get?community=${c}&year=${y}`);
      const json = r.ok ? await r.json() : null;
      setData(json || { players: [], tournaments: [] });
    } catch {
      setData({ players: [], tournaments: [] });
    }
    setLoadingData(false);
  }

  useEffect(() => {
    if (!checking) loadData(community, year);
  }, [community, year, checking]);

  // ── agregar año ──
  function handleAddYear(e) {
    e.preventDefault();
    const y = newYearInput.trim();
    if (!y || !/^\d{4}$/.test(y)) return;
    if (!availableYears.includes(y)) setAvailableYears(prev => [...prev, y].sort());
    setYear(y);
    setNewYearInput('');
  }

  // ── agregar torneo ──
  async function handleAdd(e) {
    e.preventDefault();
    if (!formUrl.trim()) return;
    setAdding(true);
    setAddMsg(null);
    try {
      const r = await fetch('/api/community-ranking/add-tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_SECRET}` },
        body: JSON.stringify({ url: formUrl.trim(), type: formType, community, year, nameOverride: formName.trim() || undefined }),
      });
      const json = await r.json();
      if (r.ok) {
        setAddMsg({ ok: true, text: `✅ Torneo "${json.tournament?.name}" agregado (${json.tournament?.standings?.length} posiciones)` });
        setFormUrl('');
        setFormName('');
        loadData(community, year);
      } else {
        setAddMsg({ ok: false, text: json.error || 'Error desconocido' });
      }
    } catch (err) {
      setAddMsg({ ok: false, text: err.message });
    }
    setAdding(false);
  }

  // ── CSV ──
  function handleCSVFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCSV(ev.target.result);
      if (!rows) { setCsvRows(null); setCsvMsg({ ok: false, text: 'No se pudo parsear el CSV. Revisá el formato.' }); return; }
      setCsvRows(rows);
      setCsvName(file.name.replace(/\.(csv|txt)$/i, ''));
      setCsvMsg(null);
    };
    reader.readAsText(file, 'utf-8');
  }

  async function handleImportCSV(e) {
    e.preventDefault();
    if (!csvRows || csvRows.length === 0 || !csvName.trim()) return;
    setCsvImporting(true);
    setCsvMsg(null);
    try {
      const r = await fetch('/api/community-ranking/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_SECRET}` },
        body: JSON.stringify({ rows: csvRows, community, year, tournamentName: csvName.trim(), type: csvType }),
      });
      const json = await r.json();
      if (r.ok) {
        setCsvMsg({ ok: true, text: `✅ Importado "${json.tournament?.name}" con ${json.tournament?.standings?.length} jugadores` });
        setCsvRows(null);
        if (csvFileRef.current) csvFileRef.current.value = '';
        loadData(community, year);
      } else {
        setCsvMsg({ ok: false, text: json.error || 'Error desconocido' });
      }
    } catch (err) {
      setCsvMsg({ ok: false, text: err.message });
    }
    setCsvImporting(false);
  }

  // ── eliminar torneo ──
  async function handleRemove(id) {
    if (!confirm('¿Eliminar este torneo del ranking?')) return;
    await fetch(`/api/community-ranking/remove-tournament?id=${encodeURIComponent(id)}&community=${community}&year=${year}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    });
    loadData(community, year);
  }

  if (checking) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Verificando sesión...</p>
      </div>
    );
  }

  return (
    <>
      <Head><title>Ranking Comunitario — Admin</title></Head>
      <div style={S.page}>
        {/* Header */}
        <div style={{ ...S.header, gap: 12, position: 'sticky', top: 0, zIndex: 20 }}>
          <button
            onClick={() => router.push('/?panel=1')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            ← Volver
          </button>
          <span style={{ fontSize: 22, flexShrink: 0 }}>🏆</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ ...S.title, fontSize: 17, margin: 0 }}>Ranking Comunitario</h1>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              {visibleComms.find(c => c.id === community)?.label || ''} — {year}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto' }}>
            {availableYears.map(y => (
              <button key={y} onClick={() => setYear(y)} style={{
                padding: '6px 14px', borderRadius: 20, border: y === year ? 'none' : '1px solid rgba(255,255,255,0.12)',
                background: y === year ? '#7C3AED' : 'rgba(255,255,255,0.04)',
                color: y === year ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s',
              }}>{y}</button>
            ))}
            <form onSubmit={handleAddYear} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                value={newYearInput}
                onChange={e => setNewYearInput(e.target.value)}
                placeholder="+ año"
                maxLength={4}
                style={{ ...S.input, width: 72, padding: '6px 10px', fontSize: 13 }}
              />
              <button type="submit" style={{ ...S.btn, padding: '6px 10px', background: 'rgba(99,102,241,0.7)', fontSize: 13 }} title="Agregar año">＋</button>
            </form>
          </div>
        </div>

        <div style={S.body}>

          {/* ── Selector de comunidad ── */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Comunidad activa</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {visibleComms.map(c => {
                const active = community === c.id;
                return (
                  <button key={c.id} onClick={() => setCommunity(c.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '9px 16px', borderRadius: 12,
                    background: active ? `${c.color}22` : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${active ? c.color : 'rgba(255,255,255,0.08)'}`,
                    color: active ? c.color : 'rgba(255,255,255,0.5)',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: 15 }}>{c.icon}</span>
                    <span>{c.short || c.label}</span>
                    {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Comunidades visibles en Rankings (solo superadmin) ── */}
          {userIsAdmin && (
            <div style={S.section}>
              <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800 }}>🌐 Comunidades en Rankings</h2>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                Elegí qué comunidades aparecen como tabs en la sección Rankings de la app.
                Solo mostrá las que tengan datos cargados.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {ALL_COMMUNITIES.map(c => {
                  const active = rankingComms.includes(c.id);
                  return (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 14px', borderRadius: 12, background: active ? 'rgba(255,140,0,0.07)' : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? 'rgba(255,140,0,0.3)' : 'rgba(255,255,255,0.08)'}`, transition: 'all 0.15s' }}>
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={e => {
                          if (e.target.checked) setRankingComms(prev => [...prev, c.id]);
                          else setRankingComms(prev => prev.filter(x => x !== c.id));
                          setRankingCommsMsg(null);
                        }}
                        style={{ width: 16, height: 16, accentColor: '#FF8C00', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 700, color: active ? '#FF8C00' : 'rgba(255,255,255,0.6)' }}>{c.label}</span>
                      {active && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#22C55E', fontWeight: 700 }}>Visible</span>}
                    </label>
                  );
                })}
              </div>
              <button onClick={saveRankingComms} disabled={rankingCommsSaving} style={{ ...S.btn, background: 'rgba(255,140,0,0.8)' }}>
                {rankingCommsSaving ? '⏳ Guardando...' : '💾 Guardar cambios'}
              </button>
              {rankingCommsMsg && <div style={rankingCommsMsg.ok ? S.success : S.error}>{rankingCommsMsg.text}</div>}
            </div>
          )}

          {/* ── Agregar torneo ── */}
          <div style={S.section}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>Agregar torneo</h2>
            <form onSubmit={handleAdd}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
                <div>
                  <label style={S.label}>URL de start.gg *</label>
                  <input
                    style={S.input}
                    placeholder="https://www.start.gg/tournament/..."
                    value={formUrl}
                    onChange={e => setFormUrl(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Tipo</label>
                  <select value={formType} onChange={e => setFormType(e.target.value)} style={S.select}>
                    <option value="S">Semanal</option>
                    <option value="M">Mensual</option>
                  </select>
                </div>
                <button type="submit" style={S.btn} disabled={adding}>
                  {adding ? '⏳ Importando...' : '＋ Agregar'}
                </button>
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={S.label}>Nombre override (opcional)</label>
                <input
                  style={{ ...S.input, maxWidth: 360 }}
                  placeholder="Ej: AFK Semanal #12"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                />
              </div>
              {addMsg && <div style={addMsg.ok ? S.success : S.error}>{addMsg.text}</div>}
            </form>

            {/* Tabla de puntos referencia */}
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.4)', userSelect: 'none' }}>
                📋 Ver tabla de puntos
              </summary>
              <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[
                  { label: 'Mensual', rows: [['1°', 1000], ['2°', 600], ['3°', 450], ['4°', 360], ['5°-6°', 270], ['7°-8°', 180], ['9°-12°', 90], ['13°-32°', 45], ['33°-64°', 25]] },
                  { label: 'Semanal', rows: [['1°', 350], ['2°', 200], ['3°', 150], ['4°', 120], ['5°-6°', 90], ['7°-8°', 60], ['9°-12°', 30], ['13°-32°', 15], ['33°-64°', 10]] },
                ].map(({ label, rows }) => (
                  <div key={label} style={{ background: '#0A0A14', borderRadius: 10, padding: '10px 14px', minWidth: 160 }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: label === 'Mensual' ? '#A78BFA' : '#60A5FA' }}>{label}</p>
                    {rows.map(([pos, pts]) => (
                      <div key={pos} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.5)', padding: '2px 0' }}>
                        <span>{pos}</span><span style={{ fontWeight: 700, color: '#fff' }}>{pts}</span>
                      </div>
                    ))}
                  </div>
                ))}
                <div style={{ background: '#0A0A14', borderRadius: 10, padding: '10px 14px', minWidth: 200 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#EAB308' }}>Bonificación</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                    +60 pts (M) / +45 pts (S) por vencer a un Top 8.<br />
                    Los Top 8 no reciben bono entre sí.
                  </p>
                </div>
              </div>
            </details>
          </div>

          {/* ── Importar CSV ── */}
          <div style={S.section}>
            <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>Importar desde CSV</h2>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
              Para ranking histórico o con puntos ya calculados. Columnas esperadas: <code style={{ background: '#141420', padding: '1px 5px', borderRadius: 4 }}>posición, nombre, puntos</code> (con o sin cabecera).
            </p>
            <form onSubmit={handleImportCSV}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'end', flexWrap: 'wrap', marginBottom: 10 }}>
                <div>
                  <label style={S.label}>Archivo CSV *</label>
                  <input
                    ref={csvFileRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleCSVFile}
                    style={{ ...S.input, padding: '8px 12px', cursor: 'pointer' }}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Tipo</label>
                  <select value={csvType} onChange={e => setCsvType(e.target.value)} style={S.select}>
                    <option value="S">Semanal</option>
                    <option value="M">Mensual</option>
                    <option value="IMPORT">Importación</option>
                  </select>
                </div>
                <button type="submit" style={{ ...S.btn, background: 'rgba(16,185,129,0.8)' }} disabled={csvImporting || !csvRows}>
                  {csvImporting ? '⏳ Importando...' : '📥 Importar'}
                </button>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={S.label}>Nombre del registro *</label>
                <input
                  style={{ ...S.input, maxWidth: 400 }}
                  placeholder="Ej: Ranking AFK 2024"
                  value={csvName}
                  onChange={e => setCsvName(e.target.value)}
                  required
                />
              </div>
              {csvRows && (
                <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#86EFAC' }}>
                  ✅ CSV listo: <strong>{csvRows.length} jugadores</strong> detectados.
                  {' '}Top 3: {csvRows.slice(0, 3).map(r => `${r.playerName} (${r.basePoints}pts)`).join(', ')}
                </div>
              )}
              {csvMsg && <div style={csvMsg.ok ? S.success : S.error}>{csvMsg.text}</div>}
            </form>
          </div>

          {/* ── Torneos cargados ── */}
          <div style={S.section}>
            <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800 }}>
              Torneos cargados {loadingData && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>cargando...</span>}
              <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>
                ({data.tournaments.length})
              </span>
            </h2>
            {data.tournaments.length === 0 && !loadingData && (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No hay torneos para esta comunidad y año.</p>
            )}
            {[...data.tournaments].reverse().map(t => (
              <TournamentCard
                key={t.id}
                t={t}
                community={community}
                year={year}
                onRemove={handleRemove}
                onBonusUpdate={() => loadData(community, year)}
              />
            ))}
          </div>

          {/* ── Preview del ranking ── */}
          <div style={S.section}>
            <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800 }}>
              Preview del ranking actual
            </h2>
            <RankingPreview players={data.players} />
          </div>

        </div>
      </div>
    </>
  );
}

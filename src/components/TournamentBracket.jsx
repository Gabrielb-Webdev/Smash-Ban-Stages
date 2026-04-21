import { Component, useState, useCallback, useRef, useEffect } from 'react';
import { CHARACTERS } from '../../lib/characters';

const TOURNAMENT_STAGES = [
  { id: 'battlefield',       name: 'Battlefield',       img: '/images/stages/Battlefield.png' },
  { id: 'small-battlefield', name: 'Small Battlefield', img: '/images/stages/Small Battlefield.png' },
  { id: 'final-destination', name: 'Final Destination', img: '/images/stages/Final Destination.png' },
  { id: 'pokemon-stadium-2', name: 'Pokémon Stadium 2', img: '/images/stages/Pokemon Stadium 2.png' },
  { id: 'smashville',        name: 'Smashville',        img: '/images/stages/Smashville.png' },
  { id: 'town-and-city',     name: 'Town & City',       img: '/images/stages/Town and City.png' },
  { id: 'kalos',             name: 'Kalos',             img: '/images/stages/Kalos.png' },
  { id: 'hollow-bastion',    name: 'Hollow Bastion',    img: '/images/stages/Hollow Bastion.png' },
];

const SET_STATE_STYLE_DEFAULT = {
  COMPLETED: { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)',    text: '#4ADE80' },
  ACTIVE:    { bg: 'rgba(255,140,0,0.15)',    border: 'rgba(255,140,0,0.4)',    text: '#FF8C00' },
  CALLED:    { bg: 'rgba(255,140,0,0.15)',    border: 'rgba(255,140,0,0.4)',    text: '#FF8C00' },
  BYE:       { bg: 'rgba(255,255,255,0.06)',  border: 'rgba(255,255,255,0.12)', text: '#9CA3AF' },
  CREATED:   { bg: 'rgba(255,255,255,0.04)',  border: 'rgba(255,255,255,0.10)', text: '#6B7280' },
};

class BracketErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: '24px 20px', textAlign: 'center' }}>
          <p style={{ color: '#F87171', fontWeight: 700, fontSize: 14, margin: '0 0 6px' }}>Error al renderizar el bracket</p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: 0 }}>{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function getRoundPriority(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('grand final reset')) return 99;
  if (n.includes('grand final'))       return 98;
  if (n.includes('losers final') && !n.includes('semi') && !n.includes('quarter')) return 80;
  if (n.includes('losers semi'))    return 75;
  if (n.includes('losers quarter')) return 72;
  const lm = n.match(/losers.*?(\d+)/); if (lm) return 50 + parseInt(lm[1]);
  if (n.includes('winners final') && !n.includes('semi') && !n.includes('quarter')) return 40;
  if (n.includes('winners semi'))    return 35;
  if (n.includes('winners quarter')) return 30;
  const wm = n.match(/winners.*?(\d+)/); if (wm) return 10 + parseInt(wm[1]);
  return 60;
}

/* ─────────────────────────────────────────────────────────
   Custom character picker: buscador + imágenes, overlay fijo
───────────────────────────────────────────────────────── */
function CharacterPicker({ value, onChange, suggestions = [] }) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const triggerRef            = useRef(null);
  const dropdownRef           = useRef(null);
  const inputRef              = useRef(null);
  const [rect, setRect]       = useState(null);

  const selected = CHARACTERS.find(c => c.id === value) || null;

  const filtered = query.trim()
    ? CHARACTERS.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : CHARACTERS;

  // Personajes sugeridos (usados en otros juegos por este jugador)
  const suggestedChars = suggestions
    .map(id => CHARACTERS.find(c => c.id === id))
    .filter(Boolean);

  const openPicker = () => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 40);
  };

  const pick = (id) => {
    onChange(id);
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!dropdownRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Recalc position on scroll/resize
  useEffect(() => {
    if (!open) return;
    const recalc = () => { if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect()); };
    window.addEventListener('scroll', recalc, true);
    window.addEventListener('resize', recalc);
    return () => { window.removeEventListener('scroll', recalc, true); window.removeEventListener('resize', recalc); };
  }, [open]);

  // Dropdown position: prefer below, flip to above if no space
  const dropTop  = rect ? (rect.bottom + 6 + 280 > window.innerHeight ? rect.top - 280 - 6 : rect.bottom + 6) : 0;
  const dropLeft = rect ? Math.min(rect.left, window.innerWidth - 240 - 8) : 0;

  return (
    <>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={openPicker}
        style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', textAlign: 'left', transition: 'border-color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.45)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
      >
        {selected
          ? <img src={`/images/characters/${selected.img}`} alt={selected.name} style={{ width: 22, height: 22, objectFit: 'contain', borderRadius: 4, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
          : <div style={{ width: 22, height: 22, borderRadius: 4, background: 'rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>?</div>
        }
        <span style={{ flex: 1, fontSize: 11, fontWeight: selected ? 700 : 400, color: selected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.name : '— personaje'}
        </span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>▾</span>
      </button>

      {/* Floating dropdown rendered via portal-like approach */}
      {open && rect && (
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: dropTop, left: dropLeft, width: 240, maxHeight: 280, zIndex: 99999, background: '#12121F', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          {/* Search input */}
          <div style={{ padding: '8px 8px 6px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 7, padding: '5px 8px' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>🔍</span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar personaje…"
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12, color: '#fff', fontFamily: 'Outfit, sans-serif' }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {/* Clear option */}
            {!query && (
              <button
                onClick={() => pick('')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: !value ? 'rgba(124,58,237,0.12)' : 'none', border: 'none', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />
                — ninguno
              </button>
            )}
            {/* Suggested characters section */}
            {!query && suggestedChars.length > 0 && (
              <>
                <div style={{ padding: '6px 10px 3px', fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Usados</div>
                {suggestedChars.map(c => (
                  <button
                    key={`sug-${c.id}`}
                    onClick={() => pick(c.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 10px', background: value === c.id ? 'rgba(124,58,237,0.22)' : 'rgba(124,58,237,0.06)', border: 'none', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: 12, fontWeight: value === c.id ? 800 : 600, color: value === c.id ? '#C4B5FD' : 'rgba(255,255,255,0.85)', textAlign: 'left', transition: 'background 0.1s' }}
                    onMouseEnter={e => { if (value !== c.id) e.currentTarget.style.background = 'rgba(124,58,237,0.14)'; }}
                    onMouseLeave={e => { if (value !== c.id) e.currentTarget.style.background = 'rgba(124,58,237,0.06)'; }}
                  >
                    <img src={`/images/characters/${c.img}`} alt={c.name} style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 5, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                    {c.name}
                  </button>
                ))}
                <div style={{ margin: '4px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }} />
                <div style={{ padding: '4px 10px 3px', fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Todos</div>
              </>
            )}
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => pick(c.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 10px', background: value === c.id ? 'rgba(124,58,237,0.18)' : 'none', border: 'none', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: 12, fontWeight: value === c.id ? 800 : 500, color: value === c.id ? '#C4B5FD' : 'rgba(255,255,255,0.75)', textAlign: 'left', transition: 'background 0.1s' }}
                onMouseEnter={e => { if (value !== c.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { if (value !== c.id) e.currentTarget.style.background = 'none'; }}
              >
                <img src={`/images/characters/${c.img}`} alt={c.name} style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 5, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                {c.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Sin resultados</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MatchManageModal({ set, onClose }) {
  const slots     = set?.slots || [];
  const p1Entrant = slots[0]?.entrant || null;
  const p2Entrant = slots[1]?.entrant || null;
  const p1Id      = p1Entrant?.id ? String(p1Entrant.id) : null;
  const p2Id      = p2Entrant?.id ? String(p2Entrant.id) : null;
  const p1Name    = p1Entrant?.name || 'Jugador 1';
  const p2Name    = p2Entrant?.name || 'Jugador 2';

  const isEditingCompleted = set?.stateLabel === 'COMPLETED';
  const inferredMax        = set?.totalGames;

  // Format: infer from set data, otherwise show picker
  const [formatChosen, setFormatChosen] = useState(
    isEditingCompleted || inferredMax === 5 || inferredMax === 3
  );
  const [format, setFormat] = useState(inferredMax === 5 ? 'bo5' : 'bo3');

  const maxGames   = format === 'bo5' ? 5 : 3;
  const winsNeeded = format === 'bo5' ? 3 : 2;

  const makeGame = (n) => ({ gameNum: n, winnerId: null, char0: '', char1: '', stageId: '' });

  // Pre-cargar con datos existentes de Start.GG al editar un resultado completado
  const initialGames = (() => {
    const existing = set?.games;
    if (isEditingCompleted && existing?.length > 0) {
      return existing.map(g => ({
        gameNum:  g.gameNum,
        winnerId: g.winnerId || null,
        char0:    g.char0 || '',
        char1:    g.char1 || '',
        stageId:  g.stageId || '',
      }));
    }
    return [makeGame(1)];
  })();
  const [games, setGames]               = useState(initialGames);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState(null);
  const [successMsg, setSuccessMsg]     = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting]       = useState(false);
  const [p1History, setP1History]       = useState([]);
  const [p2History, setP2History]       = useState([]);

  // Cargar historial persistente de personajes por jugador al abrir el modal
  useEffect(() => {
    const load = async (name, setter) => {
      if (!name || name === 'Jugador 1' || name === 'Jugador 2') return;
      try {
        const r = await fetch(`/api/tournaments/player-chars?name=${encodeURIComponent(name)}`);
        const d = await r.json();
        if (Array.isArray(d.chars)) setter(d.chars);
      } catch {}
    };
    load(p1Name, setP1History);
    load(p2Name, setP2History);
  }, [p1Name, p2Name]);

  const p1Score         = games.filter(g => g.winnerId === p1Id).length;
  const p2Score         = games.filter(g => g.winnerId === p2Id).length;
  const overallWinnerId = p1Score >= winsNeeded ? p1Id : p2Score >= winsNeeded ? p2Id : null;

  const charById = Object.fromEntries(CHARACTERS.map(c => [c.id, c]));

  // Characters a player used in OTHER games of this match
  const charHistoryFor = (gameIdx, field) =>
    games
      .filter((g, i) => i !== gameIdx && g[field])
      .map(g => g[field])
      .filter((v, i, arr) => arr.indexOf(v) === i);

  const updateGame = (idx, field, val) =>
    setGames(prev => prev.map((g, i) => i === idx ? { ...g, [field]: val } : g));

  const addGame = () => {
    if (games.length >= maxGames) return;
    setGames(prev => [...prev, makeGame(prev.length + 1)]);
  };

  const removeGame = (idx) =>
    setGames(prev => prev.filter((_, i) => i !== idx).map((g, i) => ({ ...g, gameNum: i + 1 })));

  const handleSave = async (isFinal) => {
    setSaving(true); setError(null); setSuccessMsg(null);
    try {
      const gamesWithWinner = games.filter(g => g.winnerId);
      const gameData = gamesWithWinner.map((g, i) => ({
        gameNum: i + 1,
        winnerId:    g.winnerId,
        char1Slug:   g.char0 || null,
        char2Slug:   g.char1 || null,
        p1EntrantId: p1Id,
        p2EntrantId: p2Id,
        stageId:     g.stageId || null,
      }));
      const r = await fetch('/api/tournaments/report-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId: set.id, winnerId: isFinal ? overallWinnerId : null, gameData }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error al guardar');

      // Guardar historial de personajes en Redis (fire & forget)
      const saveChars = (name, charSlugs) => {
        const unique = [...new Set(charSlugs.filter(Boolean))];
        if (!name || name === 'Jugador 1' || name === 'Jugador 2' || !unique.length) return;
        fetch('/api/tournaments/player-chars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, chars: unique }),
        }).then(res => res.json()).then(d => {
          if (d.ok) {
            // Actualizar historial local con los nuevos personajes
            setP1History(prev => [...new Set([...unique.filter(c => games.some(g => g.char0 === c)), ...prev])]);
            setP2History(prev => [...new Set([...unique.filter(c => games.some(g => g.char1 === c)), ...prev])]);
          }
        }).catch(() => {});
      };
      saveChars(p1Name, games.map(g => g.char0));
      saveChars(p2Name, games.map(g => g.char1));

      setSuccessMsg(isFinal ? '✅ Resultado enviado a Start.GG' : '✅ Progreso guardado');
      if (isFinal) setTimeout(onClose, 1800);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true); setError(null);
    try {
      const r = await fetch('/api/tournaments/reset-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId: set.id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error al resetear');
      setGames([makeGame(1)]);
      setConfirmReset(false);
      setSuccessMsg('✅ Match cancelado en Start.GG');
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(e.message);
      setConfirmReset(false);
    } finally {
      setResetting(false);
    }
  };

  const OVERLAY_STYLE = {
    position: 'fixed', inset: 0, zIndex: 10000,
    background: 'rgba(0,0,0,0.87)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16, animation: 'mmFadeIn 0.18s ease-out',
  };
  const CONTAINER_STYLE = {
    width: '100%', background: '#0F0F1A',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 80px rgba(0,0,0,0.85)', overflow: 'hidden',
    animation: 'mmSlideUp 0.2s ease-out',
  };
  const ANIM_CSS = `
    @keyframes mmFadeIn  { from { opacity:0 } to { opacity:1 } }
    @keyframes mmSlideUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
    @keyframes mmPulse   { 0%,100% { opacity:1 } 50% { opacity:0.65 } }
    .mm-win-btn:hover  { filter:brightness(1.12) !important; }
    .mm-stage-btn:hover { opacity:0.85 !important; }
    .mm-addgame:hover  { border-color:rgba(255,255,255,0.2) !important; color:rgba(255,255,255,0.5) !important; }
  `;

  /* ──────────────────────────────────────────────
     FORMAT PICKER (shown before game list)
  ────────────────────────────────────────────── */
  if (!formatChosen) {
    return (
      <div onClick={onClose} style={OVERLAY_STYLE}>
        <style>{ANIM_CSS}</style>
        <div onClick={e => e.stopPropagation()} style={{ ...CONTAINER_STYLE, maxWidth: 400 }}>
          {/* Header */}
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{set?.round || 'Partido'}</p>
              <p style={{ margin: '5px 0 0', fontSize: 14, fontWeight: 900, color: '#fff' }}>
                <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', verticalAlign: 'bottom' }}>{p1Name}</span>
                <span style={{ color: 'rgba(255,255,255,0.22)', margin: '0 8px' }}>vs</span>
                <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', verticalAlign: 'bottom' }}>{p2Name}</span>
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
          </div>
          {/* Picker */}
          <div style={{ padding: '18px 20px 22px' }}>
            <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.38)' }}>Seleccioná el formato de la serie:</p>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { val: 'bo3', label: 'BO3', sub: 'Mejor de 3', detail: '2 wins para ganar' },
                { val: 'bo5', label: 'BO5', sub: 'Mejor de 5', detail: '3 wins para ganar' },
              ].map(({ val, label, sub, detail }) => (
                <button
                  key={val}
                  onClick={() => { setFormat(val); setFormatChosen(true); }}
                  style={{ flex: 1, padding: '20px 12px', borderRadius: 14, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', fontFamily: 'Outfit, sans-serif', textAlign: 'center', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.14)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.45)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                >
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#C4B5FD', marginBottom: 5, letterSpacing: '-0.5px' }}>{label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>{sub}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.28)' }}>{detail}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ──────────────────────────────────────────────
     MAIN MODAL
  ────────────────────────────────────────────── */
  return (
    <div onClick={onClose} style={OVERLAY_STYLE}>
      <style>{ANIM_CSS}</style>
      <div onClick={e => e.stopPropagation()} style={{ ...CONTAINER_STYLE, maxWidth: 600, maxHeight: '92vh' }}>

        {/* ── EDIT MODE BANNER ── */}
        {isEditingCompleted && (
          <div style={{ padding: '7px 18px', background: 'rgba(255,140,0,0.1)', borderBottom: '1px solid rgba(255,140,0,0.22)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 12 }}>✏️</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#FB923C', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.06em' }}>EDITANDO RESULTADO YA ENVIADO</span>
          </div>
        )}

        {/* ── HEADER ── */}
        <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Round + format */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {set?.round || 'Gestionar partido'}
                </span>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#C4B5FD', background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 99, padding: '1px 8px' }}>
                  {format.toUpperCase()}
                </span>
                <button
                  onClick={() => setFormatChosen(false)}
                  style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.22)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Outfit, sans-serif', textDecoration: 'underline' }}
                >
                  cambiar
                </button>
              </div>
              {/* Live scoreboard */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 900, color: p1Score > p2Score ? '#fff' : 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.2s' }}>{p1Name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.05)', borderRadius: 11, padding: '4px 14px', flexShrink: 0 }}>
                  <span style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, minWidth: 22, textAlign: 'center', color: p1Score > p2Score ? '#4ADE80' : 'rgba(255,255,255,0.38)', transition: 'color 0.2s' }}>{p1Score}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>—</span>
                  <span style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, minWidth: 22, textAlign: 'center', color: p2Score > p1Score ? '#4ADE80' : 'rgba(255,255,255,0.38)', transition: 'color 0.2s' }}>{p2Score}</span>
                </div>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 900, color: p2Score > p1Score ? '#fff' : 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right', transition: 'color 0.2s' }}>{p2Name}</span>
              </div>
              {/* Winner announcement */}
              {overallWinnerId && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '5px 12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10 }}>
                  <span style={{ fontSize: 13 }}>🏆</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#4ADE80' }}>{overallWinnerId === p1Id ? p1Name : p2Name} gana la serie</span>
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {games.map((game, idx) => {
            const p1Char   = charById[game.char0];
            const p2Char   = charById[game.char1];
            const selStage = TOURNAMENT_STAGES.find(s => s.id === game.stageId);
            const isGWon   = !!game.winnerId;
            const p1Won    = game.winnerId === p1Id;
            const p2Won    = game.winnerId === p2Id;
            const p1Hist   = charHistoryFor(idx, 'char0');
            const p2Hist   = charHistoryFor(idx, 'char1');

            return (
              <div key={idx} style={{ background: isGWon ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.025)', border: `1px solid ${isGWon ? 'rgba(34,197,94,0.22)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s, background 0.2s' }}>
                {/* Game header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', background: 'rgba(0,0,0,0.18)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Juego {game.gameNum}</span>
                    {isGWon && <span style={{ fontSize: 9, fontWeight: 800, color: '#4ADE80', background: 'rgba(34,197,94,0.14)', borderRadius: 99, padding: '1px 7px' }}>✓ Registrado</span>}
                    {selStage && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, color: '#C4B5FD' }}>
                        <img src={selStage.img} alt="" style={{ width: 18, height: 11, objectFit: 'cover', borderRadius: 3, opacity: 0.85 }} onError={e => { e.target.style.display = 'none'; }} />
                        {selStage.name}
                      </span>
                    )}
                  </div>
                  {games.length > 1 && (
                    <button onClick={() => removeGame(idx)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1 }}>×</button>
                  )}
                </div>

                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* ── Winner buttons ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { id: p1Id, name: p1Name, char: p1Char, isWon: p1Won },
                      { id: p2Id, name: p2Name, char: p2Char, isWon: p2Won },
                    ].map(({ id, name, char, isWon }) => (
                      <button
                        key={id || name}
                        className="mm-win-btn"
                        onClick={() => updateGame(idx, 'winnerId', isWon ? null : id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 11, cursor: 'pointer', border: `1px solid ${isWon ? 'rgba(34,197,94,0.55)' : 'rgba(255,255,255,0.08)'}`, background: isWon ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.04)', fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 12, color: isWon ? '#4ADE80' : 'rgba(255,255,255,0.5)', transition: 'all 0.15s', textAlign: 'left' }}
                      >
                        {char
                          ? <img src={`/images/characters/${char.img}`} alt={char.name} style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                          : <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.06)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>?</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                          {isWon && <div style={{ fontSize: 9, color: '#4ADE80', fontWeight: 700, marginTop: 2 }}>🏆 Ganador</div>}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* ── Character pickers ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { field: 'char0', label: p1Name, char: p1Char, hist: p1Hist, persisted: p1History },
                      { field: 'char1', label: p2Name, char: p2Char, hist: p2Hist, persisted: p2History },
                    ].map(({ field, label, char, hist, persisted }) => {
                      // Combinar historial del match actual + historial persistente (sin duplicados)
                      const mergedSuggestions = [...new Set([...hist, ...persisted])];
                      return (
                      <div key={field}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
                        <div style={{ marginBottom: hist.length ? 6 : 0 }}>
                          <CharacterPicker value={game[field]} onChange={val => updateGame(idx, field, val)} suggestions={mergedSuggestions} />
                        </div>
                        {/* ── History chips ── */}
                        {hist.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'Outfit, sans-serif' }}>Usados:</span>
                            {hist.map(cId => {
                              const hc = charById[cId];
                              if (!hc) return null;
                              const isCurr = game[field] === cId;
                              return (
                                <button
                                  key={cId}
                                  title={hc.name}
                                  onClick={() => updateGame(idx, field, cId)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px 2px 3px', background: isCurr ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isCurr ? 'rgba(124,58,237,0.45)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 99, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: 10, fontWeight: 700, color: isCurr ? '#C4B5FD' : 'rgba(255,255,255,0.38)' }}
                                >
                                  <img src={`/images/characters/${hc.img}`} alt={hc.name} style={{ width: 16, height: 16, objectFit: 'contain', borderRadius: 3 }} onError={e => { e.target.style.display = 'none'; }} />
                                  {hc.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* ── Stage picker ── */}
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', marginBottom: 7 }}>Stage</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {TOURNAMENT_STAGES.map(s => {
                        const isSel = game.stageId === s.id;
                        return (
                          <button
                            key={s.id}
                            className="mm-stage-btn"
                            onClick={() => updateGame(idx, 'stageId', isSel ? '' : s.id)}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '5px 7px', borderRadius: 9, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: 10, fontWeight: 700, background: isSel ? 'rgba(124,58,237,0.22)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isSel ? 'rgba(124,58,237,0.55)' : 'rgba(255,255,255,0.07)'}`, color: isSel ? '#C4B5FD' : 'rgba(255,255,255,0.42)', transition: 'all 0.12s' }}
                          >
                            <img src={s.img} alt={s.name} style={{ width: 48, height: 27, objectFit: 'cover', borderRadius: 5, opacity: isSel ? 1 : 0.55 }} onError={e => { e.target.style.display = 'none'; }} />
                            <span style={{ whiteSpace: 'nowrap' }}>{s.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add game */}
          {games.length < maxGames && !overallWinnerId && (
            <button
              className="mm-addgame"
              onClick={addGame}
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.28)', transition: 'all 0.15s' }}
            >
              + Agregar juego
            </button>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{ padding: '10px 14px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          {/* Confirm reset */}
          {confirmReset ? (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.28)', borderRadius: 12, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#F87171' }}>⚠️ ¿Cancelar el match? Esto lo reseteará en Start.GG y se perderá el progreso.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  style={{ flex: 1, padding: '8px', borderRadius: 9, cursor: resetting ? 'not-allowed' : 'pointer', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#F87171', fontSize: 12, fontWeight: 800, fontFamily: 'Outfit, sans-serif', opacity: resetting ? 0.5 : 1 }}
                >
                  {resetting ? '…' : 'Sí, cancelar'}
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  style={{ flex: 1, padding: '8px', borderRadius: 9, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}
                >
                  Volver
                </button>
              </div>
            </div>
          ) : (
            <>
              {error      && <p style={{ margin: 0, fontSize: 11, color: '#F87171', fontWeight: 700 }}>{error}</p>}
              {successMsg && <p style={{ margin: 0, fontSize: 11, color: '#4ADE80', fontWeight: 700, animation: 'mmPulse 1.5s ease-in-out' }}>{successMsg}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  title="Cancelar match (reset en Start.GG)"
                  onClick={() => setConfirmReset(true)}
                  style={{ padding: '10px 13px', borderRadius: 12, cursor: 'pointer', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', color: 'rgba(239,68,68,0.65)', fontSize: 13, fontFamily: 'Outfit, sans-serif', flexShrink: 0 }}
                >
                  🗑️
                </button>
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  style={{ flex: 1, padding: '10px', borderRadius: 12, cursor: saving ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 800, fontFamily: 'Outfit, sans-serif', opacity: saving ? 0.55 : 1 }}
                >
                  {saving ? '…' : '💾 Guardar progreso'}
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving || !overallWinnerId}
                  style={{ flex: 1, padding: '10px', borderRadius: 12, cursor: (saving || !overallWinnerId) ? 'not-allowed' : 'pointer', background: overallWinnerId ? 'linear-gradient(135deg,#7C3AED,#6D28D9)' : 'rgba(255,255,255,0.04)', border: `1px solid ${overallWinnerId ? 'rgba(124,58,237,0.55)' : 'rgba(255,255,255,0.08)'}`, color: overallWinnerId ? '#fff' : 'rgba(255,255,255,0.22)', fontSize: 12, fontWeight: 800, fontFamily: 'Outfit, sans-serif', opacity: saving ? 0.55 : 1 }}
                >
                  {saving ? '…' : '🏆 Enviar resultado'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


function MatchCard({ set, assignedSets, draggedSet, onDragStart, onDragEnd, TEST_SETUPS, sStyle, lockedSets, toggleLock, onAssignToSetup, tournamentStarted, onOpenAssignModal, onManageClick }) {
  const isDone     = set.stateLabel === 'COMPLETED';
  const isBye      = set.stateLabel === 'BYE';
  const isActive   = set.stateLabel === 'ACTIVE' || set.stateLabel === 'CALLED';
  const isDragging = draggedSet?.id === set.id;
  const aSetup     = TEST_SETUPS?.find(s => assignedSets?.[s.id]?.id === set.id);
  const sc         = sStyle[set.stateLabel] || sStyle.CREATED || SET_STATE_STYLE_DEFAULT.CREATED;
  const slots      = set.slots || [];
  const p1Won      = isDone && slots[0]?.placement === 1;
  const p2Won      = isDone && slots[1]?.placement === 1;
  const isLocked   = !isDone && !isBye && !!(lockedSets && lockedSets[set.id]);
  const lockRemaining = isLocked ? Math.max(0, Math.ceil((lockedSets[set.id] - Date.now()) / 1000)) : 0;

  return (
    <div
      className="bset"
      draggable={!isDone && !isBye && !isLocked}
      onDragStart={!isDone && !isBye && !isLocked ? e => onDragStart(set, e) : undefined}
      onDragEnd={!isDone && !isBye ? onDragEnd : undefined}
      onClick={!isBye && onManageClick ? (e) => {
        if (!e.target.closest('button') && !e.target.closest('.assign-dropdown-wrap')) {
          onManageClick(set);
        }
      } : undefined}
      style={{
        background: isActive ? 'rgba(255,140,0,0.06)' : isDone ? 'rgba(255,255,255,0.025)' : '#13131E',
        border: `1px solid ${aSetup ? aSetup.color + '66' : isActive ? 'rgba(255,140,0,0.4)' : isDone ? 'rgba(255,255,255,0.05)' : isLocked ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.09)'}`,
        borderRadius: 10,
        opacity: isDragging ? 0.35 : 1,
        cursor: isBye ? 'default' : isLocked ? 'not-allowed' : 'pointer',
        overflow: 'hidden',
        boxShadow: isActive ? '0 0 0 1px rgba(255,140,0,0.2), 0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'opacity 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 8px', background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize: 8, fontWeight: 900, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text, borderRadius: 99, padding: '1px 6px', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.04em' }}>
          {set.stateLabel}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {aSetup && (
            <span style={{ fontSize: 8, fontWeight: 800, color: aSetup.color, background: aSetup.color + '18', border: `1px solid ${aSetup.color}44`, borderRadius: 99, padding: '1px 5px', fontFamily: 'Outfit, sans-serif' }}>
              {aSetup.icon} {aSetup.label}
            </span>
          )}
          {!isDone && !isBye && !aSetup && toggleLock && (
            <button
              onClick={e => toggleLock(set.id, e)}
              title={isLocked ? 'Clic para desbloquear' : 'Clic para bloquear 1 minuto'}
              style={{ background: isLocked ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isLocked ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 6, padding: '2px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, color: isLocked ? '#F87171' : 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'Outfit, sans-serif', flexShrink: 0, lineHeight: 1 }}
            >
              {isLocked ? '🔒' : '🔓'}
              {isLocked && <span style={{ fontSize: 9, fontWeight: 800 }}>{lockRemaining}s</span>}
            </button>
          )}
        </div>
      </div>
      {[{ p: slots[0]?.entrant, pw: p1Won, score: slots[0]?.score }, { p: slots[1]?.entrant, pw: p2Won, score: slots[1]?.score }].map(({ p, pw, score }, i) => {
        const lost = isDone && !pw && p?.name && p.name !== 'TBD';
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: pw ? 'rgba(34,197,94,0.07)' : lost ? 'rgba(0,0,0,0.1)' : 'transparent', borderBottom: i === 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <span style={{ flex: 1, fontSize: 11, fontWeight: pw ? 800 : 600, color: pw ? '#fff' : lost ? 'rgba(255,255,255,0.28)' : p?.name ? '#D1D5DB' : 'rgba(255,255,255,0.22)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Outfit, sans-serif', textDecoration: lost ? 'line-through' : 'none' }}>
              {p?.name || 'TBD'}
            </span>
            {score != null && <span style={{ fontSize: 12, fontWeight: 900, color: pw ? '#4ADE80' : 'rgba(255,255,255,0.28)', flexShrink: 0, fontFamily: 'Outfit, sans-serif', minWidth: 12, textAlign: 'right' }}>{score}</span>}
            {pw && !isBye && <span style={{ fontSize: 9, flexShrink: 0 }}>🏆</span>}
          </div>
        );
      })}
      {/* Botón para abrir modal de asignación (solo mobile) */}
      {!isDone && !isBye && !isLocked && onOpenAssignModal && TEST_SETUPS?.length > 0 && (
        <div className="assign-dropdown-wrap" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={e => { e.stopPropagation(); if (tournamentStarted) onOpenAssignModal(set, aSetup); }}
            style={{ width: '100%', background: 'none', border: 'none', padding: '7px 8px', cursor: tournamentStarted ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'Outfit, sans-serif', opacity: tournamentStarted ? 1 : 0.4 }}
          >
            {aSetup
              ? <span style={{ fontSize: 10, fontWeight: 700, color: aSetup.color }}>{aSetup.icon} {aSetup.label} — cambiar ›</span>
              : <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,140,0,0.75)' }}>📍 Enviar a setup ›</span>
            }
          </button>
        </div>
      )}
    </div>
  );
}

function RoundCol({ roundName, sets, accentColor, lockedSets, toggleLock, ...matchProps }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 210 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: accentColor + '12', border: `1px solid ${accentColor}28`, borderRadius: 9 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 900, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Outfit, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{roundName}</span>
      </div>
      {sets.map(set => <MatchCard key={set.id} set={set} lockedSets={lockedSets} toggleLock={toggleLock} {...matchProps} />)}
    </div>
  );
}

function BracketInner({ bracketSets, assignedSets, draggedSet, onDragStart, onDragEnd, TEST_SETUPS, SET_STATE_STYLE: extStyle, lockedSets, toggleLock, onAssignToSetup, tournamentStarted }) {
  if (!Array.isArray(bracketSets) || bracketSets.length === 0) return null;

  const [modalSet, setModalSet] = useState(null);   // set que se va a asignar
  const [modalCurrentSetup, setModalCurrentSetup] = useState(null);
  const [manageSet, setManageSet] = useState(null); // set para gestión de resultado

  const handleOpenModal = useCallback((set, currentSetup) => {
    setModalSet(set);
    setModalCurrentSetup(currentSetup || null);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalSet(null);
    setModalCurrentSetup(null);
  }, []);

  const handleAssign = useCallback((setupId) => {
    if (modalSet && onAssignToSetup) onAssignToSetup(modalSet, setupId);
    handleCloseModal();
  }, [modalSet, onAssignToSetup, handleCloseModal]);

  const sStyle = extStyle || SET_STATE_STYLE_DEFAULT;
  const matchProps = { assignedSets, draggedSet, onDragStart, onDragEnd, TEST_SETUPS, sStyle, lockedSets, toggleLock, onAssignToSetup, tournamentStarted, onOpenAssignModal: handleOpenModal, onManageClick: setManageSet };

  // Agrupar por ronda y ordenar
  const roundsMap = {};
  for (const set of bracketSets) {
    const r = set.round || 'Sin ronda';
    if (!roundsMap[r]) roundsMap[r] = [];
    roundsMap[r].push(set);
  }
  const allRounds = Object.keys(roundsMap).sort((a, b) => getRoundPriority(a) - getRoundPriority(b));

  const isLosersRound  = n => n.toLowerCase().includes('losers');
  const isWinnersRound = n => n.toLowerCase().includes('winners');
  const isFinalsRound  = n => n.toLowerCase().includes('grand');

  const winnersRounds = allRounds.filter(r => isWinnersRound(r) && !isFinalsRound(r));
  const losersRounds  = allRounds.filter(r => isLosersRound(r)  && !isFinalsRound(r));
  const finalsRounds  = allRounds.filter(r => isFinalsRound(r));
  const otherRounds   = allRounds.filter(r => !isWinnersRound(r) && !isLosersRound(r) && !isFinalsRound(r));

  return (
    <>
    <div style={{ overflowX: 'auto', overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', maxHeight: '100%', minHeight: 0, paddingBottom: 8 }}>
      <div style={{ minWidth: 'max-content', padding: '4px 2px 8px', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ── WINNERS ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: 'Outfit, sans-serif', flexShrink: 0 }}>🏆 Winners Bracket</span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(96,165,250,0.35), transparent)' }} />
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
          {[...winnersRounds, ...otherRounds].map(r => (
            <RoundCol key={r} roundName={r} sets={roundsMap[r]} accentColor="#60A5FA" {...matchProps} />
          ))}
          {finalsRounds.map(r => (
            <RoundCol key={r} roundName={r} sets={roundsMap[r]} accentColor="#FF8C00" {...matchProps} />
          ))}
        </div>

        {/* ── DIVISOR ── */}
        {losersRounds.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 900, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.14em', fontFamily: 'Outfit, sans-serif', flexShrink: 0 }}>💀 Losers Bracket</span>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(167,139,250,0.35), transparent)' }} />
            </div>

            {/* ── LOSERS ── */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {losersRounds.map(r => (
                <RoundCol key={r} roundName={r} sets={roundsMap[r]} accentColor="#A78BFA" {...matchProps} />
              ))}
            </div>
          </>
        )}

      </div>
    </div>

    {/* ── MODAL ASIGNAR SETUP (mobile) ── */}
    {modalSet && (
      <div
        onClick={handleCloseModal}
        style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 480, background: '#111827', borderRadius: '20px 20px 0 0', padding: '0 0 max(16px, env(safe-area-inset-bottom)) 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 40px rgba(0,0,0,0.6)' }}
        >
          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.15)' }} />
          </div>

          {/* Header */}
          <div style={{ padding: '8px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ margin: 0, fontWeight: 900, fontSize: 15, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
              Asignar a setup
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'Outfit, sans-serif' }}>
              {(modalSet.slots || []).map(s => s?.entrant?.name).filter(Boolean).join(' vs ') || 'Partido'}
              {modalSet.round ? ` · ${modalSet.round}` : ''}
            </p>
          </div>

          {/* Lista de setups en columna */}
          <div style={{ overflowY: 'auto', padding: '10px 16px 6px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(TEST_SETUPS || []).map(s => {
              const isCurrent = modalCurrentSetup?.id === s.id;
              // Occupied = otro match (distinto al que estamos asignando) ya está en este setup
              const occupant = assignedSets?.[s.id];
              const isOccupied = occupant && occupant.id !== modalSet?.id;
              const occupantName = isOccupied
                ? (occupant.slots || []).map(sl => sl?.entrant?.name).filter(Boolean).join(' vs ') || 'Partido en curso'
                : null;
              return (
                <button
                  key={s.id}
                  disabled={isOccupied}
                  onClick={() => !isOccupied && handleAssign(s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: isCurrent ? s.color + '22' : isOccupied ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isCurrent ? s.color + '88' : isOccupied ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.09)'}`,
                    borderRadius: 14, padding: '13px 16px',
                    cursor: isOccupied ? 'not-allowed' : 'pointer',
                    fontFamily: 'Outfit, sans-serif', width: '100%', textAlign: 'left',
                    transition: 'background .12s',
                    opacity: isOccupied ? 0.5 : 1,
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: s.color + (isOccupied ? '10' : '20'), border: `1px solid ${s.color}${isOccupied ? '22' : '44'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {isOccupied ? '🔒' : s.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 800, color: isCurrent ? s.color : isOccupied ? 'rgba(255,255,255,0.3)' : '#E5E7EB' }}>
                      {s.label}
                    </span>
                    {isOccupied && (
                      <span style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 500, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {occupantName}
                      </span>
                    )}
                  </div>
                  {isCurrent && (
                    <span style={{ fontSize: 12, fontWeight: 800, color: s.color, background: s.color + '18', border: `1px solid ${s.color}44`, borderRadius: 99, padding: '3px 10px', flexShrink: 0 }}>
                      actual
                    </span>
                  )}
                  {isOccupied && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 99, padding: '3px 10px', flexShrink: 0 }}>
                      ocupado
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Cancelar */}
          <div style={{ padding: '10px 16px 4px' }}>
            <button
              onClick={handleCloseModal}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: '13px', color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── MODAL GESTIÓN DE RESULTADO ── */}
    {manageSet && (
      <MatchManageModal set={manageSet} onClose={() => setManageSet(null)} />
    )}
    </>
  );
}

export default function TournamentBracket(props) {
  return (
    <BracketErrorBoundary>
      <BracketInner {...props} />
    </BracketErrorBoundary>
  );
}

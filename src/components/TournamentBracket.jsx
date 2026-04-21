import { Component, useState, useCallback } from 'react';
import { CHARACTERS } from '../../lib/characters';

const TOURNAMENT_STAGES = [
  { id: 'battlefield',       name: 'Battlefield' },
  { id: 'small-battlefield', name: 'Small Battlefield' },
  { id: 'final-destination', name: 'Final Destination' },
  { id: 'pokemon-stadium-2', name: 'Pokémon Stadium 2' },
  { id: 'smashville',        name: 'Smashville' },
  { id: 'town-and-city',     name: 'Town & City' },
  { id: 'kalos',             name: 'Kalos' },
  { id: 'hollow-bastion',    name: 'Hollow Bastion' },
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

function MatchManageModal({ set, onClose }) {
  const slots = set?.slots || [];
  const p1Entrant = slots[0]?.entrant || null;
  const p2Entrant = slots[1]?.entrant || null;
  const p1Id   = p1Entrant?.id ? String(p1Entrant.id) : null;
  const p2Id   = p2Entrant?.id ? String(p2Entrant.id) : null;
  const p1Name = p1Entrant?.name || 'Jugador 1';
  const p2Name = p2Entrant?.name || 'Jugador 2';
  const maxGames = set?.totalGames || 5;
  const winsNeeded = Math.ceil((maxGames + 1) / 2);

  const [games, setGames] = useState([
    { gameNum: 1, winnerId: null, char0: '', char1: '', stageId: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const p1Score = games.filter(g => g.winnerId === p1Id).length;
  const p2Score = games.filter(g => g.winnerId === p2Id).length;
  const overallWinnerId = p1Score >= winsNeeded ? p1Id : p2Score >= winsNeeded ? p2Id : null;

  const updateGame = (idx, field, val) =>
    setGames(prev => prev.map((g, i) => i === idx ? { ...g, [field]: val } : g));

  const addGame = () => {
    if (games.length >= maxGames) return;
    setGames(prev => [...prev, { gameNum: prev.length + 1, winnerId: null, char0: '', char1: '', stageId: '' }]);
  };

  const removeGame = (idx) =>
    setGames(prev => prev.filter((_, i) => i !== idx).map((g, i) => ({ ...g, gameNum: i + 1 })));

  const handleSave = async (isFinal) => {
    setSaving(true); setError(null); setSuccessMsg(null);
    try {
      const gamesWithWinner = games.filter(g => g.winnerId);
      const gameData = gamesWithWinner.map((g, i) => ({
        gameNum: i + 1,
        winnerId: g.winnerId,
        char1Slug:    g.char0 || null,
        char2Slug:    g.char1 || null,
        p1EntrantId:  p1Id,
        p2EntrantId:  p2Id,
        stageId:      g.stageId || null,
      }));
      const r = await fetch('/api/tournaments/report-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId: set.id, winnerId: isFinal ? overallWinnerId : null, gameData }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error al guardar');
      setSuccessMsg(isFinal ? '✅ Resultado enviado a Start.GG' : '✅ Progreso guardado');
      if (isFinal) setTimeout(onClose, 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const selectStyle = {
    width: '100%',
    background: '#1a1a2e',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '6px 8px',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontFamily: 'Outfit, sans-serif',
    cursor: 'pointer',
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 580, maxHeight: '90vh', background: '#0F0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.85)', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{set?.round || 'Gestionar partido'}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#fff', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p1Name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: p1Score > p2Score ? '#4ADE80' : p1Score === p2Score && p1Score === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.5)' }}>{p1Score}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>—</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: p2Score > p1Score ? '#4ADE80' : p1Score === p2Score && p2Score === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.5)' }}>{p2Score}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#fff', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p2Name}</span>
            </div>
            {overallWinnerId && (
              <p style={{ margin: '5px 0 0', fontSize: 12, color: '#4ADE80', fontWeight: 700 }}>🏆 {overallWinnerId === p1Id ? p1Name : p2Name} gana la serie</p>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {games.map((game, idx) => (
            <div key={idx} style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${game.winnerId ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Juego {game.gameNum}</span>
                {games.length > 1 && (
                  <button onClick={() => removeGame(idx)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}>×</button>
                )}
              </div>

              {/* Winner */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {[{ id: p1Id, name: p1Name }, { id: p2Id, name: p2Name }].map(({ id, name }) => (
                  <button
                    key={id || name}
                    onClick={() => updateGame(idx, 'winnerId', game.winnerId === id ? null : id)}
                    style={{ flex: 1, padding: '7px 10px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 12, transition: 'all 0.12s', background: game.winnerId === id ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.04)', border: `1px solid ${game.winnerId === id ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.08)'}`, color: game.winnerId === id ? '#4ADE80' : 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {game.winnerId === id ? '🏆 ' : ''}{name}
                  </button>
                ))}
              </div>

              {/* Characters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                {[{ field: 'char0', label: p1Name }, { field: 'char1', label: p2Name }].map(({ field, label }) => (
                  <div key={field}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
                    <select value={game[field]} onChange={e => updateGame(idx, field, e.target.value)} style={selectStyle}>
                      <option value="">— personaje</option>
                      {CHARACTERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Stage */}
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>Stage</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {TOURNAMENT_STAGES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => updateGame(idx, 'stageId', game.stageId === s.id ? '' : s.id)}
                      style={{ padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: 11, fontWeight: 700, transition: 'all 0.12s', background: game.stageId === s.id ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.04)', border: `1px solid ${game.stageId === s.id ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.07)'}`, color: game.stageId === s.id ? '#C4B5FD' : 'rgba(255,255,255,0.4)' }}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {games.length < maxGames && (
            <button
              onClick={addGame}
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}
            >
              + Agregar juego
            </button>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          {error      && <p style={{ margin: 0, fontSize: 11, color: '#F87171', fontWeight: 700 }}>{error}</p>}
          {successMsg && <p style={{ margin: 0, fontSize: 11, color: '#4ADE80', fontWeight: 700 }}>{successMsg}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              style={{ flex: 1, padding: '10px', borderRadius: 12, cursor: saving ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 800, fontFamily: 'Outfit, sans-serif', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? '…' : '💾 Guardar progreso'}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || !overallWinnerId}
              style={{ flex: 1, padding: '10px', borderRadius: 12, cursor: (saving || !overallWinnerId) ? 'not-allowed' : 'pointer', background: overallWinnerId ? 'linear-gradient(135deg,#7C3AED,#6D28D9)' : 'rgba(255,255,255,0.04)', border: `1px solid ${overallWinnerId ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.08)'}`, color: overallWinnerId ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 800, fontFamily: 'Outfit, sans-serif', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? '…' : '🏆 Enviar resultado'}
            </button>
          </div>
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

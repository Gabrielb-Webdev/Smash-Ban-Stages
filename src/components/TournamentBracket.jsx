import { Component } from 'react';

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

function MatchCard({ set, assignedSets, draggedSet, onDragStart, onDragEnd, TEST_SETUPS, sStyle, lockedSets, toggleLock }) {
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
      style={{
        background: isActive ? 'rgba(255,140,0,0.06)' : isDone ? 'rgba(255,255,255,0.025)' : '#13131E',
        border: `1px solid ${aSetup ? aSetup.color + '66' : isActive ? 'rgba(255,140,0,0.4)' : isDone ? 'rgba(255,255,255,0.05)' : isLocked ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.09)'}`,
        borderRadius: 10,
        opacity: isDragging ? 0.35 : 1,
        cursor: isDone || isBye ? 'default' : isLocked ? 'not-allowed' : 'grab',
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

function BracketInner({ bracketSets, assignedSets, draggedSet, onDragStart, onDragEnd, TEST_SETUPS, SET_STATE_STYLE: extStyle, lockedSets, toggleLock }) {
  if (!Array.isArray(bracketSets) || bracketSets.length === 0) return null;

  const sStyle = extStyle || SET_STATE_STYLE_DEFAULT;
  const matchProps = { assignedSets, draggedSet, onDragStart, onDragEnd, TEST_SETUPS, sStyle, lockedSets, toggleLock };

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
    <div style={{ overflowX: 'auto', overflowY: 'visible', WebkitOverflowScrolling: 'touch', paddingBottom: 8 }}>
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
  );
}

export default function TournamentBracket(props) {
  return (
    <BracketErrorBoundary>
      <BracketInner {...props} />
    </BracketErrorBoundary>
  );
}

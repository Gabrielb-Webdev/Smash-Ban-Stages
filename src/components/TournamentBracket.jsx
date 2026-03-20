import { Component } from 'react';

const SET_STATE_STYLE = {
  COMPLETED:  { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)',   text: '#4ADE80'  },
  ACTIVE:     { bg: 'rgba(255,140,0,0.15)',    border: 'rgba(255,140,0,0.4)',   text: '#FF8C00'  },
  CALLED:     { bg: 'rgba(255,140,0,0.15)',    border: 'rgba(255,140,0,0.4)',   text: '#FF8C00'  },
  BYE:        { bg: 'rgba(255,255,255,0.06)',  border: 'rgba(255,255,255,0.12)', text: '#9CA3AF' },
  CREATED:    { bg: 'rgba(255,255,255,0.04)',  border: 'rgba(255,255,255,0.10)', text: '#6B7280' },
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

function BracketInner({ bracketSets, assignedSets, draggedSet, onDragStart, onDragEnd, TEST_SETUPS, SET_STATE_STYLE: extStyle }) {
  if (!Array.isArray(bracketSets) || bracketSets.length === 0) return null;

  // Agrupar por ronda
  const roundsMap = {};
  for (const set of bracketSets) {
    const r = set.round || 'Ronda 1';
    if (!roundsMap[r]) roundsMap[r] = [];
    roundsMap[r].push(set);
  }
  const rounds = Object.keys(roundsMap);

  return (
    <div style={{ overflowX: 'auto', overflowY: 'visible', WebkitOverflowScrolling: 'touch', paddingBottom: 8 }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', minWidth: 'max-content', padding: '4px 4px 4px' }}>
        {rounds.map(round => (
          <div key={round} style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 210 }}>
            {/* Header de ronda */}
            <div style={{ background: '#0D0D1B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 12px', textAlign: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Outfit, sans-serif' }}>{round}</span>
            </div>
            {/* Matches de esta ronda */}
            {roundsMap[round].map(set => {
              const isDone     = set.stateLabel === 'COMPLETED';
              const isBye      = set.stateLabel === 'BYE';
              const isActive   = set.stateLabel === 'ACTIVE' || set.stateLabel === 'CALLED';
              const isDragging = draggedSet?.id === set.id;
              const aSetup     = TEST_SETUPS?.find(s => assignedSets?.[s.id]?.id === set.id);
              const sc         = (extStyle || SET_STATE_STYLE)[set.stateLabel] || SET_STATE_STYLE.CREATED;
              const slots      = set.slots || [];
              const p1         = slots[0]?.entrant;
              const p2         = slots[1]?.entrant;
              const p1Won      = isDone && slots[0]?.placement === 1;
              const p2Won      = isDone && slots[1]?.placement === 1;

              return (
                <div
                  key={set.id}
                  draggable={!isDone && !isBye}
                  onDragStart={!isDone && !isBye ? e => onDragStart(set, e) : undefined}
                  onDragEnd={!isDone && !isBye ? onDragEnd : undefined}
                  style={{
                    background: isActive ? 'rgba(255,140,0,0.06)' : isDone ? 'rgba(255,255,255,0.025)' : '#13131E',
                    border: `1px solid ${aSetup ? aSetup.color + '66' : isActive ? 'rgba(255,140,0,0.4)' : 'rgba(255,255,255,0.09)'}`,
                    borderRadius: 10,
                    opacity: isDragging ? 0.35 : 1,
                    cursor: isDone || isBye ? 'default' : 'grab',
                    overflow: 'hidden',
                    boxShadow: isActive ? '0 0 0 1px rgba(255,140,0,0.2), 0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.3)',
                    transition: 'opacity 0.15s',
                  }}
                >
                  {/* Badge header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 8px', background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: 8, fontWeight: 900, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text, borderRadius: 99, padding: '1px 6px', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.04em' }}>
                      {set.stateLabel}
                    </span>
                    {aSetup && (
                      <span style={{ fontSize: 8, fontWeight: 800, color: aSetup.color, background: aSetup.color + '18', border: `1px solid ${aSetup.color}44`, borderRadius: 99, padding: '1px 5px', fontFamily: 'Outfit, sans-serif' }}>
                        {aSetup.icon} {aSetup.label}
                      </span>
                    )}
                  </div>
                  {/* Jugador 1 */}
                  {[{ p: p1, pw: p1Won, sc1: slots[0]?.score }, { p: p2, pw: p2Won, sc1: slots[1]?.score }].map(({ p, pw, sc1 }, i) => {
                    const lost = isDone && !pw && p?.name && p.name !== 'TBD';
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: pw ? 'rgba(34,197,94,0.07)' : lost ? 'rgba(0,0,0,0.1)' : 'transparent', borderBottom: i === 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <span style={{ flex: 1, fontSize: 11, fontWeight: pw ? 800 : 600, color: pw ? '#fff' : lost ? 'rgba(255,255,255,0.28)' : p?.name ? '#D1D5DB' : 'rgba(255,255,255,0.22)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Outfit, sans-serif', textDecoration: lost ? 'line-through' : 'none' }}>
                          {p?.name || 'TBD'}
                        </span>
                        {sc1 != null && <span style={{ fontSize: 12, fontWeight: 900, color: pw ? '#4ADE80' : 'rgba(255,255,255,0.28)', flexShrink: 0, fontFamily: 'Outfit, sans-serif', minWidth: 12, textAlign: 'right' }}>{sc1}</span>}
                        {pw && !isBye && <span style={{ fontSize: 9, flexShrink: 0 }}>ðŸ†</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
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

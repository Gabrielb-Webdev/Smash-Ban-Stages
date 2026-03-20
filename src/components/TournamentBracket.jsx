import { Component } from 'react';
import {
  SingleEliminationBracket,
  SVGViewer,
  createTheme,
} from '@g-loot/react-tournament-brackets';

const DARK_THEME = createTheme({
  textColor: { main: '#E5E7EB', highlighted: '#ffffff', dark: 'rgba(255,255,255,0.45)' },
  matchBackground: { wonColor: '#0E2415', lostColor: '#13131E' },
  score: {
    background: { wonColor: '#174D22', lostColor: '#1a1a2a' },
    text: { highlightedWonColor: '#4ADE80', highlightedLostColor: 'rgba(255,255,255,0.35)' },
  },
  border: { color: 'rgba(255,255,255,0.09)', highlightedColor: 'rgba(255,140,0,0.65)' },
  roundHeaders: { background: '#0D0D1B', fontColor: '#888888', fontSize: 11 },
  connectorColor: 'rgba(255,255,255,0.14)',
  connectorColorHighlight: '#FF8C00',
  svgBackground: '#0B0B12',
});

const SET_STATES_MAP = {
  COMPLETED: 'DONE',
  ACTIVE: 'IN_PROGRESS',
  CALLED: 'IN_PROGRESS',
  BYE: 'WALK_OVER',
  CREATED: 'SCHEDULED',
};

// Error boundary para capturar crashes de la librería
class BracketErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 14, padding: '24px 20px', textAlign: 'center',
        }}>
          <p style={{ color: '#F87171', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Error al renderizar el bracket</p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function makeTwoParticipants(participants, setId) {
  const result = [...(Array.isArray(participants) ? participants : [])];
  while (result.length < 2) {
    result.push({
      id: `tbd-${setId}-${result.length}`,
      name: 'TBD',
      isWinner: false,
      resultText: null,
      status: null,
    });
  }
  return result.slice(0, 2);
}

function BracketInner({
  bracketSets,
  assignedSets,
  draggedSet,
  onDragStart,
  onDragEnd,
  TEST_SETUPS,
  SET_STATE_STYLE,
}) {
  if (!Array.isArray(bracketSets) || bracketSets.length === 0) return null;

  const matches = bracketSets.map(set => ({
    id: set.id,
    nextMatchId: set.nextMatchId ?? null,
    nextLooserMatchId: set.nextLooserMatchId ?? null,
    tournamentRoundText: set.round || '',
    startTime: '',
    state: SET_STATES_MAP[set.stateLabel] || 'SCHEDULED',
    participants: makeTwoParticipants(
      (set.slots || []).map((slot, i) => ({
        id: String(slot?.entrant?.id ?? `tbd-${set.id}-${i}`),
        name: slot?.entrant?.name || 'TBD',
        isWinner: set.stateLabel === 'COMPLETED' && slot?.placement === 1,
        resultText:
          (set.stateLabel === 'COMPLETED' || set.stateLabel === 'ACTIVE') && slot?.score != null
            ? String(slot.score)
            : null,
        status: set.stateLabel === 'COMPLETED' ? 'PLAYED' : null,
      })),
      set.id,
    ),
  }));

  function MatchCard({ match, topParty, bottomParty, topWon, bottomWon }) {
    const set = bracketSets.find(s => s.id === String(match?.id));
    if (!set || !match) return null;

    const isDone     = set.stateLabel === 'COMPLETED';
    const isBye      = set.stateLabel === 'BYE';
    const isActive   = set.stateLabel === 'ACTIVE' || set.stateLabel === 'CALLED';
    const isDragging = draggedSet?.id === set.id;
    const aSetup     = TEST_SETUPS.find(s => assignedSets[s.id]?.id === set.id);
    const sc         = SET_STATE_STYLE[set.stateLabel] || SET_STATE_STYLE.CREATED;
    const parties    = [topParty, bottomParty];
    const wonArr     = [topWon, bottomWon];

    return (
      <div
        draggable={!isDone && !isBye}
        onDragStart={!isDone && !isBye ? e => onDragStart(set, e) : undefined}
        onDragEnd={!isDone && !isBye ? onDragEnd : undefined}
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          border: `1px solid ${
            aSetup      ? aSetup.color + '66'
            : isActive  ? 'rgba(255,140,0,0.4)'
            :             'rgba(255,255,255,0.09)'
          }`,
          borderRadius: 10, overflow: 'hidden',
          background: isDone   ? 'rgba(255,255,255,0.025)'
                    : isActive ? 'rgba(255,140,0,0.06)'
                    :            '#13131E',
          opacity: isDragging ? 0.35 : 1,
          cursor: isDone || isBye ? 'default' : 'grab',
          boxSizing: 'border-box',
          boxShadow: isActive ? '0 0 0 1px rgba(255,140,0,0.25), 0 4px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'opacity 0.15s',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '3px 7px', background: 'rgba(0,0,0,0.25)',
          borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0,
        }}>
          <span style={{
            fontSize: 8, fontWeight: 900,
            background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
            borderRadius: 99, padding: '1px 6px',
            fontFamily: 'Outfit, sans-serif', letterSpacing: '0.04em',
          }}>
            {set.stateLabel}
          </span>
          {aSetup && (
            <span style={{
              fontSize: 8, fontWeight: 800, color: aSetup.color,
              background: aSetup.color + '18', border: `1px solid ${aSetup.color}44`,
              borderRadius: 99, padding: '1px 5px', fontFamily: 'Outfit, sans-serif',
            }}>
              {aSetup.icon} {aSetup.label}
            </span>
          )}
        </div>

        {/* Participantes */}
        {parties.map((party, i) => {
          const won  = wonArr[i];
          const lost = isDone && !won && party?.name && party.name !== 'TBD';
          return (
            <div key={i} style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 5, padding: '4px 7px',
              background: won ? 'rgba(34,197,94,0.07)' : lost ? 'rgba(0,0,0,0.1)' : 'transparent',
              borderBottom: i === 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <span style={{
                flex: 1, fontSize: 11, fontWeight: won ? 800 : 600,
                color: won  ? '#fff'
                     : lost ? 'rgba(255,255,255,0.28)'
                     : party?.name === 'TBD' ? 'rgba(255,255,255,0.22)' : '#D1D5DB',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: 'Outfit, sans-serif',
                textDecoration: lost ? 'line-through' : 'none',
              }}>
                {party?.name || 'TBD'}
              </span>
              {party?.resultText != null && (
                <span style={{
                  fontSize: 12, fontWeight: 900,
                  color: won ? '#4ADE80' : 'rgba(255,255,255,0.28)',
                  flexShrink: 0, fontFamily: 'Outfit, sans-serif',
                  minWidth: 12, textAlign: 'right',
                }}>
                  {party.resultText}
                </span>
              )}
              {won && !isBye && <span style={{ fontSize: 9, flexShrink: 0 }}>🏆</span>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ background: '#0B0B12', borderRadius: 16, overflow: 'hidden' }}>
      <SingleEliminationBracket
        matches={matches}
        matchComponent={MatchCard}
        svgWrapper={({ children, ...props }) => (
          <SVGViewer
            background="#0B0B12"
            SVGBackground="#0B0B12"
            width={props.width}
            height={props.height}
            {...props}
          >
            {children}
          </SVGViewer>
        )}
        theme={DARK_THEME}
        options={{
          style: {
            roundHeader: {
              isShown: true,
              backgroundColor: '#0D0D1B',
              fontColor: '#888888',
              fontSize: 10,
            },
            connectorColor: 'rgba(255,255,255,0.14)',
            connectorColorHighlight: '#FF8C00',
            matchWidth: 220,
            matchHeight: 45,
            roundSeparatorWidth: 24,
          },
        }}
      />
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

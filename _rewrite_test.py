content = """\
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { getStoredUser, logout, verifySession } from '../../src/utils/auth';

const TOURNAMENT_SLUG = 'tournament/asd3';
const PHASE_GROUP_ID  = '3244687';
const BRACKET_URL     = 'https://www.start.gg/tournament/asd3/event/ultimate-singles/brackets/2237187/3244687';

const TEST_SETUPS = [
  { id: 'test-stream', label: 'Stream',  icon: '📡', color: '#DC2626' },
  { id: 'test-1',     label: 'Setup 1', icon: '🎮', color: '#7C3AED' },
  { id: 'test-2',     label: 'Setup 2', icon: '🎮', color: '#2563EB' },
];

const SET_STATE_STYLE = {
  CREATED:   { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)',  text: '#60A5FA' },
  ACTIVE:    { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.35)',   text: '#22C55E' },
  COMPLETED: { bg: 'rgba(107,114,128,0.1)',  border: 'rgba(107,114,128,0.2)',  text: '#6B7280' },
  BYE:       { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)', text: '#6B7280' },
  CALLED:    { bg: 'rgba(255,140,0,0.12)',   border: 'rgba(255,140,0,0.3)',    text: '#FF8C00' },
};

export default function TestAdminPage() {
  const router = useRouter();
  const [user, setUser]               = useState(null);
  const [checking, setChecking]       = useState(true);
  const [tournament, setTournament]   = useState(null);
  const [bracketSets, setBracketSets] = useState([]);
  const [phaseName, setPhaseName]     = useState('');
  const [bracketLoading, setBracketLoading] = useState(false);
  const [assignedSets, setAssignedSets] = useState({});
  const [draggedSet, setDraggedSet]   = useState(null);
  const [dragOverSetup, setDragOverSetup] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored?.access_token) { router.replace('/login'); return; }
    verifySession().then(data => {
      if (!data) { router.replace('/login'); return; }
      if (!data.isAdmin) { router.replace('/home'); return; }
      setUser(data.user);
      setChecking(false);
    });
  }, []);

  useEffect(() => {
    if (checking) return;
    fetch(`/api/tournaments/info?slug=${encodeURIComponent(TOURNAMENT_SLUG)}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setTournament(d); });
  }, [checking]);

  useEffect(() => {
    if (checking) return;
    setBracketLoading(true);
    fetch(`/api/tournaments/bracket?phaseGroupId=${PHASE_GROUP_ID}`)
      .then(r => r.json())
      .then(d => { if (d.sets) { setBracketSets(d.sets); setPhaseName(d.phaseName || ''); } })
      .finally(() => setBracketLoading(false));
  }, [checking]);

  useEffect(() => {
    function handleOut(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleOut);
    return () => document.removeEventListener('mousedown', handleOut);
  }, []);

  function handleLogout() { logout(); router.replace('/login'); }

  function onDragStart(set, e) { setDraggedSet(set); e.dataTransfer.effectAllowed = 'move'; }
  function onDragEnd() { setDraggedSet(null); setDragOverSetup(null); }
  function onDragOver(e, setupId) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverSetup(setupId); }
  function onDragLeave(e) { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverSetup(null); }
  function onDrop(e, setupId) {
    e.preventDefault();
    if (!draggedSet) return;
    setAssignedSets(prev => {
      const next = { ...prev };
      for (const k of Object.keys(next)) { if (next[k]?.id === draggedSet.id) delete next[k]; }
      next[setupId] = draggedSet;
      return next;
    });
    setDraggedSet(null); setDragOverSetup(null);
  }
  function removeAssignment(setupId) {
    setAssignedSets(prev => { const n = { ...prev }; delete n[setupId]; return n; });
  }

  const assignedSetIds = new Set(Object.values(assignedSets).filter(Boolean).map(s => s.id));
  const pendingSets    = bracketSets.filter(s => !assignedSetIds.has(s.id) && s.stateLabel !== 'COMPLETED' && s.stateLabel !== 'BYE');
  const completedSets  = bracketSets.filter(s => s.stateLabel === 'COMPLETED');

  if (checking) return (
    <div style={{ minHeight: '100vh', background: '#0B0B12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #FF8C00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{\`@keyframes spin{to{transform:rotate(360deg)}}\`}</style>
    </div>
  );

  const startDate = tournament?.startAt
    ? new Date(tournament.startAt).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <>
      <Head><title>Panel Test — Admin</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <style>{\`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0B0B12;font-family:'Outfit',sans-serif}
        @keyframes spin{to{transform:rotate(360deg)}}
        .set-card{transition:transform .15s,box-shadow .15s,opacity .15s;cursor:grab;user-select:none}
        .set-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.4)}
        .set-card.is-dragging{opacity:.35;transform:scale(.96);cursor:grabbing}
        .drop-zone{transition:background .15s,border-color .15s}
        .drop-zone.over{background:rgba(255,140,0,0.07)!important;border-color:rgba(255,140,0,0.45)!important}
        .btn-disabled{opacity:.4;cursor:not-allowed}
        @media(max-width:768px){.main-grid{grid-template-columns:1fr!important}}
      \`}</style>

      <div style={{ minHeight: '100vh', background: '#0B0B12', color: '#fff', fontFamily: "'Outfit', sans-serif" }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: 'rgba(11,11,18,0.95)', backdropFilter: 'blur(12px)', zIndex: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 19 }}>🧪</span>
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.5px' }}>Panel Test</span>
          </div>
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button onClick={() => setDropdownOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '6px 12px', cursor: 'pointer', color: '#fff', fontFamily: "'Outfit', sans-serif" }}>
              {user?.avatar ? <img src={user.avatar} alt={user.name} style={{ width: 26, height: 26, borderRadius: '50%' }} /> : <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#374151' }} />}
              <span style={{ fontSize: 13, color: '#D1D5DB' }}>{user?.name}</span>
              <svg width={10} height={10} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {dropdownOpen && (
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, width: 180, background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', fontSize: 13, color: '#D1D5DB', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)' }} onClick={() => setDropdownOpen(false)}>🎮 Panel Admin</Link>
                <Link href="/home" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', fontSize: 13, color: '#D1D5DB', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)' }} onClick={() => setDropdownOpen(false)}>🏠 Home</Link>
                <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', fontSize: 13, color: '#F87171', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: "'Outfit', sans-serif" }}>🚪 Salir</button>
              </div>
            )}
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="main-grid" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Torneo card */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden' }}>
              {tournament?.image
                ? <div style={{ height: 130, background: `url(${tournament.image}) center/cover no-repeat` }} />
                : <div style={{ height: 60, background: 'linear-gradient(135deg,rgba(255,140,0,0.08),rgba(232,80,0,0.04))' }} />}
              <div style={{ padding: '18px 18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                  <h3 style={{ fontWeight: 800, fontSize: 16, color: '#fff', lineHeight: 1.3 }}>{tournament?.name || 'Cargando...'}</h3>
                  <span style={{ flexShrink: 0, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', borderRadius: 99, padding: '2px 9px', fontSize: 10, fontWeight: 700 }}>{tournament?.stateLabel || 'CREATED'}</span>
                </div>
                {startDate && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>📅 {startDate}</p>}
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>👥 {tournament?.attendees ?? '—'} inscriptos</p>
                {tournament?.owner && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>🏷️ {tournament.owner}</p>}
                <button
                  disabled
                  title="Funcionalidad en desarrollo"
                  className="btn-disabled"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', color: '#fff', border: 'none', borderRadius: 13, padding: '12px 16px', fontWeight: 800, fontSize: 14, fontFamily: "'Outfit', sans-serif", marginBottom: 6 }}
                >
                  🚀 Iniciar torneo en Start.GG
                </button>
                <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Próximamente — en pruebas</p>
              </div>
            </div>

            {/* Setups (drop zones) */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Setups</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {TEST_SETUPS.map(setup => {
                  const assigned = assignedSets[setup.id];
                  const isOver   = dragOverSetup === setup.id;
                  return (
                    <div
                      key={setup.id}
                      className={\`drop-zone\${isOver ? ' over' : ''}\`}
                      onDragOver={e => onDragOver(e, setup.id)}
                      onDragLeave={onDragLeave}
                      onDrop={e => onDrop(e, setup.id)}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.09)', borderRadius: 16, padding: '13px 14px', minHeight: 68 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: assigned ? 10 : 0 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 9, background: `${setup.color}1A`, border: `1px solid ${setup.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{setup.icon}</div>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#E5E7EB' }}>{setup.label}</span>
                        {assigned && <button onClick={() => removeAssignment(setup.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>×</button>}
                      </div>
                      {assigned ? (
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '9px 11px' }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{assigned.round}</p>
                          {assigned.slots.map((slot, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: i === 0 ? 4 : 0 }}>
                              <div style={{ width: 17, height: 17, borderRadius: 5, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{i + 1}</div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: slot?.entrant ? '#fff' : 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slot?.entrant?.name || 'TBD'}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', textAlign: 'center', marginTop: 4 }}>Arrastrá un match aquí</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT — BRACKET */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: 19, color: '#fff', marginBottom: 2 }}>
                  🏆 Bracket {phaseName ? `— ${phaseName}` : '— Ultimate Singles'}
                </h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Arrastrá los matches a los setups de la izquierda</p>
              </div>
              <a href={BRACKET_URL} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#FF8C00', textDecoration: 'none', fontWeight: 700, flexShrink: 0 }}>Ver en start.gg →</a>
            </div>

            {bracketLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.35)', fontSize: 13, padding: '32px 0' }}>
                <div style={{ width: 20, height: 20, border: '2px solid #FF8C00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Cargando bracket desde start.gg...
              </div>
            ) : bracketSets.length === 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '40px 24px', textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No se encontraron sets en este bracket.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {pendingSets.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Pendientes <span style={{ opacity: 0.5 }}>({pendingSets.length})</span></p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
                      {pendingSets.map(set => <SetCard key={set.id} set={set} isDragging={draggedSet?.id === set.id} onDragStart={onDragStart} onDragEnd={onDragEnd} />)}
                    </div>
                  </div>
                )}
                {Object.keys(assignedSets).length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>En setup <span style={{ opacity: 0.5 }}>({Object.keys(assignedSets).length})</span></p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
                      {TEST_SETUPS.filter(s => assignedSets[s.id]).map(setup => (
                        <AssignedSetCard key={setup.id} set={assignedSets[setup.id]} setup={setup} />
                      ))}
                    </div>
                  </div>
                )}
                {completedSets.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Completados <span style={{ opacity: 0.5 }}>({completedSets.length})</span></p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
                      {completedSets.map(set => <SetCard key={set.id} set={set} isDragging={false} onDragStart={() => {}} onDragEnd={() => {}} disabled />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function SetCard({ set, isDragging, onDragStart, onDragEnd, disabled }) {
  const sc = SET_STATE_STYLE[set.stateLabel] || SET_STATE_STYLE.CREATED;
  return (
    <div
      className={\`set-card\${isDragging ? ' is-dragging' : ''}\`}
      draggable={!disabled}
      onDragStart={!disabled ? e => onDragStart(set, e) : undefined}
      onDragEnd={!disabled ? onDragEnd : undefined}
      style={{ background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)', border: \`1px solid rgba(255,255,255,\${disabled ? '0.06' : '0.1'})\`, borderRadius: 14, padding: '14px 15px', opacity: disabled ? 0.55 : 1 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{set.round}</span>
        <span style={{ fontSize: 10, fontWeight: 700, background: sc.bg, border: \`1px solid \${sc.border}\`, color: sc.text, borderRadius: 99, padding: '2px 9px' }}>{set.stateLabel}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {set.slots.map((slot, i) => {
          const winner = set.stateLabel === 'COMPLETED' && slot?.placement === 1;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: winner ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.05)', borderRadius: 9, padding: '7px 10px', border: winner ? '1px solid rgba(34,197,94,0.2)' : 'none' }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: slot?.entrant ? (winner ? '#4ADE80' : '#fff') : 'rgba(255,255,255,0.3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {slot?.entrant?.name || 'TBD'}
              </span>
              {slot?.score != null && <span style={{ fontSize: 14, fontWeight: 900, color: winner ? '#4ADE80' : 'rgba(255,255,255,0.5)', flexShrink: 0 }}>{slot.score}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AssignedSetCard({ set, setup }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: \`1px solid \${setup.color}33\`, borderRadius: 14, padding: '14px 15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{set.round}</span>
        <span style={{ fontSize: 10, fontWeight: 700, background: \`\${setup.color}1A\`, border: \`1px solid \${setup.color}44\`, color: setup.color, borderRadius: 99, padding: '2px 9px' }}>{setup.icon} {setup.label}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {set.slots.map((slot, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 9, padding: '7px 10px' }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{i + 1}</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: slot?.entrant ? '#fff' : 'rgba(255,255,255,0.3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slot?.entrant?.name || 'TBD'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
"""

with open(r'e:\\Users\\gabri\\Documents\\Clientes\\Smash-Ban-Stages\\pages\\admin\\test.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("OK")

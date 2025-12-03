import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import io from 'socket.io-client';

let adminSocket = null;

export default function AdminPanel() {
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [format, setFormat] = useState('BO3');
  const [currentSessionId] = useState('main-session'); // ID fijo
  const [session, setSession] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editPlayer1, setEditPlayer1] = useState('');
  const [editPlayer2, setEditPlayer2] = useState('');
  const [editFormat, setEditFormat] = useState('BO3');

  useEffect(() => {
    // Conectar al WebSocket cuando se monta el componente
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    adminSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000
    });

    adminSocket.on('connect', () => {
      console.log('Admin conectado al servidor WebSocket');
      // Siempre unirse a la sesión fija
      adminSocket.emit('join-session', 'main-session');
    });

    adminSocket.on('session-created', (data) => {
      console.log('Sesión creada:', data);
      setSession(data.session);
    });

    adminSocket.on('session-joined', (data) => {
      console.log('Sesión unida:', data);
      setSession(data.session);
    });

    adminSocket.on('session-updated', (data) => {
      console.log('Sesión actualizada:', data);
      setSession(data.session);
    });

    adminSocket.on('series-finished', (data) => {
      console.log('Serie finalizada:', data);
      setSession(data.session);
    });

    return () => {
      if (adminSocket) {
        adminSocket.disconnect();
      }
    };
  }, []);

  const handleCreateSession = () => {
    if (player1Name && player2Name) {
      if (adminSocket && adminSocket.connected) {
        adminSocket.emit('create-session', { 
          player1: player1Name, 
          player2: player2Name, 
          format 
        });
      } else {
        alert('No hay conexión con el servidor. Por favor, recarga la página.');
      }
    } else {
      alert('Por favor ingresa los nombres de ambos jugadores');
    }
  };

  const handleGameWinner = (winner) => {
    if (session && adminSocket && window.confirm(`¿Confirmar que ${session[winner].name} ganó este game?`)) {
      adminSocket.emit('game-winner', { sessionId: session.sessionId, winner });
    }
  };

  const handleResetSession = () => {
    if (session && adminSocket && window.confirm('¿Reiniciar la serie? Esto borrará todo el progreso.')) {
      adminSocket.emit('reset-session', { sessionId: currentSessionId });
    }
  };

  const handleEndMatch = () => {
    if (session && adminSocket && window.confirm('¿Terminar el match y declarar ganador?')) {
      // Determinar ganador basado en el score actual
      const winner = session.player1.score > session.player2.score ? 'player1' : 
                     session.player2.score > session.player1.score ? 'player2' : null;
      
      if (winner) {
        adminSocket.emit('end-match', { sessionId: currentSessionId, winner });
      } else {
        alert('No se puede terminar el match con empate. Debe haber un ganador con más puntos.');
      }
    }
  };

  const handleStartEditing = () => {
    setEditPlayer1(session.player1.name);
    setEditPlayer2(session.player2.name);
    setEditFormat(session.format);
    setIsEditing(true);
  };

  const handleSaveNames = () => {
    if (editPlayer1 && editPlayer2 && adminSocket) {
      adminSocket.emit('update-players', { 
        sessionId: currentSessionId, 
        player1: editPlayer1, 
        player2: editPlayer2,
        format: editFormat
      });
      setIsEditing(false);
    } else {
      alert('Por favor ingresa ambos nombres');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const getControlLink = (type) => {
    if (!session) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/${type}/${session.sessionId}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Link copiado al portapapeles');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-smash-darker via-smash-dark to-smash-purple p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">
            🎮 Panel de Administración
          </h1>
          <p className="text-smash-light text-lg">
            Sistema de Baneos - Super Smash Bros Ultimate
          </p>
        </div>

        {!session || session.phase === 'FINISHED' ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-2xl border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-6">
              {session?.phase === 'FINISHED' ? 'Nueva Serie (mismo link)' : 'Crear Nueva Sesión'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2">
                  Nombre del Jugador 1
                </label>
                <input
                  type="text"
                  value={player1Name}
                  onChange={(e) => setPlayer1Name(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none focus:ring-2 focus:ring-smash-blue"
                  placeholder="Ej: Nostra"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">
                  Nombre del Jugador 2
                </label>
                <input
                  type="text"
                  value={player2Name}
                  onChange={(e) => setPlayer2Name(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none focus:ring-2 focus:ring-smash-blue"
                  placeholder="Ej: Iori"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">
                  Formato del Torneo
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setFormat('BO3')}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                      format === 'BO3'
                        ? 'bg-smash-blue text-white shadow-lg scale-105'
                        : 'bg-white/20 text-white/70 hover:bg-white/30'
                    }`}
                  >
                    Best of 3 (BO3)
                  </button>
                  <button
                    onClick={() => setFormat('BO5')}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                      format === 'BO5'
                        ? 'bg-smash-blue text-white shadow-lg scale-105'
                        : 'bg-white/20 text-white/70 hover:bg-white/30'
                    }`}
                  >
                    Best of 5 (BO5)
                  </button>
                </div>
              </div>

              <button
                onClick={handleCreateSession}
                className="w-full py-4 bg-gradient-to-r from-smash-red to-smash-yellow text-white font-bold text-xl rounded-lg hover:shadow-2xl hover:scale-105 transition-all"
              >
                🚀 Crear Sesión
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Información de la Serie */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20">
              <div className="flex justify-between items-center mb-4">
                {!isEditing ? (
                  <>
                    <h2 className="text-3xl font-bold text-white">
                      {session.player1.name} vs {session.player2.name}
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-smash-yellow">
                        {session.format}
                      </span>
                      <button
                        onClick={handleStartEditing}
                        className="px-4 py-2 bg-smash-blue text-white rounded-lg hover:bg-smash-blue/80 transition-all"
                      >
                        ✏️ Editar
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={editPlayer1}
                        onChange={(e) => setEditPlayer1(e.target.value)}
                        placeholder="Jugador 1"
                        className="px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30"
                      />
                      <input
                        type="text"
                        value={editPlayer2}
                        onChange={(e) => setEditPlayer2(e.target.value)}
                        placeholder="Jugador 2"
                        className="px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={editFormat}
                        onChange={(e) => setEditFormat(e.target.value)}
                        className="px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30"
                      >
                        <option value="BO3">BO3</option>
                        <option value="BO5">BO5</option>
                      </select>
                      <button
                        onClick={handleSaveNames}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                      >
                        💾 Guardar
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                      >
                        ❌ Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-smash-red/20 rounded-lg p-4">
                  <p className="text-white/70 text-sm">Jugador 1</p>
                  <p className="text-white font-bold text-2xl">
                    {session.player1.name}
                  </p>
                  <p className="text-smash-yellow text-4xl font-bold">
                    {session.player1.score}
                  </p>
                </div>

                <div className="bg-white/10 rounded-lg p-4 flex flex-col justify-center">
                  <p className="text-white/70 text-sm">Game Actual</p>
                  <p className="text-white font-bold text-3xl">
                    {session.currentGame} / {session.format === 'BO3' ? '3' : '5'}
                  </p>
                </div>

                <div className="bg-smash-blue/20 rounded-lg p-4">
                  <p className="text-white/70 text-sm">Jugador 2</p>
                  <p className="text-white font-bold text-2xl">
                    {session.player2.name}
                  </p>
                  <p className="text-smash-yellow text-4xl font-bold">
                    {session.player2.score}
                  </p>
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-white/70 text-sm mb-1">Estado Actual</p>
                <p className="text-white font-bold text-xl">
                  {session.phase === 'RPS' && '⏳ Esperando Ganador de RPS'}
                  {session.phase === 'STAGE_BAN' && '🚫 Baneo de Stages'}
                  {session.phase === 'STAGE_SELECT' && '🎯 Selección de Stage'}
                  {session.phase === 'CHARACTER_SELECT' && '👤 Selección de Personajes'}
                  {session.phase === 'PLAYING' && '⚔️ Jugando'}
                  {session.phase === 'FINISHED' && '🏆 Serie Finalizada'}
                </p>
                {session.currentTurn && session.phase !== 'FINISHED' && (
                  <p className="text-smash-yellow font-semibold mt-2">
                    Turno de: {session[session.currentTurn].name}
                  </p>
                )}
              </div>
            </div>

            {/* Links de Control */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-4">
                📱 Links de Control
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tablet con QR */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-semibold text-lg">🎮 Tablet</span>
                  </div>
                  
                  {/* QR Code */}
                  <div className="bg-white p-4 rounded-lg flex justify-center">
                    <QRCodeSVG
                      value={getControlLink('tablet')}
                      size={180}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  
                  {/* Link y botón */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={getControlLink('tablet')}
                      readOnly
                      className="flex-1 px-4 py-2 rounded-lg bg-white/20 text-white text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(getControlLink('tablet'))}
                      className="px-6 py-2 bg-smash-blue text-white font-semibold rounded-lg hover:bg-smash-blue/80 transition-all"
                    >
                      Copiar
                    </button>
                  </div>
                </div>

                {/* Stream con ícono de apertura */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-semibold text-lg">📺 Stream</span>
                  </div>
                  
                  {/* Botón grande de apertura */}
                  <a
                    href={getControlLink('stream')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-gradient-to-br from-smash-purple to-purple-800 rounded-lg p-8 text-center hover:scale-105 transition-all shadow-lg group"
                  >
                    <div className="text-6xl mb-3 group-hover:scale-110 transition-transform">
                      🎥
                    </div>
                    <p className="text-white font-bold text-xl mb-1">Abrir Stream</p>
                    <p className="text-white/70 text-sm">Click para abrir en nueva pestaña</p>
                    <div className="mt-3 flex items-center justify-center gap-2 text-white/50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span className="text-xs">Nueva pestaña</span>
                    </div>
                  </a>
                  
                  {/* Link y botón */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={getControlLink('stream')}
                      readOnly
                      className="flex-1 px-4 py-2 rounded-lg bg-white/20 text-white text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(getControlLink('stream'))}
                      className="px-6 py-2 bg-smash-purple text-white font-semibold rounded-lg hover:bg-smash-purple/80 transition-all"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Controles del Game */}
            {session.phase === 'PLAYING' && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20">
                <h3 className="text-2xl font-bold text-white mb-4">
                  ⚔️ Controles del Game
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleGameWinner('player1')}
                    className="py-4 bg-smash-red text-white font-bold text-lg rounded-lg hover:bg-smash-red/80 hover:scale-105 transition-all"
                  >
                    🏆 {session.player1.name} Ganó
                  </button>
                  <button
                    onClick={() => handleGameWinner('player2')}
                    className="py-4 bg-smash-blue text-white font-bold text-lg rounded-lg hover:bg-smash-blue/80 hover:scale-105 transition-all"
                  >
                    🏆 {session.player2.name} Ganó
                  </button>
                </div>
              </div>
            )}

            {/* Botones de Control */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleEndMatch}
                className="px-8 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-bold rounded-lg hover:from-yellow-500 hover:to-orange-500 hover:scale-105 transition-all shadow-lg"
              >
                🏁 Terminar Match
              </button>
              <button
                onClick={handleResetSession}
                className="px-8 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-all border border-white/30"
              >
                🔄 Reiniciar Serie
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

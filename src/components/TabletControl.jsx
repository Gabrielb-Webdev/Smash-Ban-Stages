import { useState } from 'react';
import { useSession } from '../hooks/useSession';
import { STAGES_GAME1, STAGES_GAME2_PLUS, CHARACTERS, getStageData } from '../utils/constants';

export default function TabletControl({ sessionId }) {
  const { session, selectRPSWinner, banStage, selectStage, selectCharacter, setGameWinner } = useSession(sessionId);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingSelection, setPendingSelection] = useState(null);
  const [selectionType, setSelectionType] = useState(null); // 'ban', 'stage', 'character'

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-smash-darker via-smash-dark to-smash-purple flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">🎮</div>
          <p className="text-white text-xl">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  const handleRPSWinner = (winner) => {
    selectRPSWinner(winner);
  };

  const handleBanStage = (stageId) => {
    setPendingSelection(stageId);
    setSelectionType('ban');
  };

  const handleSelectStage = (stageId) => {
    setPendingSelection(stageId);
    setSelectionType('stage');
  };

  const handleSelectCharacter = (characterId) => {
    setPendingSelection(characterId);
    setSelectionType('character');
  };

  const confirmSelection = () => {
    if (!pendingSelection || !session.currentTurn) return;

    if (selectionType === 'ban') {
      banStage(pendingSelection, session.currentTurn);
    } else if (selectionType === 'stage') {
      selectStage(pendingSelection);
    } else if (selectionType === 'character') {
      selectCharacter(pendingSelection, session.currentTurn);
    }

    setPendingSelection(null);
    setSelectionType(null);
  };

  const cancelSelection = () => {
    setPendingSelection(null);
    setSelectionType(null);
  };

  const getAvailableStages = () => {
    const stageList = session.currentGame === 1 ? STAGES_GAME1 : STAGES_GAME2_PLUS;
    return stageList.filter(stage => session.availableStages.includes(stage.id));
  };

  const filteredCharacters = CHARACTERS.filter(char =>
    char.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-smash-darker via-smash-dark to-smash-purple p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 mb-4 shadow-xl border border-white/20">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {session.player1.name} vs {session.player2.name}
              </h2>
              <p className="text-smash-yellow">
                Game {session.currentGame} - {session.format}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-sm">Score</p>
              <p className="text-white font-bold text-xl">
                {session.player1.score} - {session.player2.score}
              </p>
            </div>
          </div>
        </div>

        {/* RPS Phase */}
        {session.phase === 'RPS' && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-xl border border-white/20">
            <h3 className="text-3xl font-bold text-white text-center mb-2">
              ✊✋✌️
            </h3>
            <h3 className="text-2xl font-bold text-white text-center mb-6">
              ¿Quién ganó Piedra, Papel o Tijera?
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleRPSWinner('player1')}
                className="py-12 bg-gradient-to-br from-smash-red to-red-700 text-white font-bold text-2xl rounded-xl hover:scale-105 transition-all shadow-lg"
              >
                🔴 {session.player1.name}
              </button>
              <button
                onClick={() => handleRPSWinner('player2')}
                className="py-12 bg-gradient-to-br from-smash-blue to-blue-700 text-white font-bold text-2xl rounded-xl hover:scale-105 transition-all shadow-lg"
              >
                🔵 {session.player2.name}
              </button>
            </div>
          </div>
        )}

        {/* Stage Ban Phase */}
        {session.phase === 'STAGE_BAN' && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-xl border border-white/20">
            <div className="text-center mb-6">
              <h3 className="text-3xl font-bold text-white mb-2">
                ❌ Banear Stage ❌
              </h3>
              <p className="text-smash-yellow text-xl font-semibold">
                Turno de: {session[session.currentTurn]?.name}
              </p>
              <p className="text-white/70 mt-2">
                {session.currentGame === 1 
                  ? `Banea ${session.bansRemaining} stage${session.bansRemaining > 1 ? 's' : ''}`
                  : `Baneos restantes: ${session.bansRemaining}`
                }
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {getAvailableStages().map((stage) => {
                const isBanned = session.bannedStages.includes(stage.id);
                const isSelected = pendingSelection === stage.id && selectionType === 'ban';
                return (
                  <button
                    key={stage.id}
                    onClick={() => !isBanned && handleBanStage(stage.id)}
                    disabled={isBanned}
                    className={`relative overflow-hidden rounded-xl transition-all ${
                      isSelected 
                        ? 'ring-4 ring-yellow-400 scale-105'
                        : isBanned
                        ? 'opacity-30 cursor-not-allowed'
                        : 'hover:scale-105 hover:shadow-2xl cursor-pointer'
                    }`}
                  >
                    <div className="h-32 relative">
                      <img 
                        src={stage.image} 
                        alt={stage.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end justify-center pb-4">
                        <p className="text-white font-bold text-2xl drop-shadow-lg">{stage.name}</p>
                      </div>
                    </div>
                    {isBanned && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                        <span className="text-red-500 text-6xl font-bold">✖</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            {pendingSelection && selectionType === 'ban' && (
              <div className="mt-6 flex gap-4">
                <button
                  onClick={cancelSelection}
                  className="flex-1 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-all"
                >
                  ❌ Cancelar
                </button>
                <button
                  onClick={confirmSelection}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all"
                >
                  ✅ Confirmar Baneo
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stage Select Phase */}
        {session.phase === 'STAGE_SELECT' && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-xl border border-white/20">
            <div className="text-center mb-6">
              <h3 className="text-3xl font-bold text-white mb-2">
                🎯 Seleccionar Stage 🎯
              </h3>
              <p className="text-smash-yellow text-xl font-semibold">
                Turno de: {session[session.currentTurn]?.name}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {getAvailableStages().map((stage) => {
                const isSelected = pendingSelection === stage.id && selectionType === 'stage';
                return (
                  <button
                    key={stage.id}
                    onClick={() => handleSelectStage(stage.id)}
                    className={`relative overflow-hidden rounded-xl transition-all ${
                      isSelected
                        ? 'ring-4 ring-green-400 scale-105'
                        : 'hover:scale-105 hover:shadow-2xl'
                    }`}
                  >
                    <div className="h-32 relative">
                      <img 
                        src={stage.image} 
                        alt={stage.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-green-900/70 to-transparent flex items-end justify-center pb-4">
                        <p className="text-white font-bold text-2xl drop-shadow-lg">{stage.name}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            
            {pendingSelection && selectionType === 'stage' && (
              <div className="mt-6 flex gap-4">
                <button
                  onClick={cancelSelection}
                  className="flex-1 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-all"
                >
                  ❌ Cancelar
                </button>
                <button
                  onClick={confirmSelection}
                  className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all"
                >
                  ✅ Confirmar Selección
                </button>
              </div>
            )}
          </div>
        )}

        {/* Character Select Phase */}
        {session.phase === 'CHARACTER_SELECT' && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-xl border border-white/20">
            <div className="text-center mb-4">
              <h3 className="text-3xl font-bold text-white mb-2">
                👤 Seleccionar Personaje 👤
              </h3>
              <p className="text-smash-yellow text-xl font-semibold">
                Turno de: {session[session.currentTurn]?.name}
              </p>
              {session.selectedStage && (
                <p className="text-white/70 mt-2">
                  Stage: {getStageData(session.selectedStage)?.name}
                </p>
              )}
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar personaje..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none focus:ring-2 focus:ring-smash-blue"
              />
            </div>

            <div className="grid grid-cols-4 gap-3 max-h-96 overflow-y-auto mb-4">
              {filteredCharacters.map((character) => {
                const isSelected = pendingSelection === character.id && selectionType === 'character';
                return (
                  <button
                    key={character.id}
                    onClick={() => handleSelectCharacter(character.id)}
                    className={`aspect-square rounded-lg hover:scale-110 transition-all p-2 flex flex-col items-center justify-center ${
                      isSelected 
                        ? 'bg-yellow-400/30 ring-4 ring-yellow-400 scale-110' 
                        : 'bg-white/5 hover:bg-white/10 hover:shadow-xl'
                    }`}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <img 
                        src={character.image} 
                        alt={character.name}
                        className="w-full h-full object-contain drop-shadow-lg"
                        style={{ imageRendering: 'crisp-edges' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                    <p className="text-white text-xs font-semibold text-center leading-tight mt-1 drop-shadow">
                      {character.name}
                    </p>
                  </button>
                );
              })}
            </div>
            
            {pendingSelection && selectionType === 'character' && (
              <div className="mt-4 flex gap-4">
                <button
                  onClick={cancelSelection}
                  className="flex-1 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-all"
                >
                  ❌ Cancelar
                </button>
                <button
                  onClick={confirmSelection}
                  className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-all"
                >
                  ✅ Confirmar Personaje
                </button>
              </div>
            )}
          </div>
        )}

        {/* Playing Phase */}
        {session.phase === 'PLAYING' && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-xl border border-white/20">
            <h3 className="text-4xl font-bold text-white mb-6 text-center">
              ⚔️ ¡En Combate! ⚔️
            </h3>
            <div className="space-y-4 mb-8">
              <div className="bg-smash-red/20 rounded-lg p-4">
                <p className="text-white/70 text-sm">Jugador 1</p>
                <p className="text-white font-bold text-xl">
                  {session.player1.name}
                </p>
                <p className="text-smash-yellow text-lg">
                  {session.player1.character || 'N/A'}
                </p>
              </div>
              <div className="text-white text-2xl text-center">VS</div>
              <div className="bg-smash-blue/20 rounded-lg p-4">
                <p className="text-white/70 text-sm">Jugador 2</p>
                <p className="text-white font-bold text-xl">
                  {session.player2.name}
                </p>
                <p className="text-smash-yellow text-lg">
                  {session.player2.character || 'N/A'}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-white/70 text-center mb-4">
                ¿Quién ganó este game?
              </p>
              <button
                onClick={() => setGameWinner('player1')}
                className="w-full py-4 bg-gradient-to-r from-smash-red to-red-600 text-white font-bold text-lg rounded-lg hover:shadow-2xl hover:scale-105 transition-all"
              >
                🏆 {session.player1.name} Ganó
              </button>
              <button
                onClick={() => setGameWinner('player2')}
                className="w-full py-4 bg-gradient-to-r from-smash-blue to-blue-600 text-white font-bold text-lg rounded-lg hover:shadow-2xl hover:scale-105 transition-all"
              >
                🏆 {session.player2.name} Ganó
              </button>
            </div>
          </div>
        )}

        {/* Finished Phase */}
        {session.phase === 'FINISHED' && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-xl border border-white/20 text-center">
            <div className="mb-8">
              <h3 className="text-5xl font-bold text-white mb-4">
                🏆 ¡Serie Finalizada! 🏆
              </h3>
              <p className="text-smash-yellow text-3xl font-bold mb-2">
                Ganador: {session.player1.score > session.player2.score ? session.player1.name : session.player2.name}
              </p>
              <p className="text-white text-2xl mb-6">
                Score Final: {session.player1.score} - {session.player2.score}
              </p>
            </div>
            <div className="bg-smash-purple/20 rounded-lg p-6 border border-smash-purple/50">
              <p className="text-white/90 text-lg mb-2">
                ✨ El administrador configurará la próxima serie
              </p>
              <p className="text-white/60 text-sm">
                Este link seguirá funcionando para el siguiente match
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

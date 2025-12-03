import { useEffect, useState } from 'react';
import { useSession } from '../hooks/useSession';
import { STAGES_GAME1, STAGES_GAME2_PLUS, getStageData, getCharacterData } from '../utils/constants';
import { motion, AnimatePresence } from 'framer-motion';

export default function StreamOverlay({ sessionId }) {
  const { session, error } = useSession(sessionId);
  const [rpsWinner, setRpsWinner] = useState(null);
  const [showRpsAnimation, setShowRpsAnimation] = useState(false);

  // Detectar cuando se define un ganador del RPS
  useEffect(() => {
    if (session && session.phase !== 'RPS' && session.rpsWinner && !rpsWinner) {
      // Se acaba de definir el ganador del RPS
      setRpsWinner(session.rpsWinner);
      setShowRpsAnimation(true);
      
      // Ocultar animación después de 4 segundos
      const timer = setTimeout(() => {
        setShowRpsAnimation(false);
      }, 4000);
      
      return () => clearTimeout(timer);
    }
    
    // Reset cuando comienza una nueva fase RPS
    if (session && session.phase === 'RPS' && session.currentGame > 1) {
      setRpsWinner(null);
      setShowRpsAnimation(false);
    }
  }, [session, rpsWinner]);

  // Función para obtener opciones aleatorias de RPS donde una gana a la otra
  const getRandomRPSOutcome = () => {
    const outcomes = [
      { winner: '✊', loser: '✌️', name: 'Piedra vs Tijeras' },
      { winner: '✋', loser: '✊', name: 'Papel vs Piedra' },
      { winner: '✌️', loser: '✋', name: 'Tijeras vs Papel' }
    ];
    return outcomes[Math.floor(Math.random() * outcomes.length)];
  };

  // Guard para evitar renders mientras sessionId no está disponible
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">🎮</div>
          <p className="text-white text-xl">Inicializando...</p>
        </div>
      </div>
    );
  }

  if (error && error === 'Sesión no encontrada') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-smash-darker via-smash-dark to-smash-purple flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-3xl font-bold text-white mb-4">Sesión no encontrada</h2>
          <p className="text-white/70 text-lg mb-6">
            Esta sesión no existe o ha expirado. Por favor, crea una nueva sesión desde el panel de administración.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-smash-blue text-white font-bold rounded-lg hover:bg-blue-600 transition-all"
          >
            Ir al Panel de Administración
          </a>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">🎮</div>
          <p className="text-white text-xl">Esperando sesión...</p>
          {error && <p className="text-yellow-400 text-sm mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  const getAvailableStages = () => {
    const stageList = session.currentGame === 1 ? STAGES_GAME1 : STAGES_GAME2_PLUS;
    return stageList;
  };

  const isStageAvailable = (stageId) => {
    return session.availableStages.includes(stageId);
  };

  const isStageBanned = (stageId) => {
    return session.bannedStages.includes(stageId);
  };

  const isStageSelected = (stageId) => {
    return session.selectedStage === stageId;
  };

  const rpsOutcome = getRandomRPSOutcome();
  const winnerIsPlayer1 = rpsWinner === 'player1';

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-smash-darker to-black p-8">
      {/* Animación de RPS cuando se define el ganador */}
      <AnimatePresence>
        {showRpsAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="text-center"
            >
              {/* Título de ganador */}
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-8"
              >
                <h2 className="text-white text-5xl font-bold mb-2">¡{session[rpsWinner]?.name} GANA!</h2>
                <p className="text-smash-yellow text-2xl">Piedra, Papel o Tijera</p>
              </motion.div>

              {/* Animación de manos */}
              <div className="flex items-center justify-center gap-12 mb-8">
                {/* Jugador 1 */}
                <motion.div
                  initial={{ x: -200, opacity: 0 }}
                  animate={{ 
                    x: 0, 
                    opacity: 1,
                    rotate: winnerIsPlayer1 ? [0, -10, 0] : 0
                  }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className={`text-center ${winnerIsPlayer1 ? 'scale-125' : ''}`}
                >
                  <div className={`w-40 h-40 ${winnerIsPlayer1 ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-red-700'} rounded-full flex items-center justify-center mb-4 shadow-2xl border-4 ${winnerIsPlayer1 ? 'border-green-300' : 'border-red-300'}`}>
                    <motion.span
                      animate={{ 
                        scale: winnerIsPlayer1 ? [1, 1.2, 1] : 1,
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ 
                        duration: 0.5, 
                        repeat: Infinity, 
                        repeatDelay: 0.5 
                      }}
                      className="text-8xl"
                    >
                      {winnerIsPlayer1 ? rpsOutcome.winner : rpsOutcome.loser}
                    </motion.span>
                  </div>
                  <p className="text-white text-2xl font-bold">{session.player1.name}</p>
                  {winnerIsPlayer1 && (
                    <motion.p
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1 }}
                      className="text-green-400 text-xl font-bold mt-2"
                    >
                      ✓ GANADOR
                    </motion.p>
                  )}
                </motion.div>

                {/* VS en el medio */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.7, type: 'spring' }}
                  className="text-white text-6xl font-bold px-8"
                >
                  VS
                </motion.div>

                {/* Jugador 2 */}
                <motion.div
                  initial={{ x: 200, opacity: 0 }}
                  animate={{ 
                    x: 0, 
                    opacity: 1,
                    rotate: !winnerIsPlayer1 ? [0, 10, 0] : 0
                  }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className={`text-center ${!winnerIsPlayer1 ? 'scale-125' : ''}`}
                >
                  <div className={`w-40 h-40 ${!winnerIsPlayer1 ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-red-700'} rounded-full flex items-center justify-center mb-4 shadow-2xl border-4 ${!winnerIsPlayer1 ? 'border-green-300' : 'border-red-300'}`}>
                    <motion.span
                      animate={{ 
                        scale: !winnerIsPlayer1 ? [1, 1.2, 1] : 1,
                        rotate: [0, -5, 5, 0]
                      }}
                      transition={{ 
                        duration: 0.5, 
                        repeat: Infinity, 
                        repeatDelay: 0.5 
                      }}
                      className="text-8xl"
                    >
                      {!winnerIsPlayer1 ? rpsOutcome.winner : rpsOutcome.loser}
                    </motion.span>
                  </div>
                  <p className="text-white text-2xl font-bold">{session.player2.name}</p>
                  {!winnerIsPlayer1 && (
                    <motion.p
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1 }}
                      className="text-green-400 text-xl font-bold mt-2"
                    >
                      ✓ GANADOR
                    </motion.p>
                  )}
                </motion.div>
              </div>

              {/* Confetti/Sparkles effect */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="text-6xl"
              >
                <motion.span
                  animate={{ 
                    y: [-10, 10, -10],
                    opacity: [1, 0.7, 1]
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  ✨
                </motion.span>
                <motion.span
                  animate={{ 
                    y: [10, -10, 10],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="mx-4"
                >
                  🎉
                </motion.span>
                <motion.span
                  animate={{ 
                    y: [-10, 10, -10],
                    opacity: [1, 0.7, 1]
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  ✨
                </motion.span>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        {/* Header con información de la serie */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-r from-smash-red via-smash-purple to-smash-blue rounded-2xl p-6 mb-8 shadow-2xl"
        >
          <div className="flex justify-between items-center">
            <div className="flex-1 text-center">
              <motion.p
                key={session.player1.score}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="text-white text-5xl font-bold"
              >
                {session.player1.score}
              </motion.p>
              <p className="text-white/90 text-2xl font-semibold mt-2">
                {session.player1.name}
              </p>
              {session.player1.character && (
                <p className="text-smash-yellow text-lg mt-1">
                  {getCharacterData(session.player1.character)?.name}
                </p>
              )}
            </div>

            <div className="px-8 text-center">
              <p className="text-white text-6xl font-bold">VS</p>
              <p className="text-white/70 text-xl mt-2">
                Game {session.currentGame}
              </p>
              <p className="text-smash-yellow text-lg font-semibold">
                {session.format}
              </p>
            </div>

            <div className="flex-1 text-center">
              <motion.p
                key={session.player2.score}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="text-white text-5xl font-bold"
              >
                {session.player2.score}
              </motion.p>
              <p className="text-white/90 text-2xl font-semibold mt-2">
                {session.player2.name}
              </p>
              {session.player2.character && (
                <p className="text-smash-yellow text-lg mt-1">
                  {getCharacterData(session.player2.character)?.name}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Indicador de fase actual */}
        <motion.div
          key={session.phase}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-6"
        >
          <div className="inline-block bg-white/10 backdrop-blur-md rounded-full px-8 py-3 border border-white/30">
            <p className="text-white text-2xl font-bold">
              {session.phase === 'RPS' && '✊✋✌️ Piedra, Papel o Tijera'}
              {session.phase === 'STAGE_BAN' && '❌ Baneo de Stages'}
              {session.phase === 'STAGE_SELECT' && '🎯 Selección de Stage'}
              {session.phase === 'CHARACTER_SELECT' && '👤 Selección de Personajes'}
              {session.phase === 'PLAYING' && '⚔️ ¡En Combate!'}
              {session.phase === 'FINISHED' && '🏆 Serie Finalizada'}
            </p>
            {session.currentTurn && session.phase !== 'FINISHED' && (
              <motion.p
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-smash-yellow text-lg font-semibold mt-1"
              >
                Turno: {session[session.currentTurn]?.name}
              </motion.p>
            )}
          </div>
        </motion.div>

        {/* Grid de Stages */}
        {(session.phase === 'STAGE_BAN' || session.phase === 'STAGE_SELECT') && (
          <div className="grid grid-cols-4 gap-4">
            <AnimatePresence>
              {getAvailableStages().map((stage, index) => {
                const banned = isStageBanned(stage.id);
                const selected = isStageSelected(stage.id);
                const available = isStageAvailable(stage.id);

                return (
                  <motion.div
                    key={stage.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: banned ? 0.3 : 1, 
                      y: 0,
                      scale: selected ? 1.1 : 1
                    }}
                    transition={{ delay: index * 0.1 }}
                    className={`relative rounded-xl overflow-hidden shadow-2xl ${
                      !available && !banned ? 'opacity-30' : ''
                    } ${selected ? 'ring-4 ring-smash-yellow' : ''}`}
                  >
                    <div className="aspect-video relative">
                      <img 
                        src={stage.image} 
                        alt={stage.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { 
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="hidden absolute inset-0 bg-gradient-to-br from-smash-purple to-smash-blue items-center justify-center">
                        <span className="text-white text-3xl">🎮</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3">
                        <p className="text-white font-bold text-lg text-center drop-shadow-lg">
                          {stage.name}
                        </p>
                      </div>
                    </div>

                    {/* Animación de baneo */}
                    {banned && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                      >
                        <div className="text-center">
                          <motion.span
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                            className="text-red-500 text-8xl font-bold drop-shadow-2xl"
                          >
                            ✖
                          </motion.span>
                          <p className="text-white font-bold text-xl mt-2 drop-shadow-lg">BANEADO</p>
                        </div>
                      </motion.div>
                    )}

                    {/* Animación de selección */}
                    {selected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.8 }}
                        className="absolute inset-0 flex items-center justify-center bg-smash-yellow/20"
                      >
                        <motion.div
                          animate={{ 
                            boxShadow: [
                              '0 0 20px rgba(243, 156, 18, 0.8)',
                              '0 0 40px rgba(243, 156, 18, 1)',
                              '0 0 20px rgba(243, 156, 18, 0.8)'
                            ]
                          }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="absolute inset-0 border-4 border-smash-yellow rounded-xl"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                          className="bg-black/70 backdrop-blur-sm rounded-full p-4"
                        >
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            className="text-smash-yellow text-6xl drop-shadow-2xl"
                          >
                            ✓
                          </motion.span>
                        </motion.div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Selección de personajes */}
        {session.phase === 'CHARACTER_SELECT' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center"
          >
            <h3 className="text-white text-3xl font-bold mb-6">
              Selección de Personajes
            </h3>
            
            {session.selectedStage && (
              <div className="mb-6">
                <p className="text-white/70 text-lg mb-2">Stage Seleccionado:</p>
                <motion.p
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="text-smash-yellow text-2xl font-bold"
                >
                  {getStageData(session.selectedStage)?.name}
                </motion.p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-8">
              <div className="bg-smash-red/20 rounded-xl p-6">
                <p className="text-white text-xl font-semibold mb-4">
                  {session.player1.name}
                </p>
                {session.player1.character ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <div className="text-6xl mb-2">🎮</div>
                    <p className="text-smash-yellow text-xl font-bold">
                      {getCharacterData(session.player1.character)?.name}
                    </p>
                  </motion.div>
                ) : (
                  <motion.p
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-white/50 text-lg"
                  >
                    Seleccionando...
                  </motion.p>
                )}
              </div>

              <div className="bg-smash-blue/20 rounded-xl p-6">
                <p className="text-white text-xl font-semibold mb-4">
                  {session.player2.name}
                </p>
                {session.player2.character ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <div className="text-6xl mb-2">🎮</div>
                    <p className="text-smash-yellow text-xl font-bold">
                      {getCharacterData(session.player2.character)?.name}
                    </p>
                  </motion.div>
                ) : (
                  <motion.p
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-white/50 text-lg"
                  >
                    Seleccionando...
                  </motion.p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Estado de juego */}
        {session.phase === 'PLAYING' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-r from-smash-red to-smash-blue rounded-2xl p-12 text-center"
          >
            <motion.h3
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-white text-5xl font-bold mb-8"
            >
              ⚔️ ¡LUCHANDO! ⚔️
            </motion.h3>
            
            <div className="bg-black/30 rounded-xl p-6 mb-4">
              <p className="text-smash-yellow text-2xl font-bold">
                {getStageData(session.selectedStage)?.name}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-white text-2xl font-bold mb-2">
                  {session.player1.name}
                </p>
                <p className="text-smash-yellow text-xl">
                  {getCharacterData(session.player1.character)?.name}
                </p>
              </div>
              <div>
                <p className="text-white text-2xl font-bold mb-2">
                  {session.player2.name}
                </p>
                <p className="text-smash-yellow text-xl">
                  {getCharacterData(session.player2.character)?.name}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Serie finalizada */}
        {session.phase === 'FINISHED' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 5, -5, 0] }}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-r from-smash-yellow to-yellow-600 rounded-2xl p-12 text-center"
          >
            <motion.h3
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-white text-6xl font-bold mb-4"
            >
              🏆 ¡GANADOR! 🏆
            </motion.h3>
            <p className="text-smash-dark text-4xl font-bold mb-2">
              {session.player1.score > session.player2.score ? session.player1.name : session.player2.name}
            </p>
            <p className="text-white text-2xl">
              Score Final: {session.player1.score} - {session.player2.score}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

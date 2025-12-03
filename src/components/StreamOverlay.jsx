import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWebSocket } from '../hooks/useWebSocket';
import { STAGES_GAME1, STAGES_GAME2_PLUS, getStageData, getCharacterData } from '../utils/constants';
import { motion, AnimatePresence } from 'framer-motion';

export default function StreamOverlay() {
  const router = useRouter();
  const { sessionId } = router.query;
  const { session } = useWebSocket(sessionId);

  if (!session) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">🎮</div>
          <p className="text-white text-xl">Esperando sesión...</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-smash-darker to-black p-8">
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
                    }`}
                  >
                    <div className={`h-48 bg-gradient-to-br from-smash-purple to-smash-blue flex items-center justify-center ${
                      selected ? 'ring-4 ring-smash-yellow' : ''
                    }`}>
                      <p className="text-white font-bold text-xl text-center px-4">
                        {stage.name}
                      </p>
                    </div>

                    {/* Animación de baneo */}
                    {banned && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/70"
                      >
                        <motion.span
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                          className="text-red-500 text-8xl font-bold"
                        >
                          ✖
                        </motion.span>
                      </motion.div>
                    )}

                    {/* Animación de selección */}
                    {selected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.8 }}
                        className="absolute inset-0 flex items-center justify-center"
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
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          className="text-smash-yellow text-6xl"
                        >
                          ✓
                        </motion.span>
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

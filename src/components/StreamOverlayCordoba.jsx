// ============================================================
// STREAM OVERLAY - AFK CÓRDOBA
// Archivo exclusivo para AFK Córdoba. No tocar para Mendoza.
// ============================================================
import { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { getStageData, getCharacterData, getStagesForTournament } from '../utils/constants';
import { motion, AnimatePresence } from 'framer-motion';

export default function StreamOverlayCordoba({ sessionId }) {
  const { session, connected } = useWebSocket(sessionId);
  const error = !connected ? 'Desconectado del servidor' : null;

  const [rpsWinner, setRpsWinner] = useState(null);
  const [showRpsAnimation, setShowRpsAnimation] = useState(false);
  const [bannedStage, setBannedStage] = useState(null);
  const [showBanAnimation, setShowBanAnimation] = useState(false);
  const [previousBannedCount, setPreviousBannedCount] = useState(0);
  const [selectedStage, setSelectedStage] = useState(null);
  const [showSelectAnimation, setShowSelectAnimation] = useState(false);
  const [previousSelectedStage, setPreviousSelectedStage] = useState(null);
  const [showBanOnCard, setShowBanOnCard] = useState(false);
  const [showSelectOnCard, setShowSelectOnCard] = useState(false);

  // Detectar ganador del RPS
  useEffect(() => {
    if (!session) return;
    if (session.phase !== 'RPS' && session.rpsWinner && session.rpsWinner !== rpsWinner) {
      setRpsWinner(session.rpsWinner);
      setShowRpsAnimation(true);
    }
    if (session.phase === 'RPS' && rpsWinner) {
      setRpsWinner(null);
      setShowRpsAnimation(false);
    }
  }, [session?.phase, session?.rpsWinner, rpsWinner]);

  useEffect(() => {
    if (showRpsAnimation) {
      const timer = setTimeout(() => setShowRpsAnimation(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showRpsAnimation]);

  // Detectar stage baneado
  useEffect(() => {
    if (!session) return;
    if (session.bannedStages && session.bannedStages.length > previousBannedCount) {
      const newBannedStageId = session.bannedStages[session.bannedStages.length - 1];
      const stageData = getStageData(newBannedStageId);
      if (stageData) {
        setBannedStage(stageData);
        setShowBanAnimation(true);
        setShowBanOnCard(false);
        setPreviousBannedCount(session.bannedStages.length);
      }
    }
    if (session.bannedStages && session.bannedStages.length === 0 && previousBannedCount > 0) {
      setPreviousBannedCount(0);
      setShowBanOnCard(false);
    }
  }, [session?.bannedStages, previousBannedCount]);

  useEffect(() => {
    if (showBanAnimation) {
      const timer = setTimeout(() => {
        setShowBanAnimation(false);
        setShowBanOnCard(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showBanAnimation]);

  // Detectar stage seleccionado
  useEffect(() => {
    if (!session) return;
    if (session.selectedStage && session.selectedStage !== previousSelectedStage) {
      const stageData = getStageData(session.selectedStage);
      if (stageData) {
        setSelectedStage(stageData);
        setShowSelectAnimation(true);
        setShowSelectOnCard(false);
        setPreviousSelectedStage(session.selectedStage);
      }
    }
    if (!session.selectedStage && previousSelectedStage) {
      setPreviousSelectedStage(null);
      setShowSelectOnCard(false);
    }
  }, [session?.selectedStage, previousSelectedStage]);

  useEffect(() => {
    if (showSelectAnimation) {
      const timer = setTimeout(() => {
        setShowSelectAnimation(false);
        setShowSelectOnCard(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSelectAnimation]);

  const getRandomRPSOutcome = () => {
    const outcomes = [
      { winner: '✊', loser: '✌️', name: 'Piedra vs Tijeras' },
      { winner: '✋', loser: '✊', name: 'Papel vs Piedra' },
      { winner: '✌️', loser: '✋', name: 'Tijeras vs Papel' },
    ];
    return outcomes[Math.floor(Math.random() * outcomes.length)];
  };

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
            Esta sesión no existe o ha expirado. Crea una nueva sesión desde el panel de administración.
          </p>
          <a href="/" className="inline-block px-6 py-3 bg-smash-blue text-white font-bold rounded-lg hover:bg-blue-600 transition-all">
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

  const rpsOutcome = getRandomRPSOutcome();
  const winnerIsPlayer1 = rpsWinner === 'player1';

  return (
    <div className="min-h-screen bg-transparent relative">

      {/* ── FOOTER - Fondo Smash Córdoba ── */}
      <footer
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-12"
        style={{
          height: '150px',
          backgroundImage: 'url(/images/paperbg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Logo SCC de fondo */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ zIndex: 0 }}>
          <img
            src="/images/SCC.webp"
            alt="Smash Córdoba"
            style={{ width: '125px', height: 'auto', opacity: 0.75 }}
          />
        </div>

        {/* Personajes - entran girando cuando ambos seleccionaron */}
        {session.player1.character && session.player2.character && (
          <>
            {/* Jugador 1 - Izquierda */}
            <motion.div
              initial={{ x: -400, opacity: 0, scale: 0, rotate: -720 }}
              animate={{ x: 0, opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: 'spring', stiffness: 200, damping: 15, bounce: 0.5 }}
              className="flex items-center"
              style={{ zIndex: 10 }}
            >
              <img
                src={getCharacterData(session.player1.character)?.image}
                alt={getCharacterData(session.player1.character)?.name}
                className="w-32 h-32 rounded-full"
                style={{ objectFit: 'cover' }}
              />
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="h-32 w-1 bg-white ml-4"
              />
            </motion.div>

            {/* Jugador 2 - Derecha */}
            <motion.div
              initial={{ x: 400, opacity: 0, scale: 0, rotate: 720 }}
              animate={{ x: 0, opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: 'spring', stiffness: 200, damping: 15, bounce: 0.5 }}
              className="flex items-center"
              style={{ zIndex: 10 }}
            >
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="h-32 w-1 bg-white mr-4"
              />
              <img
                src={getCharacterData(session.player2.character)?.image}
                alt={getCharacterData(session.player2.character)?.name}
                className="w-32 h-32 rounded-full"
                style={{ objectFit: 'cover' }}
              />
            </motion.div>
          </>
        )}

        {/* Texto "STAGE BANS" en el centro */}
        {session.player1.character && session.player2.character && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ zIndex: 20 }}
          >
            <div
              className="overflow-hidden h-24 flex items-center justify-center"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <AnimatePresence>
                <motion.h2
                  key="stage-bans-text"
                  initial={{ y: 96 }}
                  animate={{ y: [96, 0, 0, -96] }}
                  transition={{ duration: 3, times: [0, 0.3, 0.6, 1], ease: 'easeInOut', delay: 0.8 }}
                  className="whitespace-nowrap"
                  style={{ fontFamily: 'Anton', fontSize: '5.5rem', fontWeight: '400', color: '#FFFFFF' }}
                >
                  STAGE BANS
                </motion.h2>
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Imágenes de los stages */}
        {session.player1.character && session.player2.character && (
          <div
            className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none px-44 ${
              session.currentGame === 1 ? 'gap-3' : 'gap-4'
            }`}
            style={{ zIndex: 15 }}
          >
            {getStagesForTournament(sessionId, session.currentGame).map((stage, index) => {
              const isBanned = session.bannedStages?.includes(stage.id);
              const isSelected = session.selectedStage === stage.id;
              const showBanOverlay = isBanned && (bannedStage?.id === stage.id ? showBanOnCard : true);
              const showSelectOverlay = isSelected && (selectedStage?.id === stage.id ? showSelectOnCard : true);
              const isGame1 = session.currentGame === 1;
              const imageClass = isGame1 ? 'w-48 h-28' : 'w-32 h-20';
              const borderRadius = isGame1 ? 'rounded-xl' : 'rounded-lg';
              const iconSize = isGame1 ? 'text-7xl' : 'text-5xl';

              return (
                <motion.div
                  key={stage.id}
                  initial={{ scale: 0, opacity: 0, y: 100, rotate: -180 }}
                  animate={{ scale: 1, opacity: isBanned && showBanOverlay ? 0.5 : 1, y: 0, rotate: 0 }}
                  transition={{ duration: 0.6, delay: 3.5 + index * 0.1, type: 'spring', stiffness: 250, damping: 18 }}
                  className="relative"
                >
                  <img
                    src={stage.image}
                    alt={stage.name}
                    className={`${imageClass} object-cover ${borderRadius} shadow-2xl ${
                      isSelected && showSelectOverlay ? 'border-4 border-green-400' : isGame1 ? 'border-4 border-white' : 'border-3 border-white'
                    }`}
                    style={{
                      objectFit: 'cover',
                      borderWidth: isSelected && showSelectOverlay ? (isGame1 ? '5px' : '4px') : (isGame1 ? '4px' : '3px'),
                      filter: isBanned && showBanOverlay ? 'grayscale(100%)' : 'none',
                    }}
                  />
                  {showBanOverlay && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className={`absolute inset-0 flex items-center justify-center bg-black/60 ${borderRadius}`}
                    >
                      <span
                        className={`text-red-500 ${iconSize} font-black drop-shadow-2xl`}
                        style={{ textShadow: '0 0 20px rgba(239, 68, 68, 0.8)' }}
                      >
                        ✖
                      </span>
                    </motion.div>
                  )}
                  {showSelectOverlay && !isBanned && (
                    <motion.div
                      initial={{ scale: 0, rotate: 180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className={`absolute inset-0 flex items-center justify-center ${borderRadius}`}
                      style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.1) 100%)' }}
                    >
                      <span
                        className={`text-green-400 ${iconSize} font-black drop-shadow-2xl`}
                        style={{ textShadow: '0 0 30px rgba(34, 197, 94, 1), 0 0 60px rgba(34, 197, 94, 0.5)' }}
                      >
                        ✓
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </footer>

      {/* ── Animación de Stage BANEADO ── */}
      <AnimatePresence>
        {showBanAnimation && bannedStage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 200, damping: 20 }}
            className="fixed bottom-0 left-0 right-0 z-50 overflow-hidden"
            style={{ height: '150px' }}
          >
            <div className="absolute inset-0">
              <img
                src={bannedStage.image}
                alt={bannedStage.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
              <div className="hidden absolute inset-0 bg-gradient-to-br from-red-600 to-red-800 items-center justify-center">
                <span className="text-white text-6xl">🎮</span>
              </div>
            </div>
            <div className="absolute inset-0 bg-black/70" />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 250, damping: 15, delay: 0.2 }}
                className="text-red-500 text-8xl font-black drop-shadow-2xl mr-6"
                style={{ textShadow: '0 0 40px rgba(239, 68, 68, 0.8)' }}
              >
                ✖
              </motion.div>
              <motion.div
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center"
              >
                <p
                  className="text-red-500 text-5xl font-black drop-shadow-xl mb-2"
                  style={{ fontFamily: 'Anton', textShadow: '3px 3px 0px rgba(0, 0, 0, 0.8), 0 0 20px rgba(239, 68, 68, 0.6)' }}
                >
                  BANEADO
                </p>
                <p className="text-white text-3xl font-bold drop-shadow-lg">{bannedStage.name}</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Animación de Stage SELECCIONADO ── */}
      <AnimatePresence>
        {showSelectAnimation && selectedStage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 200, damping: 20 }}
            className="fixed bottom-0 left-0 right-0 z-50 overflow-hidden"
            style={{ height: '150px' }}
          >
            <div className="absolute inset-0">
              <img
                src={selectedStage.image}
                alt={selectedStage.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
              <div className="hidden absolute inset-0 bg-gradient-to-br from-yellow-500 to-yellow-600 items-center justify-center">
                <span className="text-white text-6xl">🎮</span>
              </div>
            </div>
            <div className="absolute inset-0 bg-black/75" />
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 250, damping: 15, delay: 0.2 }}
                className="text-green-500 text-8xl font-black drop-shadow-2xl mr-6"
                style={{ textShadow: '0 0 40px rgba(34, 197, 94, 1), 0 0 80px rgba(34, 197, 94, 0.5)' }}
              >
                ✓
              </motion.div>
              <motion.div
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center"
              >
                <p
                  className="text-green-400 text-5xl font-black drop-shadow-xl mb-2 uppercase"
                  style={{ fontFamily: 'Anton', textShadow: '4px 4px 0px rgba(0, 0, 0, 1), 0 0 30px rgba(34, 197, 94, 0.8)', letterSpacing: '0.1em' }}
                >
                  SELECCIONADO
                </p>
                <p
                  className="text-white text-3xl font-bold drop-shadow-lg"
                  style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.9)' }}
                >
                  {selectedStage.name}
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

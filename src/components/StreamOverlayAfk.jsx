// ============================================================
// STREAM OVERLAY - AFK (Buenos Aires)
// Archivo exclusivo para AFK. No tocar para Córdoba ni Mendoza.
// ============================================================
import { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { getStageData, getCharacterData, getStagesForTournament, getStockIconPath } from '../utils/constants';
import { motion, AnimatePresence } from 'framer-motion';

export default function StreamOverlayAfk({ sessionId }) {
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
  const [showStageBansText, setShowStageBansText] = useState(false);

  // Mostrar "STAGE BANS" solo al inicio, ocultarlo antes de que aparezcan los stages
  useEffect(() => {
    if (session?.player1?.character && session?.player2?.character) {
      setShowStageBansText(true);
      const t = setTimeout(() => setShowStageBansText(false), 3000);
      return () => clearTimeout(t);
    } else {
      setShowStageBansText(false);
    }
  }, [session?.player1?.character, session?.player2?.character]);

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
      }, 2000);
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
      }, 2000);
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
          <p className="text-white/70 text-lg mb-6">Esta sesión no existe o ha expirado.</p>
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
    <>
      <style>{`html, body { background: transparent !important; }`}</style>
      <div className="min-h-screen bg-transparent relative">

      {/* ── FOOTER - Fondo negro AFK ── */}
      <footer
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between"
        style={{
          height: '9.9vw',
          paddingLeft: '2.7vw',
          paddingRight: '2.7vw',
          background: '#000000',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Logo AFK de fondo */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ zIndex: 0 }}>
          <img
            src="/images/AFK.webp"
            alt="AFK Background"
            style={{ width: '7.7vw', height: 'auto', opacity: 0.75 }}
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
              {session.player1.character === 'random' ? (
                <span className="text-white font-black flex items-center justify-center" style={{ fontFamily: 'Anton', fontSize: '5vw', width: '7.7vw', height: '7.7vw' }}>?</span>
              ) : (
                <img
                  src={getStockIconPath(session.player1.character, session.player1.skin || 1) || getCharacterData(session.player1.character)?.image}
                  alt={getCharacterData(session.player1.character)?.name}
                  className="rounded-full"
                  style={{ objectFit: 'cover', width: '7.7vw', height: '7.7vw' }}
                />
              )}
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="bg-white"
                style={{ height: '7.7vw', width: '0.15vw', marginLeft: '0.9vw', flexShrink: 0 }}
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
                className="bg-white"
                style={{ height: '7.7vw', width: '0.15vw', marginRight: '0.9vw', flexShrink: 0 }}
              />
              {session.player2.character === 'random' ? (
                <span className="text-white font-black flex items-center justify-center" style={{ fontFamily: 'Anton', fontSize: '5vw', width: '7.7vw', height: '7.7vw' }}>?</span>
              ) : (
                <img
                  src={getStockIconPath(session.player2.character, session.player2.skin || 1) || getCharacterData(session.player2.character)?.image}
                  alt={getCharacterData(session.player2.character)?.name}
                  className="rounded-full"
                  style={{ objectFit: 'cover', width: '7.7vw', height: '7.7vw' }}
                />
              )}
            </motion.div>
          </>
        )}

        {/* Texto "STAGE BANS" en el centro */}
        {session.player1.character && session.player2.character && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ zIndex: 20 }}
          >
            <div className="overflow-hidden flex items-center justify-center" style={{ height: '5.4vw', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <AnimatePresence>
                {showStageBansText && (
                  <motion.h2
                    key="stage-bans-text"
                    initial={{ y: 80 }}
                    animate={{ y: 0 }}
                    exit={{ y: -80 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="whitespace-nowrap"
                    style={{ fontFamily: 'Anton', fontSize: '5vw', fontWeight: '400', color: '#FFFFFF' }}
                  >
                    STAGE BANS
                  </motion.h2>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Imágenes de los stages */}
        {session.player1.character && session.player2.character && (
          <div
            className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none"
            style={{ zIndex: 15, paddingLeft: '6.3vw', paddingRight: '6.3vw', gap: session.currentGame === 1 ? '0.7vw' : '0.9vw' }}
          >
            {getStagesForTournament(sessionId, session.currentGame).map((stage, index) => {
              const isBanned = session.bannedStages?.includes(stage.id);
              const isSelected = session.selectedStage === stage.id;
              const showBanOverlay = isBanned && (bannedStage?.id === stage.id ? showBanOnCard : true);
              const showSelectOverlay = isSelected && (selectedStage?.id === stage.id ? showSelectOnCard : true);
              const isGame1 = session.currentGame === 1;
              const imageSize = isGame1 ? { width: '9vw', height: '5.05vw' } : { width: '6.3vw', height: '3.5vw' };
              const borderRadius = isGame1 ? 'rounded-xl' : 'rounded-lg';
              const iconFontSize = isGame1 ? '5vw' : '3.5vw';

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
                    className={`object-cover ${borderRadius} shadow-2xl`}
                    style={{
                      ...imageSize,
                      objectFit: 'cover',
                      borderWidth: isSelected && showSelectOverlay ? (isGame1 ? '6px' : '5px') : (isGame1 ? '5px' : '4px'),
                      borderStyle: 'solid',
                      borderColor: isSelected && showSelectOverlay ? '#4ade80' : '#ffffff',
                      filter: isBanned && showBanOverlay ? 'grayscale(100%)' : 'none',
                    }}
                  />
                  {/* Stage name label */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none ${borderRadius.replace('rounded', 'rounded-b')}`}
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}
                  >
                    <p style={{ fontFamily: 'Anton', fontSize: isGame1 ? '0.72vw' : '0.58vw', color: '#ffffff', textAlign: 'center', padding: isGame1 ? '0.3vw 0.2vw' : '0.2vw 0.1vw', letterSpacing: '0.02em', textShadow: '1px 1px 2px rgba(0,0,0,0.9)', lineHeight: 1.1 }}>
                      {stage.name}
                    </p>
                  </div>
                  {showBanOverlay && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className={`absolute inset-0 flex items-center justify-center bg-black/60 ${borderRadius}`}
                    >
                      <span className="text-red-500 font-black drop-shadow-2xl" style={{ fontSize: iconFontSize, textShadow: '0 0 20px rgba(239, 68, 68, 0.8)' }}>
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
                      <span className="text-green-400 font-black drop-shadow-2xl" style={{ fontSize: iconFontSize, textShadow: '0 0 30px rgba(34, 197, 94, 1), 0 0 60px rgba(34, 197, 94, 0.5)' }}>
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
            style={{ height: '9.9vw' }}
          >
            <div className="absolute inset-0">
              <img src={bannedStage.image} alt={bannedStage.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <div className="absolute inset-0 bg-black/70" />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 250, damping: 15, delay: 0.2 }}
                className="text-red-500 font-black drop-shadow-2xl"
                style={{ fontSize: '5vw', marginRight: '1.3vw', textShadow: '0 0 40px rgba(239, 68, 68, 0.8)' }}
              >
                ✖
              </motion.div>
              <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-center">
                <p className="text-red-500 font-black drop-shadow-xl" style={{ fontFamily: 'Anton', fontSize: '3.6vw', marginBottom: '0.35vw', textShadow: '3px 3px 0px rgba(0,0,0,0.8)' }}>BANEADO</p>
                <p className="text-white font-bold drop-shadow-lg" style={{ fontSize: '2.2vw' }}>{bannedStage.name}</p>
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
            style={{ height: '9.9vw' }}
          >
            <div className="absolute inset-0">
              <img src={selectedStage.image} alt={selectedStage.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
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
                className="text-green-500 font-black drop-shadow-2xl"
                style={{ fontSize: '5vw', marginRight: '1.3vw', textShadow: '0 0 40px rgba(34, 197, 94, 1), 0 0 80px rgba(34, 197, 94, 0.5)' }}
              >
                ✓
              </motion.div>
              <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-center">
                <p className="text-green-400 font-black drop-shadow-xl uppercase" style={{ fontFamily: 'Anton', fontSize: '3.6vw', marginBottom: '0.35vw', textShadow: '4px 4px 0px rgba(0,0,0,1)', letterSpacing: '0.1em' }}>SELECCIONADO</p>
                <p className="text-white font-bold drop-shadow-lg" style={{ fontSize: '2.2vw', textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>{selectedStage.name}</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      </div>
    </>
  );
}

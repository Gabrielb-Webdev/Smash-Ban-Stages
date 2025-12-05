import { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { STAGES_GAME1, STAGES_GAME2_PLUS, getStageData, getCharacterData } from '../utils/constants';
import { motion, AnimatePresence } from 'framer-motion';

export default function StreamOverlay({ sessionId }) {
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

  // Detectar cuando se define un ganador del RPS
  useEffect(() => {
    if (!session) return;

    // Detectar cambio de fase de RPS a otra fase (se acaba de definir el ganador)
    if (session.phase !== 'RPS' && session.rpsWinner && session.rpsWinner !== rpsWinner) {
      console.log('🎮 Mostrando animación RPS para:', session.rpsWinner);
      setRpsWinner(session.rpsWinner);
      setShowRpsAnimation(true);
    }
    
    // Reset cuando vuelve a fase RPS en un nuevo game
    if (session.phase === 'RPS' && rpsWinner) {
      console.log('🔄 Reseteando estado RPS');
      setRpsWinner(null);
      setShowRpsAnimation(false);
    }
  }, [session?.phase, session?.rpsWinner, rpsWinner]);

  // Timer separado para ocultar la animación después de 3 segundos
  useEffect(() => {
    if (showRpsAnimation) {
      console.log('⏰ Timer iniciado: ocultando en 3 segundos');
      const timer = setTimeout(() => {
        console.log('✅ Ocultando animación RPS');
        setShowRpsAnimation(false);
      }, 3000);
      
      return () => {
        console.log('🧹 Limpiando timer');
        clearTimeout(timer);
      };
    }
  }, [showRpsAnimation]);

  // Detectar cuando se banea un stage
  useEffect(() => {
    if (!session) return;

    // Detectar nuevo stage baneado
    if (session.bannedStages && session.bannedStages.length > previousBannedCount) {
      const newBannedStageId = session.bannedStages[session.bannedStages.length - 1];
      const stageData = getStageData(newBannedStageId);
      
      if (stageData) {
        console.log('🚫 Stage baneado:', stageData.name);
        setBannedStage(stageData);
        setShowBanAnimation(true);
        setShowBanOnCard(false); // Reset para nueva animación
        setPreviousBannedCount(session.bannedStages.length);
      }
    }

    // Reset counter cuando comienza nuevo game
    if (session.bannedStages && session.bannedStages.length === 0 && previousBannedCount > 0) {
      setPreviousBannedCount(0);
      setShowBanOnCard(false);
    }
  }, [session?.bannedStages, previousBannedCount]);

  // Timer para ocultar animación de baneo después de 3 segundos y mostrar en card
  useEffect(() => {
    if (showBanAnimation) {
      console.log('⏰ Mostrando animación de baneo por 3 segundos');
      const timer = setTimeout(() => {
        console.log('✅ Ocultando animación de baneo del footer');
        setShowBanAnimation(false);
        // Mostrar animación en la card después de que termine la del footer
        setShowBanOnCard(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [showBanAnimation]);

  // Detectar cuando se selecciona un stage
  useEffect(() => {
    if (!session) return;

    // Detectar nuevo stage seleccionado
    if (session.selectedStage && session.selectedStage !== previousSelectedStage) {
      const stageData = getStageData(session.selectedStage);
      
      if (stageData) {
        console.log('✅ Stage seleccionado:', stageData.name);
        setSelectedStage(stageData);
        setShowSelectAnimation(true);
        setShowSelectOnCard(false); // Reset para nueva animación
        setPreviousSelectedStage(session.selectedStage);
      }
    }

    // Reset cuando comienza nuevo game
    if (!session.selectedStage && previousSelectedStage) {
      setPreviousSelectedStage(null);
      setShowSelectOnCard(false);
    }
  }, [session?.selectedStage, previousSelectedStage]);

  // Timer para ocultar animación de selección después de 3 segundos y mostrar en card
  useEffect(() => {
    if (showSelectAnimation) {
      console.log('⏰ Mostrando animación de selección por 3 segundos');
      const timer = setTimeout(() => {
        console.log('✅ Ocultando animación de selección del footer');
        setShowSelectAnimation(false);
        // Mostrar animación en la card después de que termine la del footer
        setShowSelectOnCard(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [showSelectAnimation]);

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
    <div className="min-h-screen bg-transparent relative">
      {/* Footer con imagen paperbg.jpg de fondo y personajes */}
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
        {/* Mostrar personajes SOLO cuando AMBOS hayan seleccionado - ENTRADA GIRANDO */}
        {session.player1.character && session.player2.character && (
          <>
            {/* Personaje Jugador 1 - Izquierda girando múltiples vueltas */}
            <motion.div
              initial={{ x: -400, opacity: 0, scale: 0, rotate: -720 }}
              animate={{ 
                x: 0, 
                opacity: 1, 
                scale: 1, 
                rotate: 0,
              }}
              transition={{ 
                duration: 0.8,
                type: 'spring',
                stiffness: 200,
                damping: 15,
                bounce: 0.5
              }}
              className="flex items-center"
            >
              <img 
                src={getCharacterData(session.player1.character)?.image} 
                alt={getCharacterData(session.player1.character)?.name}
                className="w-32 h-32 rounded-full border-4 border-black shadow-2xl"
                style={{ objectFit: 'cover' }}
              />
              <motion.div 
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="h-32 w-1 bg-black ml-4"
              ></motion.div>
            </motion.div>

            {/* Personaje Jugador 2 - Derecha girando múltiples vueltas */}
            <motion.div
              initial={{ x: 400, opacity: 0, scale: 0, rotate: 720 }}
              animate={{ 
                x: 0, 
                opacity: 1, 
                scale: 1, 
                rotate: 0,
              }}
              transition={{ 
                duration: 0.8,
                type: 'spring',
                stiffness: 200,
                damping: 15,
                bounce: 0.5
              }}
              className="flex items-center"
            >
              <motion.div 
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="h-32 w-1 bg-black mr-4"
              ></motion.div>
              <img 
                src={getCharacterData(session.player2.character)?.image} 
                alt={getCharacterData(session.player2.character)?.name}
                className="w-32 h-32 rounded-full border-4 border-black shadow-2xl"
                style={{ objectFit: 'cover' }}
              />
            </motion.div>
          </>
        )}

        {/* Texto "Stage Bans" en el centro - Aparece desde abajo del footer */}
        {session.player1.character && session.player2.character && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <AnimatePresence>
              <motion.h2 
                key="stage-bans-text"
                initial={{ 
                  y: 100,
                  opacity: 0,
                  scale: 0.6,
                  rotateX: 75
                }}
                animate={{ 
                  y: [100, 20, 0, -10, -80],
                  opacity: [0, 1, 1, 1, 0],
                  scale: [0.6, 1.05, 1, 1, 0.85],
                  rotateX: [75, 5, 0, -5, -75]
                }}
                transition={{ 
                  duration: 2.8,
                  times: [0, 0.35, 0.5, 0.75, 1],
                  ease: [0.34, 1.56, 0.64, 1],
                  delay: 0.8
                }}
                className="whitespace-nowrap"
                style={{ 
                  fontFamily: 'Anton',
                  fontSize: '5.5rem',
                  fontWeight: '400',
                  color: '#FFFFFF',
                  textShadow: `
                    5px 5px 0px #000000,
                    -2px -2px 0px #000000,
                    2px -2px 0px #000000,
                    -2px 2px 0px #000000,
                    0 0 15px rgba(0, 0, 0, 0.8),
                    0 0 30px rgba(0, 0, 0, 0.6),
                    0 8px 25px rgba(0, 0, 0, 0.9)
                  `,
                  letterSpacing: '0.08em',
                  WebkitTextStroke: '2px #000000',
                  transformStyle: 'preserve-3d',
                  perspective: '800px'
                }}
              >
                Stage Bans
              </motion.h2>
            </AnimatePresence>
          </div>
        )}

        {/* Stages - Aparecen después del texto Stage Bans */}
        {session.player1.character && session.player2.character && (
          <div className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-center z-10 pointer-events-none px-44 ${
            session.currentGame === 1 ? 'gap-3' : 'gap-4'
          }`}>
            {(session.currentGame === 1 ? STAGES_GAME1 : STAGES_GAME2_PLUS).map((stage, index) => {
              const isBanned = session.bannedStages?.includes(stage.id);
              const isSelected = session.selectedStage === stage.id;
              // Solo mostrar overlay si showBanOnCard está activado y es el stage actual baneado, o si es un baneo anterior
              const showBanOverlay = isBanned && (bannedStage?.id === stage.id ? showBanOnCard : true);
              // Solo mostrar overlay si showSelectOnCard está activado y es el stage actual seleccionado
              const showSelectOverlay = isSelected && (selectedStage?.id === stage.id ? showSelectOnCard : true);
              
              // Tamaños diferentes según el game
              const isGame1 = session.currentGame === 1;
              const imageClass = isGame1 ? 'w-48 h-28' : 'w-32 h-20';
              const borderRadius = isGame1 ? 'rounded-xl' : 'rounded-lg';
              const iconSize = isGame1 ? 'text-7xl' : 'text-5xl';
              
              return (
                <motion.div
                  key={stage.id}
                  initial={{ scale: 0, opacity: 0, y: 100, rotate: -180 }}
                  animate={{ 
                    scale: 1,
                    opacity: isBanned && showBanOverlay ? 0.5 : 1,
                    y: 0,
                    rotate: 0
                  }}
                  transition={{ 
                    duration: 0.6,
                    delay: 3.5 + (index * 0.1),
                    type: 'spring',
                    stiffness: 250,
                    damping: 18
                  }}
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
                      filter: isBanned && showBanOverlay ? 'grayscale(100%)' : 'none'
                    }}
                  />
                  
                  {/* X Roja para baneado - Solo después de la animación del footer */}
                  {showBanOverlay && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className={`absolute inset-0 flex items-center justify-center bg-black/60 ${borderRadius}`}
                    >
                      <span className={`text-red-500 ${iconSize} font-black drop-shadow-2xl`}
                            style={{ textShadow: '0 0 20px rgba(239, 68, 68, 0.8)' }}>
                        ✖
                      </span>
                    </motion.div>
                  )}
                  
                  {/* Check verde para seleccionado - Solo después de la animación del footer */}
                  {showSelectOverlay && !isBanned && (
                    <motion.div
                      initial={{ scale: 0, rotate: 180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className={`absolute inset-0 flex items-center justify-center ${borderRadius}`}
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.1) 100%)'
                      }}
                    >
                      <span className={`text-green-400 ${iconSize} font-black drop-shadow-2xl`}
                            style={{ textShadow: '0 0 30px rgba(34, 197, 94, 1), 0 0 60px rgba(34, 197, 94, 0.5)' }}>
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

      {/* Animación de Stage Baneado en el Footer */}
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
            {/* Imagen del stage de fondo */}
            <div className="absolute inset-0">
              <img
                src={bannedStage.image}
                alt={bannedStage.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden absolute inset-0 bg-gradient-to-br from-red-600 to-red-800 items-center justify-center">
                <span className="text-white text-6xl">🎮</span>
              </div>
            </div>

            {/* Overlay oscuro */}
            <div className="absolute inset-0 bg-black/70" />

            {/* Contenido centrado */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* X Roja */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ 
                  scale: 1, 
                  rotate: 0,
                }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 250, 
                  damping: 15,
                  delay: 0.2 
                }}
                className="text-red-500 text-8xl font-black drop-shadow-2xl mr-6"
                style={{ textShadow: '0 0 40px rgba(239, 68, 68, 0.8)' }}
              >
                ✖
              </motion.div>
              
              {/* Texto BANEADO y nombre */}
              <motion.div
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center"
              >
                <p className="text-red-500 text-5xl font-black drop-shadow-xl mb-2"
                   style={{ 
                     fontFamily: 'Anton',
                     textShadow: '3px 3px 0px rgba(0, 0, 0, 0.8), 0 0 20px rgba(239, 68, 68, 0.6)'
                   }}
                >
                  BANEADO
                </p>
                <p className="text-white text-3xl font-bold drop-shadow-lg">
                  {bannedStage.name}
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animación de Stage Seleccionado en el Footer */}
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
            {/* Imagen del stage de fondo */}
            <div className="absolute inset-0">
              <img
                src={selectedStage.image}
                alt={selectedStage.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden absolute inset-0 bg-gradient-to-br from-yellow-500 to-yellow-600 items-center justify-center">
                <span className="text-white text-6xl">🎮</span>
              </div>
            </div>

            {/* Overlay oscuro */}
            <div className="absolute inset-0 bg-black/75" />

            {/* Líneas decorativas verdes */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent"></div>
            </div>

            {/* Contenido centrado */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Check Verde */}
              <motion.div
                initial={{ scale: 0, rotate: 180 }}
                animate={{ 
                  scale: 1, 
                  rotate: 0,
                }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 250, 
                  damping: 15,
                  delay: 0.2 
                }}
                className="text-green-500 text-8xl font-black drop-shadow-2xl mr-6"
                style={{ textShadow: '0 0 40px rgba(34, 197, 94, 1), 0 0 80px rgba(34, 197, 94, 0.5)' }}
              >
                ✓
              </motion.div>
              
              {/* Texto SELECCIONADO y nombre */}
              <motion.div
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center"
              >
                <p className="text-green-400 text-5xl font-black drop-shadow-xl mb-2 uppercase"
                   style={{ 
                     fontFamily: 'Anton',
                     textShadow: '4px 4px 0px rgba(0, 0, 0, 1), 0 0 30px rgba(34, 197, 94, 0.8)',
                     letterSpacing: '0.1em'
                   }}
                >
                  SELECCIONADO
                </p>
                <p className="text-white text-3xl font-bold drop-shadow-lg"
                   style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.9)' }}>
                  {selectedStage.name}
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTENIDO ELIMINADO - Ahora usamos navbar estática arriba */}
      {false && (
        <motion.nav 
          initial={{ y: -200 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed top-0 left-0 right-0 flex items-center justify-center relative"
          style={{
            height: '140px',
            backgroundImage: 'url(/images/paperbg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Overlay rosa semi-transparente */}
          <div 
            className="absolute inset-0" 
            style={{
              background: 'linear-gradient(90deg, rgba(255, 77, 141, 0.85) 0%, rgba(255, 107, 157, 0.85) 25%, rgba(255, 140, 173, 0.85) 50%, rgba(255, 107, 157, 0.85) 75%, rgba(255, 77, 141, 0.85) 100%)',
            }}
          ></div>
          {/* Contenido sobre el overlay - con z-index para estar sobre el overlay rosa */}
          <div className="flex items-center gap-6 relative z-10">
              {/* Personaje Jugador 1 - Izquierda */}
              <motion.div
                initial={{ x: -150, opacity: 0, scale: 0.5 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2, type: 'spring', stiffness: 150 }}
              >
                <img 
                  src={getCharacterData(session.player1.character)?.image} 
                  alt={getCharacterData(session.player1.character)?.name}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-2xl"
                  style={{ objectFit: 'cover' }}
                />
              </motion.div>

              {/* Separador vertical */}
              <motion.div 
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="w-0.5 h-20 bg-white/50"
              ></motion.div>

              {/* Stages en el centro con animación secuencial */}
              <div className="flex gap-3 items-center">
                {STAGES_GAME1.map((stage, index) => (
                  <motion.div
                    key={stage.id}
                    initial={{ scale: 0, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    transition={{ 
                      duration: 0.5, 
                      delay: 0.6 + (index * 0.1),
                      type: 'spring',
                      stiffness: 260,
                      damping: 20
                    }}
                  >
                    <img 
                      src={stage.image}
                      alt={stage.name}
                      className="w-20 h-14 object-cover rounded-lg border-3 border-white shadow-lg hover:scale-110 transition-transform"
                      style={{ 
                        objectFit: 'cover',
                        borderWidth: '3px'
                      }}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Separador vertical */}
              <motion.div 
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4, delay: 1.2 }}
                className="w-0.5 h-20 bg-white/50"
              ></motion.div>

              {/* Personaje Jugador 2 - Derecha */}
              <motion.div
                initial={{ x: 150, opacity: 0, scale: 0.5 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 1.3, type: 'spring', stiffness: 150 }}
              >
                <img 
                  src={getCharacterData(session.player2.character)?.image} 
                  alt={getCharacterData(session.player2.character)?.name}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-2xl"
                  style={{ objectFit: 'cover' }}
                />
              </motion.div>
            </div>
        </motion.nav>
      )}

      <div className="max-w-7xl mx-auto hidden">
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

        {/* Fase de selección de personajes - Solo mostrar cuando AMBOS hayan seleccionado */}
        {session.phase === 'CHARACTER_SELECT' && session.player1.character && session.player2.character && (
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
                    <img 
                      src={getCharacterData(session.player1.character)?.image} 
                      alt={getCharacterData(session.player1.character)?.name}
                      className="w-24 h-24 mx-auto mb-2 rounded-full border-4 border-smash-yellow shadow-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div className="text-6xl mb-2 hidden">🎮</div>
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
                    <img 
                      src={getCharacterData(session.player2.character)?.image} 
                      alt={getCharacterData(session.player2.character)?.name}
                      className="w-24 h-24 mx-auto mb-2 rounded-full border-4 border-smash-yellow shadow-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div className="text-6xl mb-2 hidden">🎮</div>
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

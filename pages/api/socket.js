import { Server } from 'socket.io';

let io;
const sessions = new Map();

// Crear stage inicial para un juego
const createInitialStages = (gameNumber) => {
  const STAGES_GAME1 = ['battlefield', 'finalDest', 'smallBattlefield', 'pokemonStadium2'];
  const STAGES_GAME2_PLUS = ['battlefield', 'finalDest', 'smallBattlefield', 'pokemonStadium2', 'townAndCity', 'smashville', 'kalosLeague'];
  
  return gameNumber === 1 ? STAGES_GAME1 : STAGES_GAME2_PLUS;
};

// Crear nueva sesión
const createSession = (sessionId, player1, player2, format) => {
  const session = {
    sessionId,
    player1: { name: player1, score: 0, character: null },
    player2: { name: player2, score: 0, character: null },
    format,
    phase: 'RPS',
    currentGame: 1,
    currentTurn: null,
    rpsWinner: null,
    availableStages: createInitialStages(1),
    bannedStages: [],
    selectedStage: null,
    createdAt: new Date()
  };
  
  sessions.set(sessionId, session);
  return session;
};

export default function handler(req, res) {
  if (res.socket.server.io) {
    console.log('Socket ya está corriendo');
    res.end();
    return;
  }

  console.log('Socket inicializando...');
  io = new Server(res.socket.server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('Cliente conectado:', socket.id);

      // Crear nueva sesión
      socket.on('create-session', (data) => {
        const { sessionId, player1, player2, format } = data;
        const session = createSession(sessionId, player1, player2, format);
        
        socket.emit('session-created', session);
        socket.emit('session-update', session);
        console.log('Sesión creada:', sessionId);
      });

      // Unirse a una sesión
      socket.on('join-session', (sessionId) => {
        const session = sessions.get(sessionId);
        
        if (session) {
          socket.join(sessionId);
          socket.emit('session-update', session);
          console.log(`Cliente se unió a la sesión: ${sessionId}`);
        } else {
          socket.emit('session-error', 'Sesión no encontrada');
          console.log(`Sesión no encontrada: ${sessionId}`);
        }
      });

      // RPS Winner
      socket.on('rps-winner', (data) => {
        const { sessionId, winner } = data;
        const session = sessions.get(sessionId);
        
        if (session && session.phase === 'RPS') {
          session.rpsWinner = winner;
          session.currentTurn = winner === 'player1' ? 'player2' : 'player1';
          session.phase = 'STAGE_BAN';
          
          sessions.set(sessionId, session);
          io.to(sessionId).emit('session-update', session);
          console.log(`RPS Winner: ${winner} en sesión ${sessionId}`);
        }
      });

      // Ban Stage
      socket.on('ban-stage', (data) => {
        const { sessionId, stageId, player } = data;
        const session = sessions.get(sessionId);
        
        if (session && session.phase === 'STAGE_BAN') {
          session.bannedStages.push(stageId);
          session.availableStages = session.availableStages.filter(s => s !== stageId);
          
          if (session.availableStages.length === 1) {
            session.selectedStage = session.availableStages[0];
            session.phase = 'CHARACTER_SELECT';
            session.currentTurn = null;
          } else {
            session.currentTurn = session.currentTurn === 'player1' ? 'player2' : 'player1';
          }
          
          sessions.set(sessionId, session);
          io.to(sessionId).emit('session-update', session);
          console.log(`Stage baneado: ${stageId} por ${player} en sesión ${sessionId}`);
        }
      });

      // Select Stage  
      socket.on('select-stage', (data) => {
        const { sessionId, stageId } = data;
        const session = sessions.get(sessionId);
        
        if (session && session.phase === 'STAGE_SELECT') {
          session.selectedStage = stageId;
          session.phase = 'CHARACTER_SELECT';
          session.currentTurn = null;
          
          sessions.set(sessionId, session);
          io.to(sessionId).emit('session-update', session);
          console.log(`Stage seleccionado: ${stageId} en sesión ${sessionId}`);
        }
      });

      // Select Character
      socket.on('select-character', (data) => {
        const { sessionId, characterId, player } = data;
        const session = sessions.get(sessionId);
        
        if (session && session.phase === 'CHARACTER_SELECT') {
          session[player].character = characterId;
          
          if (session.player1.character && session.player2.character) {
            session.phase = 'PLAYING';
          }
          
          sessions.set(sessionId, session);
          io.to(sessionId).emit('session-update', session);
          console.log(`Personaje seleccionado: ${characterId} por ${player} en sesión ${sessionId}`);
        }
      });

      // Set Game Winner
      socket.on('set-game-winner', (data) => {
        const { sessionId, winner } = data;
        const session = sessions.get(sessionId);
        
        if (session && session.phase === 'PLAYING') {
          session[winner].score++;
          session.currentGame++;
          
          // Verificar si la serie ha terminado
          const player1Wins = session.player1.score;
          const player2Wins = session.player2.score;
          const maxWins = session.format === 'BO5' ? 3 : 2;
          
          if (player1Wins >= maxWins || player2Wins >= maxWins) {
            session.phase = 'FINISHED';
          } else {
            // Continuar al siguiente game
            session.phase = 'STAGE_SELECT';
            session.availableStages = createInitialStages(session.currentGame);
            session.bannedStages = [];
            session.selectedStage = null;
            session.player1.character = null;
            session.player2.character = null;
            session.currentTurn = winner; // El ganador del game anterior empieza
          }
          
          sessions.set(sessionId, session);
          io.to(sessionId).emit('session-update', session);
          console.log(`Game ganado por: ${winner} en sesión ${sessionId}`);
        }
      });

      // Reset Session
      socket.on('reset-session', (data) => {
        const { sessionId } = data;
        const session = sessions.get(sessionId);
        
        if (session) {
          session.player1.score = 0;
          session.player2.score = 0;
          session.player1.character = null;
          session.player2.character = null;
          session.phase = 'RPS';
          session.currentGame = 1;
          session.currentTurn = null;
          session.rpsWinner = null;
          session.availableStages = createInitialStages(1);
          session.bannedStages = [];
          session.selectedStage = null;
          
          sessions.set(sessionId, session);
          io.to(sessionId).emit('session-update', session);
          console.log(`Sesión reseteada: ${sessionId}`);
        }
      });

      // End Match
      socket.on('end-match', (data) => {
        const { sessionId, winner } = data;
        const session = sessions.get(sessionId);
        
        if (session) {
          session.phase = 'FINISHED';
          if (winner) {
            const maxWins = session.format === 'BO5' ? 3 : 2;
            session[winner].score = maxWins;
          }
          
          sessions.set(sessionId, session);
          io.to(sessionId).emit('session-update', session);
          console.log(`Match terminado: ${sessionId}, ganador: ${winner || 'ninguno'}`);
        }
      });

      // Edit Session
      socket.on('edit-session', (data) => {
        const { sessionId, player1, player2, format } = data;
        const session = sessions.get(sessionId);
        
        if (session) {
          session.player1.name = player1;
          session.player2.name = player2;
          session.format = format;
          
          sessions.set(sessionId, session);
          io.to(sessionId).emit('session-update', session);
          console.log(`Sesión editada: ${sessionId}`);
        }
      });

      socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
      });
    });
  }
  res.end();
}
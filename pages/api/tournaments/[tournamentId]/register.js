// API Route para registrarse en torneos


// Mock storage para registros - en producción usar base de datos
let mockRegistrations: any[] = [];

export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { tournamentId } = req.query;

  if (req.method === 'POST') {
    // Registrarse en torneo
    const { gameId } = req.body;
    
    // TODO: Obtener userId del token de autorización
    const userId = 'mock-user-123'; // Mock user ID
    
    // Verificar si ya está registrado
    const existingRegistration = mockRegistrations.find(
      r => r.tournamentId === tournamentId && r.userId === userId
    );
    
    if (existingRegistration) {
      return res.status(400).json({ error: 'Ya estás registrado en este torneo' });
    }
    
    // TODO: Validar que el torneo existe y está abierto
    // TODO: Validar que no esté lleno
    // TODO: Hacer registro real en start.gg API
    
    const registration = {
      id: `reg-${Date.now()}`,
      userId,
      tournamentId,
      gameId,
      registeredAt: new Date().toISOString(),
      checkedIn: false,
      seed: null,
    };
    
    mockRegistrations.push(registration);
    
    res.status(201).json(registration);
  } 
  else if (req.method === 'DELETE') {
    // Desregistrarse del torneo
    const userId = 'mock-user-123'; // Mock user ID
    
    const registrationIndex = mockRegistrations.findIndex(
      r => r.tournamentId === tournamentId && r.userId === userId
    );
    
    if (registrationIndex === -1) {
      return res.status(404).json({ error: 'No estás registrado en este torneo' });
    }
    
    // TODO: Desregistrar en start.gg API
    
    mockRegistrations.splice(registrationIndex, 1);
    
    res.status(200).json({ message: 'Desregistrado exitosamente' });
  } 
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
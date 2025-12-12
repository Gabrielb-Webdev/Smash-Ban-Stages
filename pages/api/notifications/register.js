// API Route para registrar tokens de notificaciones push

// Mock storage para tokens - en producción usar base de datos
let mockPushTokens = [];

export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const { token, userId, platform } = req.body;
    
    if (!token || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Verificar si ya existe un token para este usuario
    const existingTokenIndex = mockPushTokens.findIndex(t => t.userId === userId);
    
    const tokenData = {
      token,
      userId,
      platform: platform || 'unknown',
      registeredAt: new Date().toISOString(),
      active: true,
    };
    
    if (existingTokenIndex !== -1) {
      // Actualizar token existente
      mockPushTokens[existingTokenIndex] = tokenData;
    } else {
      // Nuevo token
      mockPushTokens.push(tokenData);
    }
    
    console.log(`Push token registered for user ${userId}: ${token.substring(0, 20)}...`);
    
    res.status(200).json({
      message: 'Token registrado exitosamente',
      tokenId: `token-${Date.now()}`,
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Función helper para enviar notificaciones (para uso interno)
export async function sendPushNotification(userId, notification) {
  const userToken = mockPushTokens.find(t => t.userId === userId && t.active);
  
  if (!userToken) {
    console.log(`No active push token found for user ${userId}`);
    return;
  }
  
  try {
    // En producción, usar Expo's push notification service
    const message = {
      to: userToken.token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
    };
    
    // Aquí iría la llamada real al servicio de Expo
    console.log('Would send push notification:', message);
    
    // Simular envío exitoso
    return { success: true, messageId: `msg-${Date.now()}` };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: error.message };
  }
}
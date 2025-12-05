import fs from 'fs';
import path from 'path';

// En producción, usar una base de datos o almacenamiento persistente
// Por simplicidad, usamos archivo JSON local (solo funciona en desarrollo)
const CONFIG_FILE = path.join(process.cwd(), 'data', 'external-config.json');

// Configuración por defecto
const DEFAULT_CONFIG = {
  player1: { name: "Player 1" },
  player2: { name: "Player 2" },
  format: "BO3",
  actions: { createSession: false, resetSeries: false },
  lastUpdate: new Date().toISOString()
};

// Asegurar que el directorio existe
function ensureDataDir() {
  const dataDir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Leer configuración
function readConfig() {
  try {
    ensureDataDir();
    if (!fs.existsSync(CONFIG_FILE)) {
      writeConfig(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error leyendo configuración:', error);
    return DEFAULT_CONFIG;
  }
}

// Escribir configuración
function writeConfig(config) {
  try {
    ensureDataDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error escribiendo configuración:', error);
    return false;
  }
}

export default function handler(req, res) {
  // Configurar CORS para permitir acceso desde el panel de tu amigo
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Obtener configuración actual
    const config = readConfig();
    return res.status(200).json(config);
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    // Actualizar configuración
    try {
      const newConfig = req.body;
      
      // Validar datos básicos
      if (!newConfig.player1?.name || !newConfig.player2?.name) {
        return res.status(400).json({ 
          error: 'Nombres de jugadores requeridos' 
        });
      }

      // Actualizar timestamp
      newConfig.lastUpdate = new Date().toISOString();
      
      // Guardar configuración
      const success = writeConfig(newConfig);
      
      if (success) {
        return res.status(200).json({ 
          success: true, 
          message: 'Configuración actualizada',
          config: newConfig 
        });
      } else {
        return res.status(500).json({ 
          error: 'Error guardando configuración' 
        });
      }
    } catch (error) {
      console.error('Error procesando configuración:', error);
      return res.status(400).json({ 
        error: 'Datos inválidos' 
      });
    }
  }

  // Método no soportado
  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).json({ error: 'Método no permitido' });
}
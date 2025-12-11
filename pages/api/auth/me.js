/**
 * API Route: /api/auth/me
 * Obtiene información del usuario autenticado
 */

import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Obtener token desde cookie o Authorization header
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Verificar JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Obtener usuario actualizado desde DB
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, startgg_user_id, gamer_tag, prefix, full_name, email, avatar_url, location_city, location_state, location_country, is_admin, is_active, created_at')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'User account is inactive' });
    }

    return res.status(200).json({ user });

  } catch (error) {
    console.error('Auth verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    return res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Extraer token de cookie o Authorization header
 */
function extractToken(req) {
  // 1. Intentar desde cookie (web)
  if (req.cookies?.session) {
    return req.cookies.session;
  }

  // 2. Intentar desde Authorization header (mobile app)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

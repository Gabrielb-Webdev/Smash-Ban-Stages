/**
 * Middleware de autenticación
 * Reutilizable para proteger rutas API
 */

import jwt from 'jsonwebtoken';
import { supabaseAdmin } from './supabase';

/**
 * Autentica la request y devuelve el usuario
 */
export async function authenticateRequest(req) {
  const token = extractToken(req);

  if (!token) {
    throw new Error('Unauthorized');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user || !user.is_active) {
      throw new Error('Unauthorized');
    }

    return user;
  } catch (error) {
    throw new Error('Unauthorized');
  }
}

/**
 * Verifica si el usuario es admin
 */
export async function requireAdmin(req) {
  const user = await authenticateRequest(req);

  if (!user.is_admin) {
    throw new Error('Forbidden');
  }

  return user;
}

/**
 * Extraer token de cookie o Authorization header
 */
function extractToken(req) {
  if (req.cookies?.session) {
    return req.cookies.session;
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

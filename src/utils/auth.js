export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('afk_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function logout() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('afk_user');
}

/**
 * Verifica la sesión contra el servidor y devuelve { isAdmin, user } fresco.
 * - Si no hay token en localStorage → null
 * - Si el token es inválido/expirado → null (y limpia localStorage)
 * Esto evita que isAdmin se tome de localStorage (que puede ser editado por el usuario).
 */
export async function verifySession() {
  const stored = getStoredUser();
  if (!stored?.access_token) return null;
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${stored.access_token}` },
    });
    if (!res.ok) {
      // Token inválido → limpiar sesión
      logout();
      return null;
    }
    const data = await res.json();
    // Actualizar isAdmin y adminCommunities en localStorage con valores frescos del servidor
    localStorage.setItem('afk_user', JSON.stringify({
      ...stored,
      isAdmin: data.isAdmin,
      adminCommunities: data.adminCommunities || [],
      user: data.user,
    }));
    return data;
  } catch {
    return null;
  }
}

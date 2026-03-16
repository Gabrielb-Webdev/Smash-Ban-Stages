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

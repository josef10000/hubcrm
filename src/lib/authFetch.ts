import { auth } from './firebase';

/**
 * Authenticated fetch wrapper — automatically includes Firebase ID token
 * in the Authorization header for API calls.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (user) {
    try {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (e) {
      console.error('Failed to get Firebase ID token:', e);
    }
  }

  return fetch(url, { ...options, headers });
}

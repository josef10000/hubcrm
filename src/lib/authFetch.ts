import { auth } from './firebase';

/**
 * Authenticated fetch wrapper — automatically includes Firebase ID token
 * in the Authorization header for API calls.
 * Uses getIdToken(true) to force refresh if the token is near expiry.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  let headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  // Only set Content-Type if not already set (allows FormData to work)
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (user) {
    try {
      // Force refresh to avoid expired token errors on long sessions
      const token = await user.getIdToken(/* forceRefresh */ true);
      headers['Authorization'] = `Bearer ${token}`;
    } catch (e) {
      console.error('Failed to get Firebase ID token:', e);
    }
  }

  const response = await fetch(url, { ...options, headers });

  // If 401, try once more with a forced refresh
  if (response.status === 401 && user) {
    try {
      const freshToken = await user.getIdToken(true);
      headers['Authorization'] = `Bearer ${freshToken}`;
      return fetch(url, { ...options, headers });
    } catch (e) {
      console.error('Token refresh retry failed:', e);
    }
  }

  return response;
}


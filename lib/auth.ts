import { adminAuth } from './firebase-admin';

export interface AuthedUser {
  uid: string;
  email: string | undefined;
}

/**
 * Verifies the Firebase ID token from the Authorization: Bearer header.
 * Throws a 401 Response if the token is missing or invalid.
 */
export async function requireAuth(request: Request): Promise<AuthedUser> {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  const token = match[1];
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    throw new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
}

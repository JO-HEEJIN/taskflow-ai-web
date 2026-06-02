import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';

// Lazily created so process.env is read at request time (after dotenv.config runs),
// and so Google's cert cache is reused across requests.
let client: OAuth2Client | null = null;
function getClient(clientId: string): OAuth2Client {
  if (!client) client = new OAuth2Client(clientId);
  return client;
}

/**
 * Verifies a Google ID token from the Authorization: Bearer <token> header,
 * derives the trusted email, and uses it as the userId. This replaces blind
 * trust of the client-supplied x-user-id header (which allowed impersonation).
 *
 * Guests never hit these routes (they use localStorage on the client), so this
 * is safe to apply to authenticated-only data routers.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    if (!GOOGLE_CLIENT_ID) {
      console.error('❌ GOOGLE_CLIENT_ID not configured; cannot verify auth');
      res.status(500).json({ error: 'Authentication not configured' });
      return;
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const idToken = authHeader.slice('Bearer '.length).trim();

    const ticket = await getClient(GOOGLE_CLIENT_ID).verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const email = payload?.email;

    if (!email || payload?.email_verified === false) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Trusted identity. Overwrite x-user-id so existing route code uses the
    // verified value instead of whatever the client claimed.
    req.headers['x-user-id'] = email;
    next();
  } catch (err) {
    console.error('❌ Auth verification failed:', err instanceof Error ? err.message : err);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

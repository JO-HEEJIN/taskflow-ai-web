import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';

// Lazily created so process.env is read at request time (after dotenv.config runs),
// and so Google's cert cache is reused across requests.
let client: OAuth2Client | null = null;
function getClient(clientId: string): OAuth2Client {
  if (!client) client = new OAuth2Client(clientId);
  return client;
}

// Try to verify the Authorization: Bearer <google-id-token> header.
// Returns the trusted email on success, or a failure reason string.
async function verifyToken(req: Request): Promise<{ email: string } | { error: string }> {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  if (!GOOGLE_CLIENT_ID) return { error: 'GOOGLE_CLIENT_ID not configured' };

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'missing Authorization header' };
  }

  try {
    const idToken = authHeader.slice('Bearer '.length).trim();
    const ticket = await getClient(GOOGLE_CLIENT_ID).verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email || payload.email_verified === false) {
      return { error: 'token missing verified email' };
    }
    return { email: payload.email };
  } catch (err) {
    return { error: `verify failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Authenticates requests via a Google ID token (Authorization: Bearer ...),
 * derives the trusted email, and overwrites x-user-id with it — replacing blind
 * trust of the client-supplied x-user-id header (which allowed impersonation).
 *
 * Canary rollout: when AUTH_ENFORCE !== 'true' (default), runs in LOG-ONLY mode —
 * it verifies and logs but never rejects, so we can confirm real users' tokens
 * verify before enforcing. Set AUTH_ENFORCE=true to start rejecting.
 *
 * Guests never hit these routes (they use localStorage on the client).
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const enforce = process.env.AUTH_ENFORCE === 'true';
  const claimed = req.headers['x-user-id'];
  const result = await verifyToken(req);

  if ('email' in result) {
    if (claimed && claimed !== result.email) {
      console.warn(`[auth] token email (${result.email}) != x-user-id (${claimed})`);
    }
    req.headers['x-user-id'] = result.email; // trusted identity
    console.log(`[auth] OK ${req.method} ${req.path} as ${result.email} (enforce=${enforce})`);
    next();
    return;
  }

  if (enforce) {
    console.warn(`[auth] REJECT ${req.method} ${req.path}: ${result.error}`);
    res.status(401).json({ error: 'Authentication failed' });
    return;
  }

  // Log-only canary: allow through using the (untrusted) x-user-id, but record it
  console.warn(`[auth][log-only] would REJECT ${req.method} ${req.path}: ${result.error} (x-user-id=${claimed ?? 'none'})`);
  next();
}

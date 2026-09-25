import { createHmac, randomBytes } from 'crypto';

// A signed, stateless "state" value carried through the OAuth redirect
// round-trip (browser -> Google/Microsoft -> back to our callback). We
// can't rely on server memory or a cookie surviving a cross-site redirect
// in every browser, so instead we sign the role/company info with
// SESSION_SECRET and verify the signature when it comes back. This also
// doubles as CSRF protection: nobody can forge a valid state without the
// secret.

export type OAuthState = {
  role: 'hr' | 'employee';
  companySlug: string;
  companyLabel: string;
};

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error('SESSION_SECRET is not set (or is shorter than 32 characters).');
  }
  return s;
}

export function encodeState(payload: OAuthState): string {
  const nonce = randomBytes(8).toString('hex');
  const json = JSON.stringify({ ...payload, nonce });
  const b64 = Buffer.from(json, 'utf8').toString('base64url');
  const sig = createHmac('sha256', secret()).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

export function decodeState(state: string): OAuthState | null {
  const [b64, sig] = state.split('.');
  if (!b64 || !sig) return null;
  const expected = createHmac('sha256', secret()).update(b64).digest('base64url');
  if (sig.length !== expected.length || sig !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (parsed?.role !== 'hr' && parsed?.role !== 'employee') return null;
    if (typeof parsed.companySlug !== 'string') return null;
    return { role: parsed.role, companySlug: parsed.companySlug, companyLabel: parsed.companyLabel ?? '' };
  } catch {
    return null;
  }
}

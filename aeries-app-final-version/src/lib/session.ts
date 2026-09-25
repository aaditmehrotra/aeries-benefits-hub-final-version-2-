import { cookies } from 'next/headers';
import { getIronSession, type SessionOptions } from 'iron-session';

export type SessionData = {
  role?: 'hr' | 'employee';
  identity?: string;
  companySlug?: string;
  companyId?: string;
};

function requireSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET is not set (or is shorter than 32 characters). Generate one with `openssl rand -base64 32` and add it to your environment variables.'
    );
  }
  return secret;
}

export function sessionOptions(): SessionOptions {
  return {
    password: requireSecret(),
    cookieName: 'aeries_session',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    }
  };
}

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions());
}

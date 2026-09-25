import { NextRequest, NextResponse } from 'next/server';
import { PROVIDERS, isProviderId } from '@/lib/oauthProviders';
import { encodeState } from '@/lib/oauthState';
import { slugify } from '@/lib/slug';

// GET /api/auth/google/start?role=hr&companyCode=acme-india
// GET /api/auth/microsoft/start?role=employee&companyCode=acme-india
//
// Kicks off the OAuth "authorization code" flow: bounces the browser to
// the provider's own sign-in page. Nothing here talks to Google/Microsoft
// server-to-server yet — that happens in ../callback once they redirect
// the user back to us with a one-time code.
export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  if (!isProviderId(params.provider)) {
    return NextResponse.json({ ok: false, error: 'Unknown sign-in provider.' }, { status: 404 });
  }
  const provider = params.provider;
  const config = PROVIDERS[provider];
  const clientId = config.clientId();
  if (!clientId) {
    return NextResponse.redirect(new URL(`/login?error=${provider}-not-configured`, req.url));
  }

  const role = req.nextUrl.searchParams.get('role') === 'employee' ? 'employee' : 'hr';
  const companyLabel = (req.nextUrl.searchParams.get('companyCode') ?? '').trim();
  const companySlug = slugify(companyLabel) || 'demo';

  const redirectUri = new URL(`/api/auth/${provider}/callback`, req.url).toString();
  const state = encodeState({ role, companySlug, companyLabel });

  const authUrl = new URL(config.authorizeUrl);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', config.scope);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  return NextResponse.redirect(authUrl.toString());
}

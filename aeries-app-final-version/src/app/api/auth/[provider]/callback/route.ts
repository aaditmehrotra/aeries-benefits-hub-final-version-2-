import { NextRequest, NextResponse } from 'next/server';
import { PROVIDERS, isProviderId } from '@/lib/oauthProviders';
import { decodeState } from '@/lib/oauthState';
import { completeSignIn } from '@/lib/signin';

// GET /api/auth/google/callback?code=...&state=...
// GET /api/auth/microsoft/callback?code=...&state=...
//
// The provider redirects the browser here after the person approves (or
// cancels) sign-in. We exchange the one-time `code` for an access token
// (server-to-server, using our client secret — never exposed to the
// browser), then use that token to ask the provider who this is.
export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}`, req.url));

  if (!isProviderId(params.provider)) return fail('unknown-provider');
  const provider = params.provider;
  const config = PROVIDERS[provider];

  const err = req.nextUrl.searchParams.get('error');
  if (err) return fail(err);

  const code = req.nextUrl.searchParams.get('code');
  const stateRaw = req.nextUrl.searchParams.get('state');
  if (!code || !stateRaw) return fail('missing-code');

  const state = decodeState(stateRaw);
  if (!state) return fail('bad-state');

  const clientId = config.clientId();
  const clientSecret = config.clientSecret();
  if (!clientId || !clientSecret) return fail(`${provider}-not-configured`);

  const redirectUri = new URL(`/api/auth/${provider}/callback`, req.url).toString();

  let tokenData: any;
  try {
    const tokenRes = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });
    if (!tokenRes.ok) return fail('token-exchange-failed');
    tokenData = await tokenRes.json();
  } catch {
    return fail('token-exchange-failed');
  }

  const accessToken = tokenData?.access_token;
  if (!accessToken) return fail('no-access-token');

  let profile: any;
  try {
    const profileRes = await fetch(config.userinfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!profileRes.ok) return fail('profile-fetch-failed');
    profile = await profileRes.json();
  } catch {
    return fail('profile-fetch-failed');
  }

  const email = config.extractEmail(profile);
  if (!email) return fail('no-verified-email');

  const result = await completeSignIn({
    role: state.role,
    identity: email.toLowerCase(),
    companySlug: state.companySlug,
    companyLabel: state.companyLabel
  });

  if (!result.ok) return fail(result.reason);

  return NextResponse.redirect(new URL(state.role === 'hr' ? '/hr' : '/employee', req.url));
}

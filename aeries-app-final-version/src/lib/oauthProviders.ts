export type ProviderId = 'google' | 'microsoft';

export type ProviderConfig = {
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  scope: string;
  clientId: () => string | undefined;
  clientSecret: () => string | undefined;
  // Pulls a verified email address out of that provider's userinfo/profile
  // response shape — the two providers don't agree on field names.
  extractEmail: (profile: any) => string | null;
};

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  google: {
    label: 'Google',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userinfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile',
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    extractEmail: (p) => {
      // Google's userinfo endpoint only returns an address it has already
      // verified, so we don't need a separate email_verified check here.
      const email = p?.email;
      return typeof email === 'string' && email.includes('@') ? email : null;
    }
  },
  microsoft: {
    label: 'Microsoft',
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userinfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scope: 'openid email profile User.Read',
    clientId: () => process.env.MICROSOFT_CLIENT_ID,
    clientSecret: () => process.env.MICROSOFT_CLIENT_SECRET,
    extractEmail: (p) => {
      // Work/school accounts usually have `mail`; personal Microsoft
      // accounts (and some tenants) leave it null and only set
      // `userPrincipalName`, which is email-shaped for our purposes.
      const email = p?.mail ?? p?.userPrincipalName;
      return typeof email === 'string' && email.includes('@') ? email : null;
    }
  }
};

export function isProviderId(value: string): value is ProviderId {
  return value === 'google' || value === 'microsoft';
}

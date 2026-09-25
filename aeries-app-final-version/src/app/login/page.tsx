'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const ERROR_MESSAGES: Record<string, string> = {
  'google-not-configured': "Google sign-in isn't set up on this deployment yet.",
  'microsoft-not-configured': "Microsoft sign-in isn't set up on this deployment yet.",
  'unknown-company': "We couldn't find that company code — check it with your HR team.",
  'no-verified-email': "That account doesn't have a verified email address, so we can't sign you in with it.",
  'unknown-provider': 'That sign-in option is not available.',
  access_denied: 'Sign-in was cancelled.'
};

function errorMessageFor(code: string | null): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? "That didn't work — please try again.";
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [role, setRole] = useState<'hr' | 'employee'>('hr');
  const [companyCode, setCompanyCode] = useState('');
  const error = errorMessageFor(searchParams.get('error'));

  function continueWith(provider: 'google' | 'microsoft') {
    const params = new URLSearchParams({ role, companyCode: companyCode.trim() });
    window.location.href = `/api/auth/${provider}/start?${params.toString()}`;
  }

  const canContinue = companyCode.trim().length > 0;

  return (
    <div className="flex min-h-screen flex-col items-center bg-bg px-4 py-10">
      <div className="mb-8 flex items-baseline gap-1.5">
        <span className="text-xl font-extrabold">Aeries</span>
        <span className="text-xl font-medium text-accent">Benefits Hub</span>
      </div>

      <div className="card w-full max-w-md">
        <div className="mb-5 flex gap-1 rounded-xl bg-bg p-1">
          <button
            onClick={() => setRole('hr')}
            className={`flex-1 rounded-lg py-2 text-sm font-bold ${role === 'hr' ? 'bg-accent text-white' : 'text-muted'}`}
          >
            HR representative
          </button>
          <button
            onClick={() => setRole('employee')}
            className={`flex-1 rounded-lg py-2 text-sm font-bold ${role === 'employee' ? 'bg-accent text-white' : 'text-muted'}`}
          >
            Employee
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-extrabold">
              {role === 'hr' ? 'Sign in to your benefits portal' : 'Sign in to view your cover'}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Enter your company code, then continue with your work account — no password or code needed.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              {role === 'hr' ? 'Company code' : 'Company code (from your HR team)'}
            </label>
            <input
              className="input"
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value)}
              placeholder="e.g. acme-india"
            />
            <span className="mt-1 block text-xs text-muted">
              {role === 'hr'
                ? 'Choose a short code for your company — use the same one every time you sign in.'
                : "Ask your HR team for this if you're not sure."}
            </span>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button disabled={!canContinue} onClick={() => continueWith('google')} className="btn-primary">
            Continue with Google
          </button>
          <button disabled={!canContinue} onClick={() => continueWith('microsoft')} className="btn-outline w-full text-center">
            Continue with Microsoft
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

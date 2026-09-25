import { getDb } from './db';
import { companies, employees, hrUsers } from './schema';
import { eq } from 'drizzle-orm';
import { getSession } from './session';

// Shared by both OAuth callbacks: finds (or, for HR, creates) the company,
// records the person against it, and starts their session. This is the
// same company/employee bookkeeping the old OTP `verify` route used to do
// once a code checked out — the only thing that's changed is what proves
// the identity belongs to this person (a verified OAuth email instead of
// a 6-digit code).
export async function completeSignIn(params: {
  role: 'hr' | 'employee';
  identity: string;
  companySlug: string;
  companyLabel: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { role, identity, companySlug: slug, companyLabel } = params;
  const db = getDb();
  let company = (await db.select().from(companies).where(eq(companies.slug, slug)))[0];

  if (role === 'hr') {
    if (!company) {
      const [created] = await db
        .insert(companies)
        .values({ slug, name: companyLabel || slug })
        .returning();
      company = created;
    }
    await db.insert(hrUsers).values({ companyId: company.id, identity }).onConflictDoNothing();
  } else {
    if (!company) {
      return { ok: false, reason: 'unknown-company' };
    }
    await db.insert(employees).values({ companyId: company.id, identity }).onConflictDoNothing();
  }

  const session = await getSession();
  session.role = role;
  session.identity = identity;
  session.companySlug = slug;
  session.companyId = company.id;
  await session.save();

  return { ok: true };
}

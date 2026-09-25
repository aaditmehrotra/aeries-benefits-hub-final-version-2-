import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { companies } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { dialsForTier, customizerPrice, closestPreset, CUSTOMIZER_DIALS, PLAN_LABELS, type PlanTier } from '@/lib/pricing';

export async function GET() {
  const session = await getSession();
  if (!session.companyId) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }
  const db = getDb();
  const [company] = await db.select().from(companies).where(eq(companies.id, session.companyId));
  if (!company) return NextResponse.json({ ok: false, error: 'Company not found.' }, { status: 404 });
  return NextResponse.json({ ok: true, company });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session.companyId || session.role !== 'hr') {
    return NextResponse.json({ ok: false, error: 'Only a signed-in HR admin can update the plan.' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }

  const db = getDb();
  const [existing] = await db.select().from(companies).where(eq(companies.id, session.companyId));
  if (!existing) return NextResponse.json({ ok: false, error: 'Company not found.' }, { status: 404 });

  const mode = body.mode ?? 'tier';

  // --- Pre-defined package pick -------------------------------------------
  if (mode === 'tier') {
    const tier = body.tier as PlanTier | undefined;
    const employeeCount = Number(body.employeeCount);
    if (!tier || !['essential', 'growth', 'comprehensive'].includes(tier)) {
      return NextResponse.json({ ok: false, error: 'Pick a valid plan tier.' }, { status: 400 });
    }
    const dials = dialsForTier(tier, existing.name);
    const [updated] = await db
      .update(companies)
      .set({
        ...dials,
        employeeCount: Number.isFinite(employeeCount) && employeeCount > 0 ? Math.round(employeeCount) : existing.employeeCount,
        updatedAt: new Date()
      })
      .where(eq(companies.id, session.companyId))
      .returning();
    return NextResponse.json({ ok: true, company: updated });
  }

  // --- Full Customizer dial-by-dial save ----------------------------------
  if (mode === 'custom') {
    const dials: Record<string, number> = {};
    for (const dial of CUSTOMIZER_DIALS) {
      const raw = Number(body[dial.key]);
      if (!Number.isFinite(raw)) {
        return NextResponse.json({ ok: false, error: `Missing or invalid ${dial.key}.` }, { status: 400 });
      }
      dials[dial.key] = Math.min(dial.max, Math.max(dial.min, Math.round(raw)));
    }
    const familyParents = Boolean(body.familyParents);
    const familyParentsInLaw = Boolean(body.familyParentsInLaw);
    const employeeCount = Number(body.employeeCount);
    const customDials = {
      hospLacs: dials.hospLacs,
      opdTier: dials.opdTier,
      maternity: dials.maternity,
      ahcWallet: dials.ahcWallet,
      blackWallet: dials.blackWallet,
      gtlLacs: dials.gtlLacs,
      gpaLacs: dials.gpaLacs,
      familyParents,
      familyParentsInLaw
    };
    const nearest = closestPreset(customDials);
    const [updated] = await db
      .update(companies)
      .set({
        ...customDials,
        selectedPackage: 'custom',
        planName: `${existing.name} — Custom (closest to ${PLAN_LABELS[nearest]})`,
        familySpouse: true,
        familyChildren: true,
        employeeCount: Number.isFinite(employeeCount) && employeeCount > 0 ? Math.round(employeeCount) : existing.employeeCount,
        updatedAt: new Date()
      })
      .where(eq(companies.id, session.companyId))
      .returning();
    return NextResponse.json({ ok: true, company: updated, price: customizerPrice(customDials), closest: nearest });
  }

  // --- Schedule a Demo booking ---------------------------------------------
  if (mode === 'demo') {
    if (body.demoAt === null) {
      const [updated] = await db
        .update(companies)
        .set({ demoAt: null, demoConfirmed: false, updatedAt: new Date() })
        .where(eq(companies.id, session.companyId))
        .returning();
      return NextResponse.json({ ok: true, company: updated });
    }
    const demoAt = new Date(body.demoAt);
    if (Number.isNaN(demoAt.getTime())) {
      return NextResponse.json({ ok: false, error: 'Pick a valid demo date and time.' }, { status: 400 });
    }
    const [updated] = await db
      .update(companies)
      .set({ demoAt, demoConfirmed: true, updatedAt: new Date() })
      .where(eq(companies.id, session.companyId))
      .returning();
    return NextResponse.json({ ok: true, company: updated });
  }

  return NextResponse.json({ ok: false, error: 'Unknown update mode.' }, { status: 400 });
}

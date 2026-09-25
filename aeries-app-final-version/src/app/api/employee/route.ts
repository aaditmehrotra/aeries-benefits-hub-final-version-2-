import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { employees } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';
import {
  FLEX_ADD_ONS,
  MARKETPLACE_ITEMS,
  PENDING_ACTIONS,
  GMC_SUPER_TIER_CHOICES,
  GMC_DED_CHOICES,
  OPD_TOPUP_TIER_CHOICES
} from '@/lib/pricing';

// Plain booleans the client may flip with no further validation.
const BOOLEAN_KEYS = [
  ...FLEX_ADD_ONS.map((a) => a.key),
  ...MARKETPLACE_ITEMS.map((m) => m.key),
  ...PENDING_ACTIONS.map((p) => p.key),
  'gmcSuperEmpAdded',
  'gmcBaseDepAdded',
  'gmcSuperDepAdded',
  'opdEmpAdded',
  'opdDepAdded'
];
// De-dupe (cultFit appears in both Flex Add-ons and the marketplace catalog).
const ADD_ON_KEYS = Array.from(new Set(BOOLEAN_KEYS));

// Free-form integers: age fields and dependent headcounts.
const AGE_AND_COUNT_KEYS: Record<string, { min: number; max: number }> = {
  employeeAge: { min: 18, max: 80 },
  spouseCount: { min: 0, max: 1 },
  childCount: { min: 0, max: 6 },
  parentCount: { min: 0, max: 2 },
  parentInLawCount: { min: 0, max: 2 },
  depSpouseAge: { min: 18, max: 80 },
  depChildAge: { min: 0, max: 30 },
  depParentAge: { min: 40, max: 100 },
  depParentInLawAge: { min: 40, max: 100 }
};

// Integers that must come from a known choice list (tiers/deductibles).
const CHOICE_KEYS: Record<string, number[]> = {
  gmcSuperEmpTier: GMC_SUPER_TIER_CHOICES,
  gmcSuperDepTier: GMC_SUPER_TIER_CHOICES,
  gmcSuperEmpDed: GMC_DED_CHOICES,
  gmcSuperDepDed: GMC_DED_CHOICES,
  opdEmpTier: OPD_TOPUP_TIER_CHOICES,
  opdDepTier: OPD_TOPUP_TIER_CHOICES
};

export async function GET() {
  const session = await getSession();
  if (!session.companyId || session.role !== 'employee' || !session.identity) {
    return NextResponse.json({ ok: false, error: 'Not signed in as an employee.' }, { status: 401 });
  }
  const db = getDb();
  const [row] = await db
    .select()
    .from(employees)
    .where(and(eq(employees.companyId, session.companyId), eq(employees.identity, session.identity)));

  if (!row) return NextResponse.json({ ok: false, error: 'Employee record not found.' }, { status: 404 });
  return NextResponse.json({ ok: true, employee: row });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session.companyId || session.role !== 'employee' || !session.identity) {
    return NextResponse.json({ ok: false, error: 'Not signed in as an employee.' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }

  const patch: Record<string, boolean | number> = {};

  for (const key of ADD_ON_KEYS) {
    if (key in body) patch[key] = Boolean(body[key]);
  }

  for (const [key, range] of Object.entries(AGE_AND_COUNT_KEYS)) {
    if (key in body) {
      const raw = Number(body[key]);
      if (!Number.isFinite(raw)) continue;
      patch[key] = Math.min(range.max, Math.max(range.min, Math.round(raw)));
    }
  }

  for (const [key, choices] of Object.entries(CHOICE_KEYS)) {
    if (key in body) {
      const raw = Number(body[key]);
      if (choices.includes(raw)) patch[key] = raw;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: 'Nothing valid to save.' }, { status: 400 });
  }

  const db = getDb();
  const [updated] = await db
    .update(employees)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(employees.companyId, session.companyId), eq(employees.identity, session.identity)))
    .returning();

  if (!updated) return NextResponse.json({ ok: false, error: 'Employee record not found.' }, { status: 404 });
  return NextResponse.json({ ok: true, employee: updated });
}

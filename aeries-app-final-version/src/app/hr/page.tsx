'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PLAN_BASE,
  PLAN_LABELS,
  fmtInr,
  customizerPrice,
  closestPreset,
  OPD_TIER_CHOICES,
  MATERNITY_CHOICES,
  AHC_WALLET_CHOICES,
  BLACK_WALLET_CHOICES,
  type PlanTier,
  type CustomizerDials
} from '@/lib/pricing';
import { Sidebar, type NavItem } from '@/components/Sidebar';

type Company = {
  id: string;
  slug: string;
  name: string;
  employeeCount: number;
  selectedPackage: string;
  planName: string;
  hospLacs: number;
  opdTier: number;
  maternity: number;
  ahcWallet: number;
  blackWallet: number;
  gtlLacs: number;
  gpaLacs: number;
  familyParents: boolean;
  familyParentsInLaw: boolean;
  demoAt: string | null;
  demoConfirmed: boolean;
};

const NAV: NavItem[] = [
  { key: 'packages', label: 'Pre-defined Packages', available: true },
  { key: 'customizer', label: 'Customizer', available: true },
  { key: 'aspects', label: 'Aeries Flex Benefits', available: true },
  { key: 'saved', label: 'Saved Plans', available: true },
  { key: 'demo', label: 'Schedule a Demo', available: true }
];

function nextBusinessSlots(count: number): Date[] {
  const slots: Date[] = [];
  const cursor = new Date();
  cursor.setSeconds(0, 0);
  cursor.setDate(cursor.getDate() + 1);
  while (slots.length < count) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      for (const hour of [11, 15]) {
        if (slots.length >= count) break;
        const slot = new Date(cursor);
        slot.setHours(hour, 0, 0, 0);
        slots.push(slot);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return slots;
}

export default function HrPage() {
  const router = useRouter();
  const [section, setSection] = useState('packages');
  const [company, setCompany] = useState<Company | null>(null);
  const [employeeCount, setEmployeeCount] = useState(50);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState('');
  const [loading, setLoading] = useState(true);

  const [dials, setDials] = useState<CustomizerDials | null>(null);

  useEffect(() => {
    (async () => {
      const me = await fetch('/api/auth/me').then((r) => r.json());
      if (!me.ok || me.role !== 'hr') {
        router.push('/login');
        return;
      }
      const res = await fetch('/api/company').then((r) => r.json());
      if (res.ok) {
        setCompany(res.company);
        setEmployeeCount(res.company.employeeCount);
        setDials({
          hospLacs: res.company.hospLacs,
          opdTier: res.company.opdTier,
          maternity: res.company.maternity,
          ahcWallet: res.company.ahcWallet,
          blackWallet: res.company.blackWallet,
          gtlLacs: res.company.gtlLacs,
          gpaLacs: res.company.gpaLacs,
          familyParents: res.company.familyParents,
          familyParentsInLaw: res.company.familyParentsInLaw
        });
      }
      setLoading(false);
    })();
  }, [router]);

  const demoSlots = useMemo(() => nextBusinessSlots(6), []);
  const [chosenSlot, setChosenSlot] = useState<Date | null>(null);

  async function pickTier(tier: PlanTier) {
    setSaving(true);
    setSavedNote('');
    try {
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'tier', tier, employeeCount })
      });
      const data = await res.json();
      if (data.ok) {
        setCompany(data.company);
        setDials({
          hospLacs: data.company.hospLacs,
          opdTier: data.company.opdTier,
          maternity: data.company.maternity,
          ahcWallet: data.company.ahcWallet,
          blackWallet: data.company.blackWallet,
          gtlLacs: data.company.gtlLacs,
          gpaLacs: data.company.gpaLacs,
          familyParents: data.company.familyParents,
          familyParentsInLaw: data.company.familyParentsInLaw
        });
        setSavedNote('Saved & synced to employees ✓');
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveCustom() {
    if (!dials) return;
    setSaving(true);
    setSavedNote('');
    try {
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'custom', ...dials, employeeCount })
      });
      const data = await res.json();
      if (data.ok) {
        setCompany(data.company);
        setSavedNote(`Saved as a custom plan (closest to ${PLAN_LABELS[data.closest as PlanTier]}) & synced to employees ✓`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function bookDemo() {
    if (!chosenSlot) return;
    setSaving(true);
    setSavedNote('');
    try {
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'demo', demoAt: chosenSlot.toISOString() })
      });
      const data = await res.json();
      if (data.ok) {
        setCompany(data.company);
        setSavedNote('Demo booked ✓');
      }
    } finally {
      setSaving(false);
    }
  }

  async function cancelDemo() {
    setSaving(true);
    try {
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'demo', demoAt: null })
      });
      const data = await res.json();
      if (data.ok) {
        setCompany(data.company);
        setChosenSlot(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (loading || !dials) return <div className="p-10 text-sm text-muted">Loading…</div>;

  const liveCustomPrice = customizerPrice(dials);
  const liveClosest = closestPreset(dials);

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar items={NAV} activeKey={section} onSelect={setSection} onLogout={logout} />

      <main className="flex-1 px-10 py-10">
        {section === 'packages' && (
          <>
            <h1 className="text-2xl font-extrabold">Choose a plan for {company?.name}</h1>
            <p className="mt-1 text-sm text-muted">
              Company code: <strong className="text-ink">{company?.slug}</strong> — share this with your employees so their sign-in shows this same plan.
            </p>

            <div className="mt-6 max-w-xs">
              <label className="mb-1.5 block text-sm font-bold">Number of employees</label>
              <input
                type="number"
                min={1}
                className="input"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {(Object.keys(PLAN_BASE) as PlanTier[]).map((tier) => {
                const plan = PLAN_BASE[tier];
                const isActive = company?.selectedPackage === tier;
                return (
                  <div key={tier} className={`card flex flex-col gap-3 ${isActive ? 'ring-2 ring-accent' : ''}`}>
                    <div className="text-sm font-bold text-muted">{PLAN_LABELS[tier]}</div>
                    <div>
                      <span className="text-3xl font-extrabold text-accent">₹{fmtInr(plan.price)}</span>
                      <span className="text-sm text-muted"> /mo/family</span>
                      <div className="mt-1 text-xs text-accentDark">
                        ≈ ₹{fmtInr(plan.price * employeeCount)} /mo total for {employeeCount} employees
                      </div>
                    </div>
                    <ul className="flex-1 text-sm text-muted">
                      <li>GMC {plan.hospLacs}L hospitalisation</li>
                      <li>OPD wallet ₹{fmtInr(plan.opdTier)}</li>
                      <li>GTL {plan.gtlLacs}L per employee</li>
                      <li>GPA {plan.gpaLacs}L per employee</li>
                    </ul>
                    <button disabled={saving} onClick={() => pickTier(tier)} className={isActive ? 'btn-primary' : 'btn-outline'}>
                      {isActive ? 'Current plan' : `Choose ${PLAN_LABELS[tier]}`}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-muted">Want to mix and match instead of a preset? Use the Customizer.</p>
            {savedNote && <p className="mt-4 text-sm font-bold text-green-600">{savedNote}</p>}
          </>
        )}

        {section === 'customizer' && (
          <>
            <h1 className="text-2xl font-extrabold">Build a custom plan</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Move each dial independently. The price updates live and always reflects exactly what you've set below —
              no rounding to the nearest preset.
            </p>

            <div className="mt-6 grid max-w-3xl grid-cols-1 gap-5">
              <Stepper
                label="Hospitalisation cover (GMC)"
                value={dials.hospLacs}
                unit="L"
                min={3}
                max={10}
                step={1}
                onChange={(v) => setDials({ ...dials, hospLacs: v })}
              />
              <ChipRow
                label="OPD wallet"
                value={dials.opdTier}
                choices={OPD_TIER_CHOICES}
                fmt={(v) => `₹${fmtInr(v)}`}
                onChange={(v) => setDials({ ...dials, opdTier: v })}
              />
              <ChipRow
                label="Maternity cover"
                value={dials.maternity}
                choices={MATERNITY_CHOICES}
                fmt={(v) => (v === 0 ? 'None' : `₹${fmtInr(v)}`)}
                onChange={(v) => setDials({ ...dials, maternity: v })}
              />
              <ChipRow
                label="Annual health check-up wallet"
                value={dials.ahcWallet}
                choices={AHC_WALLET_CHOICES}
                fmt={(v) => `₹${fmtInr(v)}`}
                onChange={(v) => setDials({ ...dials, ahcWallet: v })}
              />
              <ChipRow
                label="Wellness / Black wallet"
                value={dials.blackWallet}
                choices={BLACK_WALLET_CHOICES}
                fmt={(v) => (v === 0 ? 'None' : `₹${fmtInr(v)}`)}
                onChange={(v) => setDials({ ...dials, blackWallet: v })}
              />
              <Stepper
                label="Group Term Life (GTL)"
                value={dials.gtlLacs}
                unit="L"
                min={10}
                max={50}
                step={5}
                onChange={(v) => setDials({ ...dials, gtlLacs: v })}
              />
              <Stepper
                label="Group Personal Accident (GPA)"
                value={dials.gpaLacs}
                unit="L"
                min={10}
                max={25}
                step={5}
                onChange={(v) => setDials({ ...dials, gpaLacs: v })}
              />

              <div className="card">
                <div className="mb-2 text-sm font-bold">Family coverage</div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked disabled className="h-4 w-4" /> Spouse (always included)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked disabled className="h-4 w-4" /> Children (always included)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={dials.familyParents}
                      onChange={(e) => setDials({ ...dials, familyParents: e.target.checked })}
                      className="h-4 w-4"
                    />
                    Parents (+₹150/mo)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={dials.familyParentsInLaw}
                      onChange={(e) => setDials({ ...dials, familyParentsInLaw: e.target.checked })}
                      className="h-4 w-4"
                    />
                    Parents-in-law (+₹150/mo)
                  </label>
                </div>
              </div>

              <div className="max-w-xs">
                <label className="mb-1.5 block text-sm font-bold">Number of employees</label>
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>

              <div className="card flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-muted">Live price</div>
                  <div className="text-2xl font-extrabold text-accent">₹{fmtInr(liveCustomPrice)} /mo/family</div>
                  <div className="text-xs text-accentDark">
                    ≈ ₹{fmtInr(liveCustomPrice * employeeCount)} /mo total · closest to {PLAN_LABELS[liveClosest]}
                  </div>
                </div>
                <button disabled={saving} onClick={saveCustom} className="btn-primary !w-auto px-6">
                  {saving ? 'Saving…' : 'Save custom plan'}
                </button>
              </div>
              {savedNote && <p className="text-sm font-bold text-green-600">{savedNote}</p>}
            </div>
          </>
        )}

        {section === 'aspects' && (
          <>
            <h1 className="text-2xl font-extrabold">Aeries Flex Benefits, powered by Alyve</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              How your sponsored plan breaks down, and what employees can add on their own.
            </p>

            <div className="mt-8 text-xs font-extrabold uppercase tracking-wide text-accentDark">
              Coverage for employees + family
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <InfoCard title="GMC — Group Medical Cover">
                Hospitalisation cover for the employee and covered family members. Maternity, when included, is part
                of this same GMC cover rather than a separate policy.
              </InfoCard>
              <InfoCard title="OPD — Outpatient Wallet">
                A wallet for consultations, diagnostics, and pharmacy spend. The wallet amount doesn't scale
                automatically with family size, but sub-limits per family member can be set on request.
              </InfoCard>
              <InfoCard title="AHC — Annual Health Check-up">
                A yearly diagnostic panel, available as an at-home visit or at a network diagnostic centre, funded
                from the AHC wallet above.
              </InfoCard>
            </div>

            <div className="mt-8 text-xs font-extrabold uppercase tracking-wide text-accentDark">
              Coverage for employees only
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoCard title="GTL — Group Term Life">
                A term life payout to the employee's nominee, sized to the GTL cover you've set — this doesn't extend
                to dependents.
              </InfoCard>
              <InfoCard title="GPA — Group Personal Accident">
                Accidental death & disability cover for the employee, sized to the GPA cover you've set.
              </InfoCard>
            </div>

            <p className="mt-8 max-w-2xl text-xs text-muted">
              Employees can extend most of this to their dependents themselves, at their own cost, from their Aeries
              Flex Benefits page — see the age-banded top-up pricing there.
            </p>
          </>
        )}

        {section === 'saved' && (
          <>
            <h1 className="mb-2 text-2xl font-extrabold">Saved Plans</h1>
            <p className="mb-6 text-sm text-muted">
              Company code: <strong className="text-ink">{company?.slug}</strong> — share this with your employees so their sign-in shows this same plan.
            </p>
            {company ? (
              <div className="card flex max-w-2xl items-center justify-between">
                <div>
                  <strong className="text-[15px]">{company.planName}</strong>
                  <div className="mt-1 text-[13px] text-muted">
                    GMC {company.hospLacs}L · OPD ₹{fmtInr(company.opdTier)} · GTL {company.gtlLacs}L per employee · GPA {company.gpaLacs}L per employee
                  </div>
                  <div className="mt-1.5 text-[13px] font-bold text-accentDark">{company.employeeCount} employees</div>
                </div>
                <button
                  onClick={() => setSection(company.selectedPackage === 'custom' ? 'customizer' : 'packages')}
                  className="btn-outline"
                >
                  Edit
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted">No plan saved yet — pick one under Pre-defined Packages.</p>
            )}
          </>
        )}

        {section === 'demo' && (
          <>
            <h1 className="text-2xl font-extrabold">Schedule a demo</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Book time with the Alyve team to walk through your plan setup, or to see how Aeries looks for your
              employees.
            </p>

            {company?.demoConfirmed && company.demoAt ? (
              <div className="card mt-6 max-w-md">
                <div className="text-xs font-bold uppercase tracking-wide text-accentDark">Booked</div>
                <div className="mt-1 text-lg font-extrabold">
                  {new Date(company.demoAt).toLocaleString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </div>
                <button disabled={saving} onClick={cancelDemo} className="btn-outline mt-4 !w-auto px-4">
                  Cancel booking
                </button>
              </div>
            ) : (
              <>
                <div className="mt-6 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                  {demoSlots.map((slot) => {
                    const active = chosenSlot?.getTime() === slot.getTime();
                    return (
                      <button
                        key={slot.toISOString()}
                        onClick={() => setChosenSlot(slot)}
                        className={`card text-left transition ${active ? 'ring-2 ring-accent' : ''}`}
                      >
                        <div className="text-sm font-bold">
                          {slot.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                        <div className="text-xs text-muted">
                          {slot.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button disabled={saving || !chosenSlot} onClick={bookDemo} className="btn-primary mt-6 !w-auto px-6">
                  {saving ? 'Booking…' : 'Confirm booking'}
                </button>
              </>
            )}
            {savedNote && <p className="mt-4 text-sm font-bold text-green-600">{savedNote}</p>}
          </>
        )}
      </main>
    </div>
  );
}

function Stepper({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="card flex items-center justify-between">
      <div className="text-sm font-bold">{label}</div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - step))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line font-bold disabled:opacity-30"
        >
          −
        </button>
        <span className="w-16 text-center text-sm font-extrabold">
          {value}
          {unit}
        </span>
        <button
          type="button"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line font-bold disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}

function ChipRow({
  label,
  value,
  choices,
  fmt,
  onChange
}: {
  label: string;
  value: number;
  choices: number[];
  fmt: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="card">
      <div className="mb-2 text-sm font-bold">{label}</div>
      <div className="flex flex-wrap gap-2">
        {choices.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
              value === c ? 'border-accent bg-accentSoft text-accentDark' : 'border-line text-muted hover:bg-bg'
            }`}
          >
            {fmt(c)}
          </button>
        ))}
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="font-bold">{title}</div>
      <p className="mt-1.5 text-sm text-muted">{children}</p>
    </div>
  );
}

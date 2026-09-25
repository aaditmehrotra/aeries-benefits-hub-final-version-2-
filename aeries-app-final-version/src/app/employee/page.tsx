'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FLEX_ADD_ONS,
  MARKETPLACE_ITEMS,
  PENDING_ACTIONS,
  DEPENDENT_CATEGORIES,
  GMC_SUPER_TIER_CHOICES,
  GMC_DED_CHOICES,
  OPD_TOPUP_TIER_CHOICES,
  GMC_BASE_DEP_PRICE,
  gmcTopupPrice,
  opdTopupPrice,
  fmtInr
} from '@/lib/pricing';
import { Sidebar, type NavItem } from '@/components/Sidebar';

type Company = {
  name: string;
  hospLacs: number;
  opdTier: number;
  gtlLacs: number;
  gpaLacs: number;
};

type Employee = Record<string, boolean | string | number> & { identity: string };

export default function EmployeePage() {
  const router = useRouter();
  const [section, setSection] = useState('flex');
  const [company, setCompany] = useState<Company | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState('');

  useEffect(() => {
    (async () => {
      const me = await fetch('/api/auth/me').then((r) => r.json());
      if (!me.ok || me.role !== 'employee') {
        router.push('/login');
        return;
      }
      const [companyRes, employeeRes] = await Promise.all([
        fetch('/api/company').then((r) => r.json()),
        fetch('/api/employee').then((r) => r.json())
      ]);
      if (companyRes.ok) setCompany(companyRes.company);
      if (employeeRes.ok) setEmployee(employeeRes.employee);
      setLoading(false);
    })();
  }, [router]);

  const pendingLeft = PENDING_ACTIONS.filter((p) => employee?.[p.key]).length;

  const NAV: NavItem[] = [
    { key: 'flex', label: 'Flex Add-ons', available: true },
    { key: 'aeriesFlex', label: 'Aeries Flex Benefits', available: true },
    { key: 'benefits', label: 'My Benefits', available: true },
    { key: 'pending', label: 'Pending actions', available: true, badge: pendingLeft }
  ];

  function toggle(key: string) {
    if (!employee) return;
    setEmployee({ ...employee, [key]: !employee[key] });
    setSavedNote('');
  }

  function setField(key: string, value: number) {
    if (!employee) return;
    setEmployee({ ...employee, [key]: value });
    setSavedNote('');
  }

  async function saveKeys(keys: string[], note: string) {
    if (!employee) return;
    setSaving(true);
    try {
      const patch: Record<string, boolean | number> = {};
      for (const k of keys) patch[k] = employee[k] as boolean | number;
      const res = await fetch('/api/employee', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      const data = await res.json();
      if (data.ok) {
        setEmployee(data.employee);
        setSavedNote(note);
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveFlex() {
    await saveKeys(
      FLEX_ADD_ONS.map((a) => a.key),
      'Saved to your account ✓'
    );
  }

  async function saveDependentsAndTopups() {
    await saveKeys(
      [
        'employeeAge',
        ...DEPENDENT_CATEGORIES.flatMap((d) => [d.countField, d.ageField]),
        'gmcSuperEmpAdded',
        'gmcSuperEmpTier',
        'gmcSuperEmpDed',
        'gmcBaseDepAdded',
        'gmcSuperDepAdded',
        'gmcSuperDepTier',
        'gmcSuperDepDed',
        'opdEmpAdded',
        'opdEmpTier',
        'opdDepAdded',
        'opdDepTier'
      ],
      'Saved to your account ✓'
    );
  }

  async function saveMarketplace() {
    await saveKeys(MARKETPLACE_ITEMS.map((m) => m.key), 'Saved to your account ✓');
  }

  async function togglePending(key: string) {
    if (!employee) return;
    const next = { ...employee, [key]: !employee[key] };
    setEmployee(next);
    setSaving(true);
    try {
      const res = await fetch('/api/employee', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: next[key] })
      });
      const data = await res.json();
      if (data.ok) setEmployee(data.employee);
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (loading || !employee) return <div className="p-10 text-sm text-muted">Loading…</div>;

  const selectedCount = FLEX_ADD_ONS.filter((a) => employee?.[a.key]).length;
  const selectedTotal = FLEX_ADD_ONS.filter((a) => employee?.[a.key]).reduce((sum, a) => sum + a.cost, 0);
  const showStickyBar = section === 'flex';

  const employeeAge = Number(employee.employeeAge) || 30;

  const gmcSuperEmpPrice = gmcTopupPrice(Number(employee.gmcSuperEmpTier), Number(employee.gmcSuperEmpDed), employeeAge);
  const opdEmpPrice = opdTopupPrice(Number(employee.opdEmpTier), employeeAge);

  const totalDependents = DEPENDENT_CATEGORIES.reduce((sum, d) => sum + (Number(employee[d.countField]) || 0), 0);
  const gmcBaseDepPrice = GMC_BASE_DEP_PRICE * totalDependents;
  const gmcSuperDepPrice = DEPENDENT_CATEGORIES.reduce((sum, d) => {
    const count = Number(employee[d.countField]) || 0;
    if (count === 0) return sum;
    const age = Number(employee[d.ageField]) || 30;
    return sum + count * gmcTopupPrice(Number(employee.gmcSuperDepTier), Number(employee.gmcSuperDepDed), age);
  }, 0);
  const opdDepPrice = DEPENDENT_CATEGORIES.reduce((sum, d) => {
    const count = Number(employee[d.countField]) || 0;
    if (count === 0) return sum;
    const age = Number(employee[d.ageField]) || 30;
    return sum + count * opdTopupPrice(Number(employee.opdDepTier), age);
  }, 0);

  const marketplaceTotal = MARKETPLACE_ITEMS.filter((m) => employee[m.key]).reduce((sum, m) => sum + m.price, 0);

  const myMonthlyTotal =
    selectedTotal +
    (employee.gmcSuperEmpAdded ? gmcSuperEmpPrice : 0) +
    (employee.gmcBaseDepAdded ? gmcBaseDepPrice : 0) +
    (employee.gmcSuperDepAdded ? gmcSuperDepPrice : 0) +
    (employee.opdEmpAdded ? opdEmpPrice : 0) +
    (employee.opdDepAdded ? opdDepPrice : 0);

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar items={NAV} activeKey={section} onSelect={setSection} onLogout={logout} />

      <div className="flex flex-1 flex-col">
        <main className={`flex-1 px-10 py-10 ${showStickyBar ? 'pb-28' : ''}`}>
          {section === 'flex' && (
            <>
              <h1 className="text-2xl font-extrabold">Flex Add-ons</h1>
              <p className="mt-1 max-w-xl text-sm text-muted">
                Spend your flex credits to add more cover on top of what {company?.name ?? 'your company'} already gives you.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {FLEX_ADD_ONS.map((a) => {
                  const active = Boolean(employee?.[a.key]);
                  return (
                    <div key={a.key} className="card flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold">{a.label}</div>
                        <div className="text-xs text-muted">{a.blurb}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-sm font-extrabold">₹{fmtInr(a.cost)}</span>
                        <button onClick={() => toggle(a.key)} className={active ? 'btn-primary !w-auto px-4 !py-2' : 'btn-outline'}>
                          {active ? 'Added ✓' : 'Add'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {section === 'aeriesFlex' && (
            <>
              <h1 className="text-2xl font-extrabold">Aeries Flex Benefits powered by Alyve</h1>
              <p className="mt-1 max-w-xl text-sm text-muted">
                What {company?.name ?? 'your company'} sponsors today, plus dependent top-ups and wellness perks you
                can add for yourself.
              </p>

              <div className="mt-6 text-xs font-extrabold uppercase tracking-wide text-accentDark">Your sponsored benefits</div>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="GMC base" value={`₹${fmtInr((company?.hospLacs ?? 5) * 100000)}`} />
                <Stat label="OPD wallet" value={`₹${fmtInr(company?.opdTier ?? 10000)}`} />
                <Stat label="GTL" value={`₹${fmtInr((company?.gtlLacs ?? 25) * 100000)}`} />
                <Stat label="GPA" value={`₹${fmtInr((company?.gpaLacs ?? 15) * 100000)}`} />
              </div>

              <div className="mt-10 text-xs font-extrabold uppercase tracking-wide text-accentDark">Your details</div>
              <div className="mt-3 max-w-xs">
                <label className="mb-1.5 block text-sm font-bold">Your age</label>
                <input
                  type="number"
                  min={18}
                  max={80}
                  className="input"
                  value={employeeAge}
                  onChange={(e) => setField('employeeAge', Math.max(18, Math.min(80, parseInt(e.target.value, 10) || 18)))}
                />
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {DEPENDENT_CATEGORIES.map((d) => (
                  <div key={d.key} className="card">
                    <div className="font-bold">{d.label}</div>
                    <label className="mt-2 block text-xs font-bold text-muted">Count</label>
                    <select
                      className="input mt-1"
                      value={Number(employee[d.countField]) || 0}
                      onChange={(e) => setField(d.countField, parseInt(e.target.value, 10))}
                    >
                      {[0, 1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <label className="mt-2 block text-xs font-bold text-muted">Age</label>
                    <input
                      type="number"
                      className="input mt-1"
                      value={Number(employee[d.ageField]) || 0}
                      onChange={(e) => setField(d.ageField, parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-10 text-xs font-extrabold uppercase tracking-wide text-accentDark">GMC Super Top-up</div>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TopupCard
                  title="Employee"
                  price={gmcSuperEmpPrice}
                  active={Boolean(employee.gmcSuperEmpAdded)}
                  onToggle={() => toggle('gmcSuperEmpAdded')}
                >
                  <PillRow label="Sum insured" value={Number(employee.gmcSuperEmpTier)} choices={GMC_SUPER_TIER_CHOICES} fmt={(v) => `₹${fmtInr(v)}`} onChange={(v) => setField('gmcSuperEmpTier', v)} />
                  <PillRow label="Deductible" value={Number(employee.gmcSuperEmpDed)} choices={GMC_DED_CHOICES} fmt={(v) => `₹${fmtInr(v)}`} onChange={(v) => setField('gmcSuperEmpDed', v)} />
                </TopupCard>
                <TopupCard
                  title="Dependents"
                  price={gmcSuperDepPrice}
                  active={Boolean(employee.gmcSuperDepAdded)}
                  disabled={totalDependents === 0}
                  onToggle={() => toggle('gmcSuperDepAdded')}
                >
                  <PillRow label="Sum insured" value={Number(employee.gmcSuperDepTier)} choices={GMC_SUPER_TIER_CHOICES} fmt={(v) => `₹${fmtInr(v)}`} onChange={(v) => setField('gmcSuperDepTier', v)} />
                  <PillRow label="Deductible" value={Number(employee.gmcSuperDepDed)} choices={GMC_DED_CHOICES} fmt={(v) => `₹${fmtInr(v)}`} onChange={(v) => setField('gmcSuperDepDed', v)} />
                  {totalDependents === 0 && <p className="mt-2 text-xs text-muted">Add a dependent above first.</p>}
                </TopupCard>
              </div>

              <div className="mt-6 card flex items-center justify-between">
                <div>
                  <div className="font-bold">GMC Base Plan — extend to dependents</div>
                  <div className="text-xs text-muted">Extends your base GMC cover (not the Super Top-up) to all {totalDependents} dependent(s) above.</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-sm font-extrabold">₹{fmtInr(gmcBaseDepPrice)}/mo</span>
                  <button
                    disabled={totalDependents === 0}
                    onClick={() => toggle('gmcBaseDepAdded')}
                    className={employee.gmcBaseDepAdded ? 'btn-primary !w-auto px-4 !py-2' : 'btn-outline'}
                  >
                    {employee.gmcBaseDepAdded ? 'Added ✓' : 'Add'}
                  </button>
                </div>
              </div>

              <div className="mt-10 text-xs font-extrabold uppercase tracking-wide text-accentDark">OPD Top-ups</div>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TopupCard title="Employee" price={opdEmpPrice} active={Boolean(employee.opdEmpAdded)} onToggle={() => toggle('opdEmpAdded')}>
                  <PillRow label="Wallet tier" value={Number(employee.opdEmpTier)} choices={OPD_TOPUP_TIER_CHOICES} fmt={(v) => `₹${fmtInr(v)}`} onChange={(v) => setField('opdEmpTier', v)} />
                </TopupCard>
                <TopupCard
                  title="Dependents"
                  price={opdDepPrice}
                  active={Boolean(employee.opdDepAdded)}
                  disabled={totalDependents === 0}
                  onToggle={() => toggle('opdDepAdded')}
                >
                  <PillRow label="Wallet tier" value={Number(employee.opdDepTier)} choices={OPD_TOPUP_TIER_CHOICES} fmt={(v) => `₹${fmtInr(v)}`} onChange={(v) => setField('opdDepTier', v)} />
                  {totalDependents === 0 && <p className="mt-2 text-xs text-muted">Add a dependent above first.</p>}
                </TopupCard>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-muted">Dependent top-ups & OPD add ₹{fmtInr(gmcSuperEmpPrice * Number(!!employee.gmcSuperEmpAdded) + gmcBaseDepPrice * Number(!!employee.gmcBaseDepAdded) + gmcSuperDepPrice * Number(!!employee.gmcSuperDepAdded) + opdEmpPrice * Number(!!employee.opdEmpAdded) + opdDepPrice * Number(!!employee.opdDepAdded))}/mo to your total.</div>
                <button disabled={saving} onClick={saveDependentsAndTopups} className="btn-primary !w-auto px-6">
                  {saving ? 'Saving…' : 'Save this section'}
                </button>
              </div>
              {savedNote && <p className="mt-2 text-sm font-bold text-green-600">{savedNote}</p>}

              <div className="mt-12 text-xs font-extrabold uppercase tracking-wide text-accentDark">Wellness marketplace</div>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {MARKETPLACE_ITEMS.map((m) => {
                  const active = Boolean(employee[m.key]);
                  return (
                    <div key={m.key} className="card flex flex-col gap-2">
                      <div className="font-bold">{m.label}</div>
                      <p className="flex-1 text-xs text-muted">{m.blurb}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold">
                          ₹{fmtInr(m.price)}
                          {m.period}
                        </span>
                        <button onClick={() => toggle(m.key)} className={active ? 'btn-primary !w-auto px-4 !py-2' : 'btn-outline'}>
                          {active ? 'Added ✓' : 'Add'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-muted">Marketplace items selected: ₹{fmtInr(marketplaceTotal)} total.</div>
                <button disabled={saving} onClick={saveMarketplace} className="btn-primary !w-auto px-6">
                  {saving ? 'Saving…' : 'Save marketplace picks'}
                </button>
              </div>
            </>
          )}

          {section === 'benefits' && (
            <>
              <h1 className="text-2xl font-extrabold">My Benefits</h1>
              <p className="mt-1 max-w-xl text-sm text-muted">A read-only snapshot of everything sponsored for you and everything you've added yourself.</p>

              <div className="mt-6 text-xs font-extrabold uppercase tracking-wide text-accentDark">Sponsored by {company?.name ?? 'your company'}</div>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="GMC base" value={`₹${fmtInr((company?.hospLacs ?? 5) * 100000)}`} />
                <Stat label="OPD wallet" value={`₹${fmtInr(company?.opdTier ?? 10000)}`} />
                <Stat label="GTL" value={`₹${fmtInr((company?.gtlLacs ?? 25) * 100000)}`} />
                <Stat label="GPA" value={`₹${fmtInr((company?.gpaLacs ?? 15) * 100000)}`} />
              </div>

              <div className="mt-8 text-xs font-extrabold uppercase tracking-wide text-accentDark">Your flex add-ons</div>
              <div className="mt-2 space-y-1.5">
                {FLEX_ADD_ONS.filter((a) => employee[a.key]).length === 0 && <p className="text-sm text-muted">None yet.</p>}
                {FLEX_ADD_ONS.filter((a) => employee[a.key]).map((a) => (
                  <div key={a.key} className="flex justify-between text-sm">
                    <span>{a.label}</span>
                    <span className="font-bold">₹{fmtInr(a.cost)}/mo</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 text-xs font-extrabold uppercase tracking-wide text-accentDark">Your dependent top-ups</div>
              <div className="mt-2 space-y-1.5">
                {!employee.gmcSuperEmpAdded && !employee.gmcBaseDepAdded && !employee.gmcSuperDepAdded && !employee.opdEmpAdded && !employee.opdDepAdded && (
                  <p className="text-sm text-muted">None yet.</p>
                )}
                {!!employee.gmcSuperEmpAdded && (
                  <div className="flex justify-between text-sm">
                    <span>GMC Super Top-up — Employee</span>
                    <span className="font-bold">₹{fmtInr(gmcSuperEmpPrice)}/mo</span>
                  </div>
                )}
                {!!employee.gmcBaseDepAdded && (
                  <div className="flex justify-between text-sm">
                    <span>GMC Base Plan — Dependents</span>
                    <span className="font-bold">₹{fmtInr(gmcBaseDepPrice)}/mo</span>
                  </div>
                )}
                {!!employee.gmcSuperDepAdded && (
                  <div className="flex justify-between text-sm">
                    <span>GMC Super Top-up — Dependents</span>
                    <span className="font-bold">₹{fmtInr(gmcSuperDepPrice)}/mo</span>
                  </div>
                )}
                {!!employee.opdEmpAdded && (
                  <div className="flex justify-between text-sm">
                    <span>OPD Top-up — Employee</span>
                    <span className="font-bold">₹{fmtInr(opdEmpPrice)}/mo</span>
                  </div>
                )}
                {!!employee.opdDepAdded && (
                  <div className="flex justify-between text-sm">
                    <span>OPD Top-up — Dependents</span>
                    <span className="font-bold">₹{fmtInr(opdDepPrice)}/mo</span>
                  </div>
                )}
              </div>

              <div className="mt-8 text-xs font-extrabold uppercase tracking-wide text-accentDark">Your wellness marketplace picks</div>
              <div className="mt-2 space-y-1.5">
                {MARKETPLACE_ITEMS.filter((m) => employee[m.key]).length === 0 && <p className="text-sm text-muted">None yet.</p>}
                {MARKETPLACE_ITEMS.filter((m) => employee[m.key]).map((m) => (
                  <div key={m.key} className="flex justify-between text-sm">
                    <span>{m.label}</span>
                    <span className="font-bold">
                      ₹{fmtInr(m.price)}
                      {m.period}
                    </span>
                  </div>
                ))}
              </div>

              <div className="card mt-8 max-w-sm">
                <div className="text-xs font-bold uppercase tracking-wide text-muted">Your monthly out-of-pocket add-ons</div>
                <div className="mt-1 text-2xl font-extrabold text-accent">₹{fmtInr(myMonthlyTotal)}/mo</div>
                <div className="text-xs text-muted">Marketplace items are billed separately per their own period, not included above.</div>
              </div>
            </>
          )}

          {section === 'pending' && (
            <>
              <h1 className="text-2xl font-extrabold">Pending actions</h1>
              <p className="mt-1 max-w-xl text-sm text-muted">A few things worth wrapping up.</p>
              <div className="mt-6 max-w-xl space-y-3">
                {PENDING_ACTIONS.map((p) => {
                  const open = Boolean(employee[p.key]);
                  return (
                    <label key={p.key} className="card flex cursor-pointer items-center gap-3">
                      <input type="checkbox" checked={!open} onChange={() => togglePending(p.key)} className="h-4 w-4" />
                      <span className={open ? 'text-sm font-medium' : 'text-sm font-medium text-muted line-through'}>{p.label}</span>
                    </label>
                  );
                })}
              </div>
              {pendingLeft === 0 && <p className="mt-4 text-sm font-bold text-green-600">All caught up ✓</p>}
            </>
          )}
        </main>

        {showStickyBar && (
          <div className="flex items-center justify-between border-t border-line bg-white px-10 py-4">
            <div className="text-sm">
              <span className="font-bold">{selectedCount} add-on(s) selected</span>
              <span className="text-muted"> · ₹{fmtInr(selectedTotal)}</span>
            </div>
            <div className="flex items-center gap-4">
              {savedNote && <span className="text-sm font-bold text-green-600">{savedNote}</span>}
              <button disabled={saving} onClick={saveFlex} className="btn-primary !w-auto px-6">
                {saving ? 'Saving…' : 'Confirm add-ons'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card !p-4">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-base font-extrabold">{value}</div>
    </div>
  );
}

function TopupCard({
  title,
  price,
  active,
  disabled,
  onToggle,
  children
}: {
  title: string;
  price: number;
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="font-bold">{title}</div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold">₹{fmtInr(price)}/mo</span>
          <button disabled={disabled} onClick={onToggle} className={active ? 'btn-primary !w-auto px-4 !py-2' : 'btn-outline'}>
            {active ? 'Added ✓' : 'Add'}
          </button>
        </div>
      </div>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function PillRow({
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
    <div>
      <div className="text-xs font-bold text-muted">{label}</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {choices.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
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

// Ported from the prototype's HR.dc.html — the same three pre-determined
// packages, same advertised prices. The MVP lets HR pick one of these
// tiers (rather than the prototype's full slider-by-slider customizer,
// which is a follow-up phase); picking a tier sets every dial below to
// that tier's preset, so a client's saved plan carries the same fields
// the prototype's Employee screen expects to read.

export type PlanTier = 'essential' | 'growth' | 'comprehensive';

export type PlanDials = {
  selectedPackage: PlanTier;
  planName: string;
  hospLacs: number;
  opdTier: number;
  maternity: number;
  ahcWallet: number;
  blackWallet: number;
  gtlLacs: number;
  gpaLacs: number;
  familySpouse: boolean;
  familyChildren: boolean;
  familyParents: boolean;
  familyParentsInLaw: boolean;
};

export const PLAN_BASE: Record<PlanTier, { price: number } & Omit<PlanDials, 'selectedPackage' | 'planName'>> = {
  essential: {
    price: 520,
    hospLacs: 3,
    opdTier: 10000,
    maternity: 0,
    ahcWallet: 1000,
    blackWallet: 0,
    gtlLacs: 10,
    gpaLacs: 10,
    familySpouse: true,
    familyChildren: true,
    familyParents: false,
    familyParentsInLaw: false
  },
  growth: {
    price: 950,
    hospLacs: 5,
    opdTier: 25000,
    maternity: 50000,
    ahcWallet: 5000,
    blackWallet: 25000,
    gtlLacs: 25,
    gpaLacs: 20,
    familySpouse: true,
    familyChildren: true,
    familyParents: false,
    familyParentsInLaw: false
  },
  comprehensive: {
    price: 1850,
    hospLacs: 10,
    opdTier: 40000,
    maternity: 200000,
    ahcWallet: 10000,
    blackWallet: 50000,
    gtlLacs: 50,
    gpaLacs: 25,
    familySpouse: true,
    familyChildren: true,
    familyParents: true,
    familyParentsInLaw: false
  }
};

export const PLAN_LABELS: Record<PlanTier, string> = {
  essential: 'Essential',
  growth: 'Growth',
  comprehensive: 'Comprehensive'
};

export function dialsForTier(tier: PlanTier, companyName: string): PlanDials {
  const base = PLAN_BASE[tier];
  return {
    selectedPackage: tier,
    planName: `${companyName} — ${PLAN_LABELS[tier]}`,
    hospLacs: base.hospLacs,
    opdTier: base.opdTier,
    maternity: base.maternity,
    ahcWallet: base.ahcWallet,
    blackWallet: base.blackWallet,
    gtlLacs: base.gtlLacs,
    gpaLacs: base.gpaLacs,
    familySpouse: base.familySpouse,
    familyChildren: base.familyChildren,
    familyParents: base.familyParents,
    familyParentsInLaw: base.familyParentsInLaw
  };
}

export function fmtInr(n: number): string {
  return Math.round(n).toLocaleString('en-IN');
}

// Flex add-on catalog — mirrors the prototype's Flex Add-ons page.
export const FLEX_ADD_ONS: { key: string; label: string; cost: number; blurb: string }[] = [
  { key: 'gmcTopup', label: 'GMC top-up', cost: 2400, blurb: 'Increase your base hospitalisation cover.' },
  { key: 'maternity', label: 'Maternity cover', cost: 1600, blurb: 'Add maternity benefits if not already sponsored.' },
  { key: 'spouse', label: 'Add spouse', cost: 1800, blurb: 'Extend your GMC cover to your spouse.' },
  { key: 'child', label: 'Add child', cost: 1200, blurb: 'Extend your GMC cover to a child.' },
  { key: 'parent', label: 'Add parent', cost: 2200, blurb: 'Extend your GMC cover to a parent.' },
  { key: 'parentInLaw', label: 'Add parent-in-law', cost: 2200, blurb: 'Extend your GMC cover to a parent-in-law.' },
  { key: 'wellness', label: 'Wellness pack', cost: 900, blurb: 'Gym, mental health, and preventive-care credits.' },
  { key: 'ahc', label: 'Annual health check-up', cost: 700, blurb: 'A yearly diagnostic panel, at home or in-network.' },
  { key: 'gtl', label: 'Extra term life (GTL)', cost: 500, blurb: 'Top up your group term life cover.' },
  { key: 'gpa', label: 'Extra accident cover (GPA)', cost: 400, blurb: 'Top up your group personal accident cover.' },
  { key: 'cultFit', label: 'Cult Fit membership', cost: 2999, blurb: '3-month Cult Fit fitness membership.' }
];

// ---------------------------------------------------------------------------
// HR Customizer — full dial-by-dial plan builder.
//
// HR can move each dial independently instead of only picking a preset tier.
// Price is a continuous interpolation between the Essential and Comprehensive
// anchors, weighted per dial, plus flat add-ons for parents / parents-in-law
// cover (which aren't graduated dials in the prototype, just on/off). The
// "closest preset" label is a genuine nearest-anchor match in normalized
// dial-space, so HR always sees which named plan their custom mix resembles.
//
// These weights and flat add-on prices are Alyve's to tune — they live in one
// place here and nowhere else in the app.
export const CUSTOMIZER_DIALS = [
  { key: 'hospLacs', label: 'Hospitalisation cover (GMC)', min: 3, max: 10, step: 1, unit: 'L', weight: 0.25 },
  { key: 'opdTier', label: 'OPD wallet', min: 10000, max: 40000, step: 5000, unit: '₹', weight: 0.15 },
  { key: 'maternity', label: 'Maternity cover', min: 0, max: 200000, step: 25000, unit: '₹', weight: 0.15 },
  { key: 'ahcWallet', label: 'Annual health check-up wallet', min: 1000, max: 10000, step: 1000, unit: '₹', weight: 0.1 },
  { key: 'blackWallet', label: 'Wellness / Black wallet', min: 0, max: 50000, step: 5000, unit: '₹', weight: 0.1 },
  { key: 'gtlLacs', label: 'Group Term Life (GTL)', min: 10, max: 50, step: 5, unit: 'L', weight: 0.15 },
  { key: 'gpaLacs', label: 'Group Personal Accident (GPA)', min: 10, max: 25, step: 5, unit: 'L', weight: 0.1 }
] as const;

export type CustomizerDialKey = (typeof CUSTOMIZER_DIALS)[number]['key'];

export const OPD_TIER_CHOICES = [10000, 15000, 25000, 40000];
export const MATERNITY_CHOICES = [0, 50000, 100000, 200000];
export const AHC_WALLET_CHOICES = [1000, 5000, 7500, 10000];
export const BLACK_WALLET_CHOICES = [0, 15000, 25000, 50000];

export const FAMILY_ADDON_PRICE = 150; // per month, each, when toggled on independent of the base dials

export type CustomizerDials = Pick<
  PlanDials,
  'hospLacs' | 'opdTier' | 'maternity' | 'ahcWallet' | 'blackWallet' | 'gtlLacs' | 'gpaLacs' | 'familyParents' | 'familyParentsInLaw'
>;

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Where a dial's value sits between the Essential (0) and Comprehensive (1) anchors. */
function dialPosition(key: CustomizerDialKey, value: number): number {
  const lo = PLAN_BASE.essential[key];
  const hi = PLAN_BASE.comprehensive[key];
  if (hi === lo) return 0;
  return clamp01((value - lo) / (hi - lo));
}

/** Live monthly price/family for an arbitrary custom dial mix. */
export function customizerPrice(dials: CustomizerDials): number {
  const spread = PLAN_BASE.comprehensive.price - PLAN_BASE.essential.price;
  let position = 0;
  for (const dial of CUSTOMIZER_DIALS) {
    position += dialPosition(dial.key, dials[dial.key]) * dial.weight;
  }
  let price = PLAN_BASE.essential.price + position * spread;
  if (dials.familyParents) price += FAMILY_ADDON_PRICE;
  if (dials.familyParentsInLaw) price += FAMILY_ADDON_PRICE;
  return Math.max(200, Math.round(price));
}

/** Which named preset a custom mix most resembles, by normalized distance. */
export function closestPreset(dials: CustomizerDials): PlanTier {
  let best: PlanTier = 'essential';
  let bestDist = Infinity;
  for (const tier of Object.keys(PLAN_BASE) as PlanTier[]) {
    let dist = 0;
    for (const dial of CUSTOMIZER_DIALS) {
      const target = dialPosition(dial.key, PLAN_BASE[tier][dial.key]);
      const current = dialPosition(dial.key, dials[dial.key]);
      dist += (target - current) ** 2;
    }
    if (dist < bestDist) {
      bestDist = dist;
      best = tier;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Dependent top-ups & OPD top-ups — age-banded pricing.
//
// The prototype prices per dependent *category* (spouse / child / parent /
// parent-in-law) using a representative age for that category, not per
// individual — so a family with 2 children pays 2x the per-category price
// at that category's age band, not two separately-aged calculations.

export function ageMultiplier(age: number): number {
  if (age < 18) return 0.6;
  if (age <= 35) return 1.0;
  if (age <= 45) return 1.25;
  if (age <= 55) return 1.6;
  if (age <= 65) return 2.1;
  return 2.8;
}

/** Gentler age sensitivity for OPD, which scales less with age than hospitalisation risk. */
function opdAgeFactor(age: number): number {
  return 1 + (ageMultiplier(age) - 1) * 0.4;
}

export const DEPENDENT_CATEGORIES: {
  key: 'spouse' | 'child' | 'parent' | 'parentInLaw';
  label: string;
  countField: 'spouseCount' | 'childCount' | 'parentCount' | 'parentInLawCount';
  ageField: 'depSpouseAge' | 'depChildAge' | 'depParentAge' | 'depParentInLawAge';
}[] = [
  { key: 'spouse', label: 'Spouse', countField: 'spouseCount', ageField: 'depSpouseAge' },
  { key: 'child', label: 'Child', countField: 'childCount', ageField: 'depChildAge' },
  { key: 'parent', label: 'Parent', countField: 'parentCount', ageField: 'depParentAge' },
  { key: 'parentInLaw', label: 'Parent-in-law', countField: 'parentInLawCount', ageField: 'depParentInLawAge' }
];

export const GMC_SUPER_TIER_CHOICES = [500000, 1000000, 1500000, 2000000];
export const GMC_DED_CHOICES = [100000, 300000, 500000, 1000000];
export const OPD_TOPUP_TIER_CHOICES = [5000, 10000, 15000, 25000, 40000];

export const GMC_TOPUP_BASE: Record<number, number> = {
  500000: 350,
  1000000: 550,
  1500000: 750,
  2000000: 950
};

export const GMC_DED_MULT: Record<number, number> = {
  100000: 1.15,
  300000: 1.0,
  500000: 0.85,
  1000000: 0.65
};

export const OPD_TIER_PRICE: Record<number, number> = {
  5000: 150,
  10000: 280,
  15000: 400,
  25000: 600,
  40000: 900
};

/** Monthly price for one GMC Super Top-up line (employee or a dependent category), before headcount. */
export function gmcTopupPrice(tier: number, deductible: number, age: number): number {
  const base = GMC_TOPUP_BASE[tier] ?? GMC_TOPUP_BASE[500000];
  const mult = GMC_DED_MULT[deductible] ?? 1;
  return Math.round(base * mult * ageMultiplier(age));
}

/** Monthly price for one OPD top-up line (employee or a dependent category), before headcount. */
export function opdTopupPrice(tier: number, age: number): number {
  const base = OPD_TIER_PRICE[tier] ?? OPD_TIER_PRICE[10000];
  return Math.round(base * opdAgeFactor(age));
}

export const GMC_BASE_DEP_PRICE = 1800; // flat per month, extending the base GMC plan (not a Super Top-up) to dependents

// ---------------------------------------------------------------------------
// Wellness marketplace — sits alongside the Flex Add-ons, browsed separately.
// `cultFit` reuses the same employee field as the Flex Add-ons page, since
// it's the same underlying membership shown in a second place.
export const MARKETPLACE_ITEMS: { key: string; label: string; price: number; period: string; blurb: string }[] = [
  { key: 'cyber', label: 'Cyber Insurance', price: 1500, period: '/yr', blurb: 'Cover for online fraud, identity theft, and cyberbullying.' },
  { key: 'resetWeight', label: 'RESET - Weight Management', price: 4999, period: '/yr', blurb: 'A structured, coach-led weight management programme.' },
  { key: 'stressMastery', label: 'Stress Mastery', price: 4999, period: '/yr', blurb: 'A guided programme for stress and burnout management.' },
  { key: 'petInsurance', label: 'Pet Insurance', price: 3000, period: '/yr', blurb: 'Cover for your pet’s illness, injury, and routine care.' },
  { key: 'cultFit', label: 'Cult Fit Membership', price: 2999, period: '/3mo', blurb: '3-month access to Cult Fit centres and classes.' },
  { key: 'resetDiabetes', label: 'RESET - Diabetes Reversal', price: 4999, period: '/yr', blurb: 'A structured, coach-led diabetes reversal programme.' },
  { key: 'elderPremium', label: 'Elder Care - Premium', price: 14999, period: '/12mo', blurb: 'The fullest tier of elder care: home visits, emergency response, and more.' },
  { key: 'elderPlus', label: 'Elder Care - Plus', price: 9999, period: '/12mo', blurb: 'Mid-tier elder care: regular check-ins and coordinated care.' },
  { key: 'elderEssentials', label: 'Elder Care - Essentials', price: 5499, period: '/12mo', blurb: 'Entry-level elder care: teleconsultations and health monitoring.' }
];

// ---------------------------------------------------------------------------
// Pending actions — a persisted 3-item checklist on the employee dashboard.
export const PENDING_ACTIONS: { key: 'p1' | 'p2' | 'p3'; label: string }[] = [
  { key: 'p1', label: 'Confirm your dependent details are up to date' },
  { key: 'p2', label: 'Complete your annual health check-up booking' },
  { key: 'p3', label: 'Nominate a beneficiary for your GTL cover' }
];

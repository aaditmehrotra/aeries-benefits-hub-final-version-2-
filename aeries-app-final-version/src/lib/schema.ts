// Aeries Benefits Hub — multi-tenant schema.
// Every tenant-owned table carries companyId; all reads/writes in the app
// filter by the signed-in session's companyId, never by a client-supplied value.

import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index
} from 'drizzle-orm/pg-core';
import { createId } from './id';

export const companies = pgTable('companies', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  slug: text('slug').notNull().unique(), // the sign-in code HR chooses; employees use the same code
  name: text('name').notNull(),
  employeeCount: integer('employee_count').notNull().default(1),

  // Plan tier + the customizer dials, ported directly from the prototype.
  selectedPackage: text('selected_package').notNull().default('growth'), // essential | growth | comprehensive
  planName: text('plan_name').notNull().default('Custom Plan'),
  hospLacs: integer('hosp_lacs').notNull().default(5),
  opdTier: integer('opd_tier').notNull().default(25000),
  maternity: integer('maternity').notNull().default(50000),
  ahcWallet: integer('ahc_wallet').notNull().default(5000),
  blackWallet: integer('black_wallet').notNull().default(25000),
  gtlLacs: integer('gtl_lacs').notNull().default(25),
  gpaLacs: integer('gpa_lacs').notNull().default(20),
  familySpouse: boolean('family_spouse').notNull().default(true),
  familyChildren: boolean('family_children').notNull().default(true),
  familyParents: boolean('family_parents').notNull().default(false),
  familyParentsInLaw: boolean('family_parents_in_law').notNull().default(false),

  // Schedule a Demo — a real, persisted booking rather than a UI-only mock.
  demoAt: timestamp('demo_at'),
  demoConfirmed: boolean('demo_confirmed').notNull().default(false),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const hrUsers = pgTable(
  'hr_users',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    companyId: text('company_id').notNull(),
    identity: text('identity').notNull(), // work email
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (t) => ({
    companyIdentityUnique: uniqueIndex('hr_users_company_identity_idx').on(t.companyId, t.identity)
  })
);

export const employees = pgTable(
  'employees',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    companyId: text('company_id').notNull(),
    identity: text('identity').notNull(), // email or phone used to sign in
    name: text('name'),

    // Flex add-on selections — booleans mirror the prototype's Flex Add-ons page.
    gmcTopup: boolean('gmc_topup').notNull().default(false),
    maternity: boolean('maternity').notNull().default(false),
    spouse: boolean('spouse').notNull().default(false),
    child: boolean('child').notNull().default(false),
    parent: boolean('parent').notNull().default(false),
    parentInLaw: boolean('parent_in_law').notNull().default(false),
    wellness: boolean('wellness').notNull().default(false),
    ahc: boolean('ahc').notNull().default(false),
    gtl: boolean('gtl').notNull().default(false),
    gpa: boolean('gpa').notNull().default(false),
    cultFit: boolean('cult_fit').notNull().default(false),

    // Dependent top-ups — Aeries Flex Benefits deep section. Age-banded
    // pricing needs each dependent category's headcount and a representative
    // age per category (the prototype prices per-category, not per-person).
    employeeAge: integer('employee_age').notNull().default(30),
    spouseCount: integer('spouse_count').notNull().default(0),
    childCount: integer('child_count').notNull().default(0),
    parentCount: integer('parent_count').notNull().default(0),
    parentInLawCount: integer('parent_in_law_count').notNull().default(0),
    depSpouseAge: integer('dep_spouse_age').notNull().default(30),
    depChildAge: integer('dep_child_age').notNull().default(10),
    depParentAge: integer('dep_parent_age').notNull().default(60),
    depParentInLawAge: integer('dep_parent_in_law_age').notNull().default(60),

    // GMC Super Top-up — employee and dependents, each with its own tier +
    // deductible pair (deductible sits on top of the base GMC cover).
    gmcSuperEmpAdded: boolean('gmc_super_emp_added').notNull().default(false),
    gmcSuperEmpTier: integer('gmc_super_emp_tier').notNull().default(500000),
    gmcSuperEmpDed: integer('gmc_super_emp_ded').notNull().default(300000),
    gmcBaseDepAdded: boolean('gmc_base_dep_added').notNull().default(false),
    gmcSuperDepAdded: boolean('gmc_super_dep_added').notNull().default(false),
    gmcSuperDepTier: integer('gmc_super_dep_tier').notNull().default(500000),
    gmcSuperDepDed: integer('gmc_super_dep_ded').notNull().default(300000),

    // OPD top-ups — employee and dependents, each with an independent tier.
    opdEmpAdded: boolean('opd_emp_added').notNull().default(false),
    opdEmpTier: integer('opd_emp_tier').notNull().default(10000),
    opdDepAdded: boolean('opd_dep_added').notNull().default(false),
    opdDepTier: integer('opd_dep_tier').notNull().default(10000),

    // Wellness marketplace — one boolean per catalog item.
    cyber: boolean('cyber').notNull().default(false),
    resetWeight: boolean('reset_weight').notNull().default(false),
    stressMastery: boolean('stress_mastery').notNull().default(false),
    petInsurance: boolean('pet_insurance').notNull().default(false),
    resetDiabetes: boolean('reset_diabetes').notNull().default(false),
    elderPremium: boolean('elder_premium').notNull().default(false),
    elderPlus: boolean('elder_plus').notNull().default(false),
    elderEssentials: boolean('elder_essentials').notNull().default(false),

    // Pending actions — a persisted 3-item checklist shown on the employee side.
    p1: boolean('p1').notNull().default(true),
    p2: boolean('p2').notNull().default(true),
    p3: boolean('p3').notNull().default(true),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (t) => ({
    companyIdentityUnique: uniqueIndex('employees_company_identity_idx').on(t.companyId, t.identity)
  })
);

export const otpRequests = pgTable(
  'otp_requests',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    identity: text('identity').notNull(),
    codeHash: text('code_hash').notNull(),
    role: text('role').notNull(), // hr | employee
    companySlug: text('company_slug').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    consumed: boolean('consumed').notNull().default(false),
    attempts: integer('attempts').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (t) => ({
    identitySlugIdx: index('otp_requests_identity_slug_idx').on(t.identity, t.companySlug)
  })
);

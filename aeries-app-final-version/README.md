# Aeries Benefits Hub

A real, multi-tenant version of the Aeries Benefits Hub prototype: HR admins
at each client company sign in, pick a benefits plan, and set headcount;
employees sign in with the same company code, see that company's sponsored
benefits, and pick their own flex add-ons. Every write is scoped by
company, and sign-in is a real "Continue with Google / Microsoft" flow —
no passwords or codes to manage.

This replaces the earlier Claude Artifact prototype, which could not serve
external client companies — Claude's Artifact database only works for
people inside one Claude organization. This is a standard Next.js app with
its own Postgres database, deployable anywhere.

## What's built vs. what's next

Everything in both dashboards is now real and wired to the database. HR
can pick one of three pre-set plan tiers, or build a fully custom plan
dial-by-dial in the Customizer (hospitalisation cover, OPD wallet,
maternity, AHC wallet, wellness wallet, GTL, GPA, and parent/parent-in-law
cover), with a live price computed from Alyve's pricing model and saved
with one click. HR also has a static Aeries Flex Benefits reference page,
Saved Plans, and Schedule a Demo (a real booking, persisted against the
company and shown on next sign-in, with cancel/rebook).

Employees pick their own Flex Add-ons, see their company's sponsored
benefits, and can add age-banded dependent top-ups (GMC Super Top-up and
OPD Top-up, separately for themselves and for each dependent category,
plus extending the base GMC plan to dependents), browse and add from a
9-item wellness marketplace, see a read-only "My Benefits" summary of
everything sponsored plus everything they've personally added, and work
through a persisted 3-item Pending actions checklist (with a live count
badge in the sidebar).

The one thing intentionally left for you: creating the Google and
Microsoft OAuth apps that let "Continue with Google/Microsoft" actually
sign people in. Until those client IDs/secrets are set, both buttons
redirect back to the sign-in page with an error — see "Setting up social
sign-in" below.

A note on the pricing model: the exact anchor-distance customizer
algorithm, age-banding, and top-up rate tables in `src/lib/pricing.ts` are
Alyve's own numbers to tune — they were built to be reasonable and
internally consistent (continuous, monotonic, no discontinuities as dials
move), and every constant lives in that one file with comments on what to
change and why. Nothing else in the app needs to change if you adjust
prices.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL and SESSION_SECRET at minimum
npm run db:push              # creates the tables in your database
npm run dev
```

Open http://localhost:3000. Without `GOOGLE_CLIENT_ID`/`MICROSOFT_CLIENT_ID`
set, both sign-in buttons will redirect back with an error — see "Setting
up social sign-in" below.

## Deploying to Vercel (recommended — fastest path)

1. Push this project to a GitHub repository.
2. In Vercel, "Add New Project" and import that repository.
3. Add a Postgres database: Vercel's Storage tab → Postgres (this is Neon
   under the hood) → Connect to your project. It sets `DATABASE_URL`
   automatically.
4. In Project Settings → Environment Variables, add:
   - `SESSION_SECRET` — generate with `openssl rand -base64 32`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — see "Setting up social
     sign-in" below
   - `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` — see "Setting up
     social sign-in" below
5. Deploy. Then run the schema push once against the new database:
   `DATABASE_URL="<the value Vercel set>" npm run db:push` from your
   machine, or add it as a one-off build step.

## Deploying to Google Cloud instead

This is the same Next.js app, so it runs on Cloud Run without changes:

1. Provision a Postgres instance in Cloud SQL, and note its connection
   string (Cloud SQL's Auth Proxy is the simplest way to reach it from
   Cloud Run — see Google's "Connect to Cloud SQL from Cloud Run" guide).
2. Build and push a container: `gcloud run deploy aeries-benefits-hub
   --source . --region <your-region>` (the `output: 'standalone'` setting
   in `next.config.js` keeps the built image small).
3. Set the same environment variables as above (`DATABASE_URL`,
   `SESSION_SECRET`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`,
   `MICROSOFT_CLIENT_ID`/`MICROSOFT_CLIENT_SECRET`) in the Cloud Run
   service configuration.
4. Run `npm run db:push` once, pointed at the Cloud SQL instance (via the
   Auth Proxy from your machine, or a one-off Cloud Run job).

Vercel is the faster path to a first pilot; Cloud SQL/Cloud Run makes more
sense if Alyve Health already runs other infrastructure on Google Cloud
and you'd rather keep this alongside it.

## Updating an already-deployed Vercel Drop project

Vercel Drop always creates a *new* project on each drop — it won't push
an update into one you already deployed. To update the live app without
losing its Postgres database and environment variables:

1. Create a new (empty) repository on GitHub — you can do this entirely
   in the browser at github.com/new, no Git installed required.
2. On that repo's page, use "uploading an existing file" (or drag the
   project folder onto it) to upload this project's files — everything
   except `node_modules` and `.next`.
3. In your existing Vercel project (the one with the database already
   attached), go to Settings → Git → Connect Git Repository, and pick
   the repo you just created.
4. Vercel builds and deploys from it immediately, keeping the same
   database and environment variables. Any future change just means
   uploading the changed files to that GitHub repo again (or using
   GitHub's in-browser file editor for small edits) — Vercel redeploys
   automatically.

## Updating your database after this update

This update added new columns (Customizer dials, demo booking, dependent
top-ups, wellness marketplace, pending actions) to the `companies` and
`employees` tables. If your database already has the original tables from
`drizzle/0000_eminent_chameleon.sql`, run the following in Vercel's
Postgres → Query editor, **one statement at a time** (the editor rejects
multiple semicolon-separated statements in one go — paste one, click Run,
then replace it with the next):

```sql
ALTER TABLE "companies" ADD COLUMN "demo_at" timestamp;
```
```sql
ALTER TABLE "companies" ADD COLUMN "demo_confirmed" boolean DEFAULT false NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "employee_age" integer DEFAULT 30 NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "spouse_count" integer DEFAULT 0 NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "child_count" integer DEFAULT 0 NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "parent_count" integer DEFAULT 0 NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "parent_in_law_count" integer DEFAULT 0 NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "dep_spouse_age" integer DEFAULT 30 NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "dep_child_age" integer DEFAULT 10 NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "dep_parent_age" integer DEFAULT 60 NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "dep_parent_in_law_age" integer DEFAULT 60 NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "gmc_super_emp_added" boolean DEFAULT false NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "gmc_super_emp_tier" integer DEFAULT 500000 NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "gmc_super_emp_ded" integer DEFAULT 300000 NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "gmc_base_dep_added" boolean DEFAULT false NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "gmc_super_dep_added" boolean DEFAULT false NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "gmc_super_dep_tier" integer DEFAULT 500000 NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "gmc_super_dep_ded" integer DEFAULT 300000 NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "opd_emp_added" boolean DEFAULT false NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "opd_emp_tier" integer DEFAULT 10000 NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "opd_dep_added" boolean DEFAULT false NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "opd_dep_tier" integer DEFAULT 10000 NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "cyber" boolean DEFAULT false NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "reset_weight" boolean DEFAULT false NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "stress_mastery" boolean DEFAULT false NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "pet_insurance" boolean DEFAULT false NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "reset_diabetes" boolean DEFAULT false NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "elder_premium" boolean DEFAULT false NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "elder_plus" boolean DEFAULT false NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "elder_essentials" boolean DEFAULT false NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "p1" boolean DEFAULT true NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "p2" boolean DEFAULT true NOT NULL;
```
```sql
ALTER TABLE "employees" ADD COLUMN "p3" boolean DEFAULT true NOT NULL;
```

(This is also saved as `drizzle/0001_small_stellaris.sql` in the project,
if you'd rather run it from a Postgres client that accepts multiple
statements at once.) Setting up a brand-new database instead? Just run
`npm run db:push` locally against it, or run `0000_eminent_chameleon.sql`
followed by `0001_small_stellaris.sql` the same one-statement-at-a-time
way.

## Setting up social sign-in

This is the one remaining step to take the app live for real users — the
app itself doesn't need any more code changes for it. Sign-in works by
redirecting to Google or Microsoft, having them verify the person's
identity, and reading back their email address — nobody's password ever
touches this app. Do both providers, or just one (the other button will
simply show an error until you set it up too).

**Know your production URL first.** Whatever domain the app is live at
(your Vercel project's assigned domain, or a custom domain you've attached
to it) is what you register below — not a preview-deployment URL, which
changes on every push. If you're not sure yet, check Vercel → your project
→ Settings → Domains.

### Google

1. Go to https://console.cloud.google.com/ and create a project (or pick
   an existing one) from the project dropdown at the top.
2. APIs & Services → OAuth consent screen: choose **External**, fill in
   an app name and your email, and save. (You can leave it in "Testing"
   mode while you try this out, or publish it — either works for this
   flow since we only ever request basic email/profile info.)
3. APIs & Services → Credentials → Create Credentials → **OAuth client
   ID** → Application type: **Web application**.
4. Under **Authorized redirect URIs**, add exactly:
   `https://YOUR-DOMAIN/api/auth/google/callback`
   (swap in your real domain — this must match character-for-character,
   including `https://` and no trailing slash).
5. Click Create. Copy the **Client ID** and **Client secret** it shows you.
6. In Vercel → your project → Settings → Environment Variables, add
   `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` with those values, then
   redeploy (env var changes only take effect on the next build).

### Microsoft

1. Go to https://portal.azure.com/ → search for **Microsoft Entra ID** →
   **App registrations** → **New registration**.
2. Give it a name. Under "Supported account types," choose **Accounts in
   any organizational directory and personal Microsoft accounts** (this
   is what lets both Microsoft 365 work accounts and personal Outlook
   accounts sign in — pick a narrower option only if you specifically want
   to restrict it to one organization's employees).
3. Under **Redirect URI**, select platform **Web** and enter exactly:
   `https://YOUR-DOMAIN/api/auth/microsoft/callback`
   Click Register.
4. On the app's Overview page, copy the **Application (client) ID**.
5. Go to **Certificates & secrets** → **New client secret**, give it a
   description and expiry, then copy the secret's **Value** immediately
   (Azure only shows it once).
6. In Vercel → your project → Settings → Environment Variables, add
   `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` with those values,
   then redeploy.

### Testing it

After redeploying, go to `/login`, enter a company code, and click
"Continue with Google" or "Continue with Microsoft." If something's
misconfigured you'll be bounced back to `/login?error=...` instead of
signed in — the error code tells you what to check:

- `google-not-configured` / `microsoft-not-configured` — the client
  ID/secret env vars aren't set (or the deploy hasn't picked them up yet).
- `redirect_uri_mismatch` (shown by Google/Microsoft's own page, before
  they even redirect back to us) — the redirect URI you registered doesn't
  exactly match your live domain.
- `no-verified-email` — the signed-in account has no email address the
  provider will vouch for.
- `unknown-company` — an employee tried to sign in with a company code
  that doesn't exist yet (HR needs to sign in with that code first).

## Data model

See `src/lib/schema.ts`. Four tables: `companies` (one row per client,
holding the plan tier and its dials), `hr_users` and `employees` (identity
+ selections, both scoped by `company_id`), and `otp_requests` (short-lived
sign-in codes). Every query in `src/app/api/**` filters by the signed-in
session's `companyId` — never by a value the client sends — which is what
keeps one company's data from leaking into another's view.

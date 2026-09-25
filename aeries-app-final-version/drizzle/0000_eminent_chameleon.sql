CREATE TABLE IF NOT EXISTS "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"employee_count" integer DEFAULT 1 NOT NULL,
	"selected_package" text DEFAULT 'growth' NOT NULL,
	"plan_name" text DEFAULT 'Custom Plan' NOT NULL,
	"hosp_lacs" integer DEFAULT 5 NOT NULL,
	"opd_tier" integer DEFAULT 25000 NOT NULL,
	"maternity" integer DEFAULT 50000 NOT NULL,
	"ahc_wallet" integer DEFAULT 5000 NOT NULL,
	"black_wallet" integer DEFAULT 25000 NOT NULL,
	"gtl_lacs" integer DEFAULT 25 NOT NULL,
	"gpa_lacs" integer DEFAULT 20 NOT NULL,
	"family_spouse" boolean DEFAULT true NOT NULL,
	"family_children" boolean DEFAULT true NOT NULL,
	"family_parents" boolean DEFAULT false NOT NULL,
	"family_parents_in_law" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"identity" text NOT NULL,
	"name" text,
	"gmc_topup" boolean DEFAULT false NOT NULL,
	"maternity" boolean DEFAULT false NOT NULL,
	"spouse" boolean DEFAULT false NOT NULL,
	"child" boolean DEFAULT false NOT NULL,
	"parent" boolean DEFAULT false NOT NULL,
	"parent_in_law" boolean DEFAULT false NOT NULL,
	"wellness" boolean DEFAULT false NOT NULL,
	"ahc" boolean DEFAULT false NOT NULL,
	"gtl" boolean DEFAULT false NOT NULL,
	"gpa" boolean DEFAULT false NOT NULL,
	"cult_fit" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hr_users" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"identity" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "otp_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"identity" text NOT NULL,
	"code_hash" text NOT NULL,
	"role" text NOT NULL,
	"company_slug" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed" boolean DEFAULT false NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "employees_company_identity_idx" ON "employees" USING btree ("company_id","identity");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hr_users_company_identity_idx" ON "hr_users" USING btree ("company_id","identity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "otp_requests_identity_slug_idx" ON "otp_requests" USING btree ("identity","company_slug");
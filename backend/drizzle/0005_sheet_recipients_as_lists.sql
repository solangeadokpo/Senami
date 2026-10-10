-- Generated, then rewritten by hand: one row per establishment with three
-- lists of emails, instead of one row per address, without losing any
-- recipient. The DDL of the new table is the one drizzle-kit generates.

-- The application role runs the migrations and row level security is forced:
-- read and write every establishment's rows.
SELECT set_config('app.is_super_admin', 'on', false);--> statement-breakpoint

CREATE TEMPORARY TABLE previous_sheet_recipients AS
  SELECT establishment_id, recipient_type::text AS recipient_type, email, created_at
  FROM "sheet_recipients";--> statement-breakpoint
DROP TABLE "sheet_recipients";--> statement-breakpoint
DROP TYPE "public"."recipient_type";--> statement-breakpoint

CREATE TABLE "sheet_recipients" (
	"establishment_id" uuid PRIMARY KEY NOT NULL,
	"to_emails" "citext"[] NOT NULL,
	"cc_emails" "citext"[] DEFAULT '{}' NOT NULL,
	"bcc_emails" "citext"[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sheet_recipients_to_emails_ck" CHECK (cardinality("sheet_recipients"."to_emails") >= 1)
);
--> statement-breakpoint
ALTER TABLE "sheet_recipients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sheet_recipients" ADD CONSTRAINT "sheet_recipients_establishment_id_establishments_id_fk" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sheet_recipients" AS PERMISSIVE FOR ALL TO public USING (coalesce(current_setting('app.is_super_admin', true), '') = 'on' OR establishment_id = nullif(current_setting('app.establishment_id', true), '')::uuid) WITH CHECK (coalesce(current_setting('app.is_super_admin', true), '') = 'on' OR establishment_id = nullif(current_setting('app.establishment_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE "sheet_recipients" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

-- Every establishment gets a row; without a previous `to`, its first
-- responsable is the main recipient. One without either is left out.
INSERT INTO "sheet_recipients" ("establishment_id", "to_emails", "cc_emails", "bcc_emails")
SELECT
  e.id,
  coalesce(
    (SELECT array_agg(p.email ORDER BY p.created_at) FROM previous_sheet_recipients p
      WHERE p.establishment_id = e.id AND p.recipient_type = 'to'),
    (SELECT ARRAY[u.email] FROM users u
      WHERE u.establishment_id = e.id AND u.role = 'responsable'
      ORDER BY u.created_at LIMIT 1)
  ),
  coalesce(
    (SELECT array_agg(p.email ORDER BY p.created_at) FROM previous_sheet_recipients p
      WHERE p.establishment_id = e.id AND p.recipient_type = 'cc'),
    '{}'
  ),
  coalesce(
    (SELECT array_agg(p.email ORDER BY p.created_at) FROM previous_sheet_recipients p
      WHERE p.establishment_id = e.id AND p.recipient_type = 'bcc'),
    '{}'
  )
FROM establishments e
WHERE EXISTS (SELECT 1 FROM previous_sheet_recipients p WHERE p.establishment_id = e.id AND p.recipient_type = 'to')
   OR EXISTS (SELECT 1 FROM users u WHERE u.establishment_id = e.id AND u.role = 'responsable');--> statement-breakpoint

DROP TABLE previous_sheet_recipients;--> statement-breakpoint
SELECT set_config('app.is_super_admin', '', false);

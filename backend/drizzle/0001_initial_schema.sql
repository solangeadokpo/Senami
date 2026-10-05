CREATE TYPE "public"."contact_category" AS ENUM('direction', 'emergency', 'samu', 'other');--> statement-breakpoint
CREATE TYPE "public"."demo_status" AS ENUM('new', 'contacted', 'done', 'dropped');--> statement-breakpoint
CREATE TYPE "public"."establishment_status" AS ENUM('active', 'suspended', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."establishment_type" AS ENUM('maternelle', 'primaire', 'college', 'lycee', 'groupe_scolaire');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'succeeded', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."recipient_type" AS ENUM('to', 'cc', 'bcc');--> statement-breakpoint
CREATE TYPE "public"."reference_list" AS ENUM('location', 'event_type', 'bodily_damage', 'body_part', 'laterality', 'observed_sign', 'checked_risk');--> statement-breakpoint
CREATE TYPE "public"."registration_status" AS ENUM('received', 'under_review', 'info_requested', 'validated', 'activated', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."session_channel" AS ENUM('mobile', 'backoffice');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('numbered', 'sent');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('pending_payment', 'active', 'past_due', 'suspended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('intervenant', 'responsable', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('invited', 'active', 'deactivated');--> statement-breakpoint
CREATE TABLE "reference_values" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reference_values_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"list" "reference_list" NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"requires_precision" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reference_values_list_code_unique" UNIQUE("list","code")
);
--> statement-breakpoint
CREATE TABLE "establishments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "establishment_type" NOT NULL,
	"address_line" text NOT NULL,
	"postal_code" varchar(5) NOT NULL,
	"city" text NOT NULL,
	"phone" text,
	"email" "citext",
	"approx_student_count" integer,
	"logo" "bytea",
	"logo_mime_type" text,
	"status" "establishment_status" DEFAULT 'active' NOT NULL,
	"suspended_at" timestamp with time zone,
	"suspension_reason" text,
	"terminated_at" timestamp with time zone,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "establishments_postal_code_check" CHECK (postal_code ~ '^[0-9]{5}$'),
	CONSTRAINT "establishments_approx_student_count_check" CHECK (approx_student_count >= 0),
	CONSTRAINT "establishments_logo_size_check" CHECK (octet_length(logo) <= 524288),
	CONSTRAINT "establishments_logo_mime_type_check" CHECK (logo_mime_type IN ('image/png', 'image/svg+xml')),
	CONSTRAINT "establishments_logo_pair_check" CHECK ((logo IS NULL) = (logo_mime_type IS NULL)),
	CONSTRAINT "establishments_suspended_check" CHECK (status <> 'suspended' OR suspended_at IS NOT NULL),
	CONSTRAINT "establishments_terminated_check" CHECK (status <> 'terminated' OR terminated_at IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" "session_channel" NOT NULL,
	"refresh_token_hash" "bytea" NOT NULL,
	"device_id" text,
	"device_name" text,
	"platform" text,
	"app_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"revocation_reason" text,
	CONSTRAINT "auth_sessions_refreshTokenHash_unique" UNIQUE("refresh_token_hash"),
	CONSTRAINT "auth_sessions_platform_check" CHECK (platform IN ('ios', 'android', 'web'))
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "totp_recovery_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"invited_by" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_invitations_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"establishment_id" uuid,
	"role" "user_role" NOT NULL,
	"email" "citext" NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"job_title" text,
	"password_hash" text,
	"status" "user_status" DEFAULT 'invited' NOT NULL,
	"totp_secret_encrypted" "bytea",
	"totp_enrolled_at" timestamp with time zone,
	"totp_failed_attempts" smallint DEFAULT 0 NOT NULL,
	"totp_locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"deactivated_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_role_scope_check" CHECK ((role = 'super_admin') = (establishment_id IS NULL)),
	CONSTRAINT "users_active_password_check" CHECK (status <> 'active' OR password_hash IS NOT NULL),
	CONSTRAINT "users_deactivated_check" CHECK (status <> 'deactivated' OR deactivated_at IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "sheet_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"establishment_id" uuid NOT NULL,
	"recipient_type" "recipient_type" NOT NULL,
	"email" "citext" NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sheet_recipients_establishmentId_email_unique" UNIQUE("establishment_id","email")
);
--> statement-breakpoint
ALTER TABLE "sheet_recipients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"establishment_id" uuid NOT NULL,
	"last_name" text NOT NULL,
	"first_name" text NOT NULL,
	"class_group" text NOT NULL,
	"internal_id" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "students" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "useful_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"establishment_id" uuid NOT NULL,
	"category" "contact_category" NOT NULL,
	"label" text NOT NULL,
	"phone" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "useful_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "declaration_submissions" (
	"idempotency_key" uuid PRIMARY KEY NOT NULL,
	"establishment_id" uuid NOT NULL,
	"dossier_year" smallint NOT NULL,
	"dossier_seq" integer NOT NULL,
	"dossier_number" text GENERATED ALWAYS AS (dossier_year::text || '-' || lpad(dossier_seq::text, 7, '0')) STORED,
	"status" "submission_status" DEFAULT 'numbered' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"event_type_code" text NOT NULL,
	"location_code" text NOT NULL,
	"event_hour" smallint NOT NULL,
	CONSTRAINT "declaration_submissions_establishmentId_dossierYear_dossierSeq_unique" UNIQUE("establishment_id","dossier_year","dossier_seq"),
	CONSTRAINT "declaration_submissions_year_check" CHECK (dossier_year BETWEEN 2020 AND 2999),
	CONSTRAINT "declaration_submissions_seq_check" CHECK (dossier_seq BETWEEN 1 AND 9999999),
	CONSTRAINT "declaration_submissions_hour_check" CHECK (event_hour BETWEEN 0 AND 23),
	CONSTRAINT "declaration_submissions_sent_check" CHECK ((status = 'sent') = (sent_at IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "declaration_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payment_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"processing_error" text,
	CONSTRAINT "payment_webhook_events_paymentProvider_providerEventId_unique" UNIQUE("payment_provider","provider_event_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"establishment_id" uuid NOT NULL,
	"payment_provider" text NOT NULL,
	"provider_payment_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" char(3) DEFAULT 'EUR' NOT NULL,
	"status" "payment_status" NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" text,
	"refunded_at" timestamp with time zone,
	"refunded_amount_cents" integer,
	"receipt_number" text,
	"receipt_url" text,
	"receipt_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_receiptNumber_unique" UNIQUE("receipt_number"),
	CONSTRAINT "payments_paymentProvider_providerPaymentId_unique" UNIQUE("payment_provider","provider_payment_id"),
	CONSTRAINT "payments_amount_check" CHECK (amount_cents >= 0),
	CONSTRAINT "payments_refunded_amount_check" CHECK (refunded_amount_cents >= 0),
	CONSTRAINT "payments_succeeded_check" CHECK (status <> 'succeeded' OR paid_at IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "subscription_plan_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" char(3) DEFAULT 'EUR' NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"provider_price_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plan_prices_providerPriceId_unique" UNIQUE("provider_price_id"),
	CONSTRAINT "subscription_plan_prices_planId_validFrom_unique" UNIQUE("plan_id","valid_from"),
	CONSTRAINT "subscription_plan_prices_id_planId_unique" UNIQUE("id","plan_id"),
	CONSTRAINT "subscription_plan_prices_amount_check" CHECK (amount_cents > 0)
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"billing_interval" text NOT NULL,
	"interval_count" smallint DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_code_unique" UNIQUE("code"),
	CONSTRAINT "subscription_plans_billing_interval_check" CHECK (billing_interval IN ('month', 'year')),
	CONSTRAINT "subscription_plans_interval_count_check" CHECK (interval_count > 0)
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"establishment_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"plan_price_id" uuid NOT NULL,
	"status" "subscription_status" NOT NULL,
	"started_at" timestamp with time zone,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"payment_provider" text,
	"provider_customer_id" text,
	"provider_subscription_id" text,
	"dunning_attempts" smallint DEFAULT 0 NOT NULL,
	"last_dunning_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"suspension_reason" text,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_id_establishmentId_unique" UNIQUE("id","establishment_id"),
	CONSTRAINT "subscriptions_paymentProvider_providerSubscriptionId_unique" UNIQUE("payment_provider","provider_subscription_id"),
	CONSTRAINT "subscriptions_suspension_reason_check" CHECK (suspension_reason IN ('payment_failed', 'manual')),
	CONSTRAINT "subscriptions_suspended_check" CHECK (status <> 'suspended' OR suspended_at IS NOT NULL),
	CONSTRAINT "subscriptions_cancelled_check" CHECK (status <> 'cancelled' OR cancelled_at IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "demo_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"job_title" text,
	"establishment_name" text NOT NULL,
	"city" text NOT NULL,
	"email" "citext" NOT NULL,
	"phone" text,
	"preferred_slot" text,
	"message" text,
	"status" "demo_status" DEFAULT 'new' NOT NULL,
	"internal_notes" text,
	"privacy_consent_at" timestamp with time zone NOT NULL,
	"privacy_policy_version" text NOT NULL,
	"handled_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_request_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "registration_request_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"request_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"actor_kind" text NOT NULL,
	"from_status" "registration_status",
	"to_status" "registration_status" NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registration_request_events_actor_kind_check" CHECK (actor_kind IN ('super_admin', 'requester', 'system'))
);
--> statement-breakpoint
CREATE TABLE "registration_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"establishment_name" text NOT NULL,
	"establishment_type" "establishment_type" NOT NULL,
	"address_line" text NOT NULL,
	"postal_code" varchar(5) NOT NULL,
	"city" text NOT NULL,
	"approx_student_count" integer,
	"manager_last_name" text NOT NULL,
	"manager_first_name" text NOT NULL,
	"manager_job_title" text NOT NULL,
	"manager_email" "citext" NOT NULL,
	"manager_phone" text NOT NULL,
	"status" "registration_status" DEFAULT 'received' NOT NULL,
	"rejection_reason" text,
	"privacy_consent_at" timestamp with time zone NOT NULL,
	"privacy_policy_version" text NOT NULL,
	"establishment_id" uuid,
	"assigned_to" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registration_requests_establishmentId_unique" UNIQUE("establishment_id"),
	CONSTRAINT "registration_requests_postal_code_check" CHECK (postal_code ~ '^[0-9]{5}$'),
	CONSTRAINT "registration_requests_approx_student_count_check" CHECK (approx_student_count >= 0),
	CONSTRAINT "registration_requests_rejected_check" CHECK (status <> 'rejected' OR rejection_reason IS NOT NULL),
	CONSTRAINT "registration_requests_validated_check" CHECK (status NOT IN ('validated', 'activated') OR establishment_id IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" uuid,
	"actor_role" "user_role",
	"establishment_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" "inet",
	"user_agent" text
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "totp_recovery_codes" ADD CONSTRAINT "totp_recovery_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_establishment_id_establishments_id_fk" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sheet_recipients" ADD CONSTRAINT "sheet_recipients_establishment_id_establishments_id_fk" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_establishment_id_establishments_id_fk" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "useful_contacts" ADD CONSTRAINT "useful_contacts_establishment_id_establishments_id_fk" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "declaration_submissions" ADD CONSTRAINT "declaration_submissions_establishment_id_establishments_id_fk" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_fk" FOREIGN KEY ("subscription_id","establishment_id") REFERENCES "public"."subscriptions"("id","establishment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_plan_prices" ADD CONSTRAINT "subscription_plan_prices_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_establishment_id_establishments_id_fk" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_price_fk" FOREIGN KEY ("plan_price_id","plan_id") REFERENCES "public"."subscription_plan_prices"("id","plan_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_requests" ADD CONSTRAINT "demo_requests_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_request_events" ADD CONSTRAINT "registration_request_events_request_id_registration_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."registration_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_establishment_id_establishments_id_fk" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "establishments_city_idx" ON "establishments" USING btree ("city");--> statement-breakpoint
CREATE INDEX "establishments_status_idx" ON "establishments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "auth_sessions_active_idx" ON "auth_sessions" USING btree ("user_id") WHERE revoked_at IS NULL;--> statement-breakpoint
CREATE INDEX "totp_recovery_codes_user_idx" ON "totp_recovery_codes" USING btree ("user_id") WHERE used_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_invitations_one_pending_uq" ON "user_invitations" USING btree ("user_id") WHERE accepted_at IS NULL AND revoked_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_establishment_idx" ON "users" USING btree ("establishment_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "students_internal_id_uq" ON "students" USING btree ("establishment_id","internal_id") WHERE internal_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "students_search_idx" ON "students" USING btree ("establishment_id",lower(last_name),lower(first_name)) WHERE archived_at IS NULL;--> statement-breakpoint
CREATE INDEX "students_class_idx" ON "students" USING btree ("establishment_id","class_group") WHERE archived_at IS NULL;--> statement-breakpoint
CREATE INDEX "students_sync_idx" ON "students" USING btree ("establishment_id","updated_at");--> statement-breakpoint
CREATE INDEX "useful_contacts_establishment_idx" ON "useful_contacts" USING btree ("establishment_id","sort_order");--> statement-breakpoint
CREATE INDEX "declaration_submissions_received_idx" ON "declaration_submissions" USING btree ("establishment_id","received_at");--> statement-breakpoint
CREATE INDEX "declaration_submissions_month_idx" ON "declaration_submissions" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "declaration_submissions_pending_idx" ON "declaration_submissions" USING btree ("received_at") WHERE status = 'numbered';--> statement-breakpoint
CREATE INDEX "payment_webhook_events_unprocessed_idx" ON "payment_webhook_events" USING btree ("received_at") WHERE processed_at IS NULL;--> statement-breakpoint
CREATE INDEX "payments_establishment_idx" ON "payments" USING btree ("establishment_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_one_current_uq" ON "subscriptions" USING btree ("establishment_id") WHERE status <> 'cancelled';--> statement-breakpoint
CREATE INDEX "subscriptions_period_end_idx" ON "subscriptions" USING btree ("current_period_end") WHERE status <> 'cancelled';--> statement-breakpoint
CREATE INDEX "demo_requests_status_idx" ON "demo_requests" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "registration_request_events_request_idx" ON "registration_request_events" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "registration_requests_status_idx" ON "registration_requests" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "registration_requests_email_idx" ON "registration_requests" USING btree ("manager_email");--> statement-breakpoint
CREATE INDEX "registration_requests_name_idx" ON "registration_requests" USING btree (lower(establishment_name),"postal_code");--> statement-breakpoint
CREATE INDEX "audit_logs_establishment_idx" ON "audit_logs" USING btree ("establishment_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_user_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "sheet_recipients" AS PERMISSIVE FOR ALL TO public USING (coalesce(current_setting('app.is_super_admin', true), '') = 'on' OR establishment_id = nullif(current_setting('app.establishment_id', true), '')::uuid) WITH CHECK (coalesce(current_setting('app.is_super_admin', true), '') = 'on' OR establishment_id = nullif(current_setting('app.establishment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "students" AS PERMISSIVE FOR ALL TO public USING (coalesce(current_setting('app.is_super_admin', true), '') = 'on' OR establishment_id = nullif(current_setting('app.establishment_id', true), '')::uuid) WITH CHECK (coalesce(current_setting('app.is_super_admin', true), '') = 'on' OR establishment_id = nullif(current_setting('app.establishment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "useful_contacts" AS PERMISSIVE FOR ALL TO public USING (coalesce(current_setting('app.is_super_admin', true), '') = 'on' OR establishment_id = nullif(current_setting('app.establishment_id', true), '')::uuid) WITH CHECK (coalesce(current_setting('app.is_super_admin', true), '') = 'on' OR establishment_id = nullif(current_setting('app.establishment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "declaration_submissions" AS PERMISSIVE FOR ALL TO public USING (coalesce(current_setting('app.is_super_admin', true), '') = 'on' OR establishment_id = nullif(current_setting('app.establishment_id', true), '')::uuid) WITH CHECK (coalesce(current_setting('app.is_super_admin', true), '') = 'on' OR establishment_id = nullif(current_setting('app.establishment_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "payments" AS PERMISSIVE FOR ALL TO public USING (coalesce(current_setting('app.is_super_admin', true), '') = 'on' OR establishment_id = nullif(current_setting('app.establishment_id', true), '')::uuid) WITH CHECK (coalesce(current_setting('app.is_super_admin', true), '') = 'on' OR establishment_id = nullif(current_setting('app.establishment_id', true), '')::uuid);
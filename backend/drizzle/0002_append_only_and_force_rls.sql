-- What drizzle-kit cannot express. Kept to guarantees the code cannot give.

-- INS-02, NF-02: the history and the audit trail cannot be altered, whatever
-- the code does.
CREATE FUNCTION forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only: % is forbidden', TG_TABLE_NAME, TG_OP;
END $$;
--> statement-breakpoint
CREATE TRIGGER registration_request_events_append_only
  BEFORE UPDATE OR DELETE ON registration_request_events
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint

-- The application role owns the tables, and an owner bypasses row level
-- security unless it is forced. Policies are declared in the Drizzle schema.
ALTER TABLE sheet_recipients FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE students FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE useful_contacts FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE declaration_submissions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE payments FORCE ROW LEVEL SECURITY;

-- Case-insensitive text for emails. A trusted extension: the database owner
-- can create it without being a superuser (Neon, Supabase).
CREATE EXTENSION IF NOT EXISTS citext;

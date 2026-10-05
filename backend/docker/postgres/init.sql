-- Runs once, on the first start of an empty volume.
-- The application connects as `senami_app`, a non-superuser that owns its
-- databases. A superuser bypasses row level security even when it is forced,
-- which would hide every tenant isolation bug in development.
CREATE ROLE senami_app LOGIN PASSWORD 'senami_app';
CREATE DATABASE senami OWNER senami_app;
CREATE DATABASE senami_test OWNER senami_app;

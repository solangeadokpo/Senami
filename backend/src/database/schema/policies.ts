import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

// Row level security on establishment-owned tables. withTenant() and
// asSuperAdmin() (src/core/database/tenant.ts) set these two settings.
const TENANT_CHECK = sql`coalesce(current_setting('app.is_super_admin', true), '') = 'on' OR establishment_id = nullif(current_setting('app.establishment_id', true), '')::uuid`;

export const tenantIsolation = () =>
  pgPolicy('tenant_isolation', {
    for: 'all',
    using: TENANT_CHECK,
    withCheck: TENANT_CHECK,
  });

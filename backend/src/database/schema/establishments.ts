import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  varchar,
} from 'drizzle-orm/pg-core';
import {
  bytea,
  citext,
  createdAt,
  id,
  timestamptz,
  updatedAt,
} from './columns.js';
import { establishmentStatus, establishmentType } from './enums.js';

/** The tenant. Name, address, email and phone are printed on the sheet. */
export const establishments = pgTable(
  'establishments',
  {
    id: id(),
    name: text().notNull(),
    type: establishmentType().notNull(),
    addressLine: text().notNull(),
    postalCode: varchar({ length: 5 }).notNull(),
    city: text().notNull(),
    phone: text(),
    email: citext(),
    approxStudentCount: integer(),
    logo: bytea(),
    logoMimeType: text(),
    status: establishmentStatus().notNull().default('active'),
    suspendedAt: timestamptz(),
    suspensionReason: text(),
    terminatedAt: timestamptz(),
    // Store review account: no real email, excluded from statistics.
    isDemo: boolean().notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('establishments_city_idx').on(t.city),
    index('establishments_status_idx').on(t.status),
    check('establishments_postal_code_check', sql`postal_code ~ '^[0-9]{5}$'`),
    check(
      'establishments_approx_student_count_check',
      sql`approx_student_count >= 0`,
    ),
    check('establishments_logo_size_check', sql`octet_length(logo) <= 524288`),
    check(
      'establishments_logo_mime_type_check',
      sql`logo_mime_type IN ('image/png', 'image/svg+xml')`,
    ),
    check(
      'establishments_logo_pair_check',
      sql`(logo IS NULL) = (logo_mime_type IS NULL)`,
    ),
    check(
      'establishments_suspended_check',
      sql`status <> 'suspended' OR suspended_at IS NOT NULL`,
    ),
    check(
      'establishments_terminated_check',
      sql`status <> 'terminated' OR terminated_at IS NOT NULL`,
    ),
  ],
);

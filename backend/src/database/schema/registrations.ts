import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { citext, createdAt, id, timestamptz, updatedAt } from './columns.js';
import { demoStatus, establishmentType, registrationStatus } from './enums.js';
import { establishments } from './establishments.js';
import { users } from './users.js';

/** SV-03 and the registration workflow of CDC section 9.1. */
export const registrationRequests = pgTable(
  'registration_requests',
  {
    id: id(),
    establishmentName: text().notNull(),
    establishmentType: establishmentType().notNull(),
    addressLine: text().notNull(),
    postalCode: varchar({ length: 5 }).notNull(),
    city: text().notNull(),
    approxStudentCount: integer(),
    managerLastName: text().notNull(),
    managerFirstName: text().notNull(),
    managerJobTitle: text().notNull(),
    managerEmail: citext().notNull(),
    managerPhone: text().notNull(),
    status: registrationStatus().notNull().default('received'),
    rejectionReason: text(),
    // SV-04
    privacyConsentAt: timestamptz().notNull(),
    privacyPolicyVersion: text().notNull(),
    // Set on validation.
    establishmentId: uuid()
      .unique()
      .references(() => establishments.id),
    assignedTo: uuid().references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('registration_requests_status_idx').on(t.status, t.createdAt.desc()),
    // INS-03: duplicate detection.
    index('registration_requests_email_idx').on(t.managerEmail),
    index('registration_requests_name_idx').on(
      sql`lower(establishment_name)`,
      t.postalCode,
    ),
    check(
      'registration_requests_postal_code_check',
      sql`postal_code ~ '^[0-9]{5}$'`,
    ),
    check(
      'registration_requests_approx_student_count_check',
      sql`approx_student_count >= 0`,
    ),
    check(
      'registration_requests_rejected_check',
      sql`status <> 'rejected' OR rejection_reason IS NOT NULL`,
    ),
    check(
      'registration_requests_validated_check',
      sql`status NOT IN ('validated', 'activated') OR establishment_id IS NOT NULL`,
    ),
  ],
);

/**
 * INS-01, INS-02: status history, append-only (enforced by a trigger). No
 * foreign key on the actor: the history must outlive a deleted account.
 */
export const registrationRequestEvents = pgTable(
  'registration_request_events',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    requestId: uuid()
      .notNull()
      .references(() => registrationRequests.id),
    // NULL when the actor is the requester or the system.
    actorUserId: uuid(),
    actorKind: text().notNull(),
    // NULL on creation.
    fromStatus: registrationStatus(),
    toStatus: registrationStatus().notNull(),
    comment: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index('registration_request_events_request_idx').on(
      t.requestId,
      t.createdAt,
    ),
    check(
      'registration_request_events_actor_kind_check',
      sql`actor_kind IN ('super_admin', 'requester', 'system')`,
    ),
  ],
);

/** SV-02, SA-04 */
export const demoRequests = pgTable(
  'demo_requests',
  {
    id: id(),
    fullName: text().notNull(),
    jobTitle: text(),
    establishmentName: text().notNull(),
    city: text().notNull(),
    email: citext().notNull(),
    phone: text(),
    preferredSlot: text(),
    message: text(),
    status: demoStatus().notNull().default('new'),
    internalNotes: text(),
    privacyConsentAt: timestamptz().notNull(),
    privacyPolicyVersion: text().notNull(),
    handledBy: uuid().references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('demo_requests_status_idx').on(t.status, t.createdAt.desc())],
);

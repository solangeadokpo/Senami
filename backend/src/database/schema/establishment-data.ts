import { sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  smallint,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { citext, createdAt, id, timestamptz, updatedAt } from './columns.js';
import { contactCategory, recipientType } from './enums.js';
import { establishments } from './establishments.js';
import { tenantIsolation } from './policies.js';

/** ETB-03: who receives the sheet. At least one `to` is needed to declare. */
export const sheetRecipients = pgTable(
  'sheet_recipients',
  {
    id: id(),
    establishmentId: uuid()
      .notNull()
      .references(() => establishments.id, { onDelete: 'cascade' }),
    recipientType: recipientType().notNull(),
    email: citext().notNull(),
    label: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [tenantIsolation(), unique().on(t.establishmentId, t.email)],
);

/** ETB-06, MOB-12: shown in the mobile app, offline included. */
export const usefulContacts = pgTable(
  'useful_contacts',
  {
    id: id(),
    establishmentId: uuid()
      .notNull()
      .references(() => establishments.id, { onDelete: 'cascade' }),
    category: contactCategory().notNull(),
    label: text().notNull(),
    phone: text().notNull(),
    sortOrder: smallint().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    tenantIsolation(),
    index('useful_contacts_establishment_idx').on(
      t.establishmentId,
      t.sortOrder,
    ),
  ],
);

/** ELV-02: last name, first name, class and internal id. Nothing else. */
export const students = pgTable(
  'students',
  {
    id: id(),
    establishmentId: uuid()
      .notNull()
      .references(() => establishments.id, { onDelete: 'cascade' }),
    lastName: text().notNull(),
    firstName: text().notNull(),
    classGroup: text().notNull(),
    internalId: text(),
    // Set by a "replace" import for the students missing from the file (ELV-04).
    archivedAt: timestamptz(),
    createdAt: createdAt(),
    // Drives the incremental sync to the mobile app (HL-08).
    updatedAt: updatedAt(),
  },
  (t) => [
    tenantIsolation(),
    uniqueIndex('students_internal_id_uq')
      .on(t.establishmentId, t.internalId)
      .where(sql`internal_id IS NOT NULL`),
    index('students_search_idx')
      .on(t.establishmentId, sql`lower(last_name)`, sql`lower(first_name)`)
      .where(sql`archived_at IS NULL`),
    index('students_class_idx')
      .on(t.establishmentId, t.classGroup)
      .where(sql`archived_at IS NULL`),
    index('students_sync_idx').on(t.establishmentId, t.updatedAt),
  ],
);

import {
  boolean,
  integer,
  pgTable,
  smallint,
  text,
  unique,
} from 'drizzle-orm/pg-core';
import { updatedAt } from './columns.js';
import { referenceList } from './enums.js';

/** Form lists (CDC section 13), synchronised to the mobile app (HL-08). */
export const referenceValues = pgTable(
  'reference_values',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    list: referenceList().notNull(),
    code: text().notNull(),
    label: text().notNull(),
    sortOrder: smallint().notNull().default(0),
    requiresPrecision: boolean().notNull().default(false),
    // Never deleted: the declaration registry keeps the code.
    isActive: boolean().notNull().default(true),
    updatedAt: updatedAt(),
  },
  (t) => [unique().on(t.list, t.code)],
);

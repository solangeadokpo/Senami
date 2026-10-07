import { type SQL, sql } from 'drizzle-orm';
import { customType, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Case-insensitive text, for emails (extension created by the first migration). */
export const citext = customType<{ data: string }>({
  dataType: () => 'citext',
});

export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

/** Stored in UTC, displayed in Europe/Paris (RG-05). */
export const timestamptz = () => timestamp({ withTimezone: true });

export const id = () => uuid().primaryKey().defaultRandom();

export const createdAt = () => timestamptz().notNull().defaultNow();

/** Set by Drizzle on every update query. */
export const updatedAt = () =>
  timestamptz()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/** An enum value inlined in DDL: check constraints, partial index conditions. */
export const sqlValue = (value: string): SQL => sql.raw(`'${value}'`);

export const sqlValues = (values: readonly string[]): SQL =>
  sql.raw(values.map((value) => `'${value}'`).join(', '));

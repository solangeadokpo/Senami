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

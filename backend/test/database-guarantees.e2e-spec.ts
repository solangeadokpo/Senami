import { AuditAction } from '@shared/enums/audit-action.enum.js';
import { EstablishmentType } from '@shared/enums/establishment-type.enum.js';
import type { INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '@core/database/index.js';
import { auditLogs, establishments } from '@database/schema/index.js';
import { createTestApp } from './app.js';

describe('database guarantees', () => {
  let app: INestApplication;
  let db: Database;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get<Database>(DRIZZLE);
  });

  afterAll(async () => {
    await app.close();
  });

  it('refreshes updated_at on every update', async () => {
    const [created] = await db
      .insert(establishments)
      .values({
        name: 'School',
        type: EstablishmentType.LYCEE,
        addressLine: '3 rue C',
        postalCode: '69001',
        city: 'Lyon',
        updatedAt: new Date('2020-01-01T00:00:00Z'),
      })
      .returning();
    if (created === undefined) {
      throw new Error('fixture not created');
    }

    const [updated] = await db
      .update(establishments)
      .set({ city: 'Villeurbanne' })
      .where(eq(establishments.id, created.id))
      .returning();

    expect(updated?.updatedAt.getTime()).toBeGreaterThan(
      created.updatedAt.getTime(),
    );
    await db.delete(establishments).where(eq(establishments.id, created.id));
  });

  it('rejects any update of the audit trail', async () => {
    const [entry] = await db
      .insert(auditLogs)
      .values({ action: AuditAction.TOTP_RESET })
      .returning({ id: auditLogs.id });
    if (entry === undefined) {
      throw new Error('fixture not created');
    }

    await expect(
      db
        .update(auditLogs)
        .set({ action: AuditAction.SESSIONS_REVOKED })
        .where(eq(auditLogs.id, entry.id)),
    ).rejects.toThrow();
  });

  it('rejects any deletion from the audit trail', async () => {
    const [entry] = await db
      .insert(auditLogs)
      .values({ action: AuditAction.TOTP_RESET })
      .returning({ id: auditLogs.id });
    if (entry === undefined) {
      throw new Error('fixture not created');
    }

    await expect(
      db.delete(auditLogs).where(eq(auditLogs.id, entry.id)),
    ).rejects.toThrow();
  });
});

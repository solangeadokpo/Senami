import type { INestApplication } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import request, { type Response } from 'supertest';
import type { App } from 'supertest/types.js';
import { DRIZZLE, type Database, asSuperAdmin } from '@core/database/index.js';
import { auditLogs, sheetRecipients } from '@database/schema/index.js';
import { AuditAction } from '@shared/enums/audit-action.enum.js';
import { DevicePlatform } from '@shared/enums/device-platform.enum.js';
import { EstablishmentType } from '@shared/enums/establishment-type.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { isRecord } from '@shared/utils/is-record.js';
import { createTestApp } from './app.js';
import {
  PASSWORD,
  createBackofficeSession,
  createEstablishment,
  createUser,
} from './fixtures/accounts.js';

const ORIGIN = 'http://localhost:3001';
const PATH = '/api/v1/sheet-recipients';

function dataOf(response: Response): Record<string, unknown> {
  const data: unknown = isRecord(response.body)
    ? response.body['data']
    : undefined;
  if (!isRecord(data)) throw new Error(`no data in ${response.text}`);
  return data;
}

describe('sheet recipients', () => {
  let app: INestApplication<App>;
  let db: Database;
  let establishmentId: string;
  let responsableCookie: string;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get<Database>(DRIZZLE);
    establishmentId = await createEstablishment(db);
    const responsable = await createUser(db, {
      establishmentId,
      role: UserRole.RESPONSABLE,
    });
    responsableCookie = `senami_session=${await createBackofficeSession(db, responsable.id)}`;
  });

  afterAll(async () => {
    await app.close();
  });

  const api = () => request(app.getHttpServer());
  const asCookie = (call: request.Test, cookie: string) =>
    call.set('Cookie', cookie).set('Origin', ORIGIN);
  const asResponsable = (call: request.Test) =>
    asCookie(call, responsableCookie);

  async function mobileToken(email: string): Promise<string> {
    const signIn = await api()
      .post('/api/v1/auth/mobile/login')
      .send({
        email,
        password: PASSWORD,
        device: {
          id: crypto.randomUUID(),
          platform: DevicePlatform.ANDROID,
          appVersion: '1.0.0',
        },
      })
      .expect(200);
    return String(dataOf(signIn)['accessToken']);
  }

  it('lets a responsable replace the lists and read them back', async () => {
    const empty = await asResponsable(api().get(PATH)).expect(200);
    expect(dataOf(empty)).toEqual({ to: [], cc: [], bcc: [], updatedAt: null });

    await asResponsable(api().put(PATH))
      .send({
        to: [' direction@ecole.test '],
        cc: ['infirmerie@ecole.test'],
        bcc: ['Archives@ecole.test'],
      })
      .expect(200);

    const read = await asResponsable(api().get(PATH)).expect(200);
    expect(dataOf(read)).toMatchObject({
      to: ['direction@ecole.test'],
      cc: ['infirmerie@ecole.test'],
      bcc: ['Archives@ecole.test'],
    });
    const [audited] = await db
      .select({ details: auditLogs.details })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, AuditAction.SHEET_RECIPIENTS_UPDATED),
          eq(auditLogs.establishmentId, establishmentId),
        ),
      );
    expect(audited?.details).toEqual({
      changed: ['to', 'cc', 'bcc'],
      counts: { to: 1, cc: 1, bcc: 1 },
    });
  });

  it('lets an intervenant read on the mobile app, but not write', async () => {
    const intervenant = await createUser(db, { establishmentId });
    const token = await mobileToken(intervenant.email);

    await api().get(PATH).set('Authorization', `Bearer ${token}`).expect(200);
    const refused = await api()
      .put(PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: ['direction@ecole.test'], cc: [], bcc: [] })
      .expect(403);
    expect(refused.body).toMatchObject({ error: { code: 'ROLE_NOT_ALLOWED' } });
  });

  it("refuses a responsable's mobile token on writing", async () => {
    const responsable = await createUser(db, {
      establishmentId,
      role: UserRole.RESPONSABLE,
    });
    const token = await mobileToken(responsable.email);

    const refused = await api()
      .put(PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({ to: ['direction@ecole.test'], cc: [], bcc: [] })
      .expect(403);
    expect(refused.body).toMatchObject({
      error: { code: 'CHANNEL_NOT_ALLOWED' },
    });
  });

  it('refuses the super admin, who has no establishment', async () => {
    const superAdmin = await createUser(db, {
      establishmentId: null,
      role: UserRole.SUPER_ADMIN,
    });
    const cookie = `senami_session=${await createBackofficeSession(db, superAdmin.id)}`;

    const refused = await asCookie(api().get(PATH), cookie).expect(403);
    expect(refused.body).toMatchObject({ error: { code: 'ROLE_NOT_ALLOWED' } });
  });

  it("never shows another establishment's lists", async () => {
    const otherId = await createEstablishment(db);
    const other = await createUser(db, {
      establishmentId: otherId,
      role: UserRole.RESPONSABLE,
    });
    const cookie = `senami_session=${await createBackofficeSession(db, other.id)}`;

    const read = await asCookie(api().get(PATH), cookie).expect(200);
    expect(dataOf(read)).toMatchObject({ to: [], cc: [], bcc: [] });
  });

  it('answers 400 with the field for an invalid email', async () => {
    const refused = await asResponsable(api().put(PATH))
      .send({ to: ['direction@ecole.test'], cc: ['pas-un-email'], bcc: [] })
      .expect(400);
    expect(refused.body).toMatchObject({
      error: {
        code: 'VALIDATION_FAILED',
        fields: [expect.objectContaining({ field: 'cc' })],
      },
    });
  });

  it('answers 422 without a main recipient, or with a duplicate', async () => {
    const empty = await asResponsable(api().put(PATH))
      .send({ to: [], cc: ['infirmerie@ecole.test'], bcc: [] })
      .expect(422);
    expect(empty.body).toMatchObject({
      error: { code: 'NO_PRIMARY_RECIPIENT' },
    });

    const duplicate = await asResponsable(api().put(PATH))
      .send({
        to: ['direction@ecole.test'],
        cc: ['DIRECTION@ecole.test'],
        bcc: [],
      })
      .expect(422);
    expect(duplicate.body).toMatchObject({
      error: {
        code: 'RECIPIENT_EMAIL_DUPLICATED',
        details: { list: 'cc', index: 0 },
      },
    });
    expect(duplicate.text).not.toContain('DIRECTION@ecole.test');
  });

  it("makes a new establishment's responsable its main recipient", async () => {
    // A plan with a price in force exists: createEstablishment() made one.
    const superAdmin = await createUser(db, {
      establishmentId: null,
      role: UserRole.SUPER_ADMIN,
    });
    const cookie = `senami_session=${await createBackofficeSession(db, superAdmin.id)}`;
    const email = `${crypto.randomUUID()}@ecole.test`;

    const created = await asCookie(api().post('/api/v1/establishments'), cookie)
      .send({
        establishment: {
          name: 'École des Lilas',
          type: EstablishmentType.MATERNELLE,
          addressLine: '4 rue des Lilas',
          postalCode: '59000',
          city: 'Lille',
        },
        responsable: { firstName: 'Léa', lastName: 'Martin', email },
      })
      .expect(201);
    const establishment = dataOf(created)['establishment'];
    const id = isRecord(establishment) ? String(establishment['id']) : '';

    const [row] = await asSuperAdmin(db, (tx) =>
      tx
        .select({ to: sheetRecipients.toEmails, cc: sheetRecipients.ccEmails })
        .from(sheetRecipients)
        .where(eq(sheetRecipients.establishmentId, id)),
    );
    expect(row).toEqual({ to: [email], cc: [] });
  });
});

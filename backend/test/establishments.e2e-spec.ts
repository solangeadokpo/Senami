import type { INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { DestinationStream } from 'pino';
import request, { type Response } from 'supertest';
import type { App } from 'supertest/types.js';
import { DRIZZLE, type Database } from '@core/database/index.js';
import { auditLogs, userInvitations, users } from '@database/schema/index.js';
import type { FakeEmailSender } from '@modules/email/senders/fake-email-sender.js';
import { AuditAction } from '@shared/enums/audit-action.enum.js';
import { AuthStep } from '@shared/enums/auth-step.enum.js';
import { DevicePlatform } from '@shared/enums/device-platform.enum.js';
import { EstablishmentStatus } from '@shared/enums/establishment-status.enum.js';
import { EstablishmentType } from '@shared/enums/establishment-type.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { EMAIL_SENDER } from '@shared/interfaces/email-sender.interface.js';
import { isRecord } from '@shared/utils/is-record.js';
import { createTestApp } from './app.js';
import {
  PASSWORD,
  createBackofficeSession,
  createEstablishment,
  createUser,
} from './fixtures/accounts.js';

const ORIGIN = 'http://localhost:3001';
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('not really an image'),
]);

function dataOf(response: Response): Record<string, unknown> {
  const data: unknown = isRecord(response.body)
    ? response.body['data']
    : undefined;
  if (!isRecord(data)) throw new Error(`no data in ${response.text}`);
  return data;
}

function tokenFrom(text: string): string {
  const token = /\/invitation#([A-Za-z0-9_-]+)/.exec(text)?.[1];
  if (token === undefined) throw new Error('no invitation link');
  return token;
}

describe('establishments', () => {
  let app: INestApplication<App>;
  let db: Database;
  let email: FakeEmailSender;
  let superAdminCookie: string;
  const logs: string[] = [];
  const destination: DestinationStream = {
    write: (line: string) => void logs.push(line),
  };

  beforeAll(async () => {
    app = await createTestApp({ logDestination: destination });
    db = app.get<Database>(DRIZZLE);
    email = app.get<FakeEmailSender>(EMAIL_SENDER);
    // A plan with a price in force.
    await createEstablishment(db);
    const superAdmin = await createUser(db, {
      establishmentId: null,
      role: UserRole.SUPER_ADMIN,
    });
    superAdminCookie = `senami_session=${await createBackofficeSession(db, superAdmin.id)}`;
  });

  afterAll(async () => {
    await app.close();
  });

  const api = () => request(app.getHttpServer());
  const asSuperAdmin = (call: request.Test) =>
    call.set('Cookie', superAdminCookie).set('Origin', ORIGIN);

  async function create(
    responsableEmail = `${crypto.randomUUID()}@ecole.test`,
  ) {
    const response = await asSuperAdmin(
      api().post('/api/v1/establishments'),
    ).send({
      establishment: {
        name: 'École Sainte-Marie',
        type: EstablishmentType.PRIMAIRE,
        addressLine: '3 rue des Écoles',
        postalCode: '59000',
        city: 'Lille',
      },
      responsable: {
        firstName: 'Léa',
        lastName: 'Martin',
        email: responsableEmail,
      },
    });
    return { response, responsableEmail };
  }

  it('creates an establishment whose responsable accepts the invitation and signs in', async () => {
    const { response, responsableEmail } = await create();
    expect(response.status).toBe(201);
    const created = dataOf(response);
    expect(created['invitation']).toMatchObject({ sent: true });
    expect(created['establishment']).toMatchObject({
      name: 'École Sainte-Marie',
      status: EstablishmentStatus.ACTIVE,
      responsable: { email: responsableEmail, isSecondFactorEnrolled: false },
      subscription: { planName: 'Annuel' },
    });

    const sent = email.lastTo(responsableEmail);
    expect(sent?.subject).toBe(
      'Activez votre compte Sènami · École Sainte-Marie',
    );
    const token = tokenFrom(sent?.text ?? '');

    const lookup = await api()
      .post('/api/v1/invitations/lookup')
      .send({ token })
      .expect(200);
    expect(dataOf(lookup)).toMatchObject({
      firstName: 'Léa',
      role: UserRole.RESPONSABLE,
      establishmentName: 'École Sainte-Marie',
    });

    await api()
      .post('/api/v1/invitations/acceptance')
      .send({ token, password: 'court' })
      .expect(400);
    await api()
      .post('/api/v1/invitations/acceptance')
      .send({ token, password: PASSWORD })
      .expect(204);
    const reused = await api()
      .post('/api/v1/invitations/acceptance')
      .send({ token, password: PASSWORD })
      .expect(404);
    expect(reused.body).toMatchObject({
      error: { code: 'INVITATION_INVALID' },
    });

    const signIn = await api()
      .post('/api/v1/auth/backoffice/login')
      .send({ email: responsableEmail, password: PASSWORD })
      .expect(200);
    expect(dataOf(signIn)['step']).toBe(AuthStep.TOTP_ENROLMENT);
  });

  it('answers an expired invitation, and a resend replaces the link', async () => {
    const { response, responsableEmail } = await create();
    expect(response.status).toBe(201);
    const [responsable] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, responsableEmail));
    const responsableId = responsable?.id ?? '';
    const first = tokenFrom(email.lastTo(responsableEmail)?.text ?? '');

    const resent = await asSuperAdmin(
      api().post(`/api/v1/users/${responsableId}/invitation`),
    ).expect(200);
    expect(dataOf(resent)['expiresAt']).toEqual(expect.any(String));
    const second = tokenFrom(email.lastTo(responsableEmail)?.text ?? '');
    expect(second).not.toBe(first);
    const old = await api()
      .post('/api/v1/invitations/lookup')
      .send({ token: first })
      .expect(422);
    expect(old.body).toMatchObject({ error: { code: 'INVITATION_EXPIRED' } });

    await db
      .update(userInvitations)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(userInvitations.userId, responsableId));
    await api()
      .post('/api/v1/invitations/lookup')
      .send({ token: second })
      .expect(422);
  });

  it('refuses an email that already belongs to an account', async () => {
    const existing = await createUser(db, {
      establishmentId: null,
      role: UserRole.SUPER_ADMIN,
    });

    const { response } = await create(existing.email);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      error: { code: 'USER_EMAIL_ALREADY_USED' },
    });
  });

  it('lists, filters and finds the cities', async () => {
    await create();

    const list = await asSuperAdmin(
      api().get(
        '/api/v1/establishments?search=sainte-MARIE&city=Lille&limit=2',
      ),
    ).expect(200);
    expect(isRecord(list.body) ? list.body['meta'] : undefined).toMatchObject({
      page: 1,
      limit: 2,
    });
    const items = isRecord(list.body) ? list.body['data'] : undefined;
    expect(Array.isArray(items) && items.length).toBeGreaterThan(0);

    const cities = await asSuperAdmin(
      api().get('/api/v1/establishments/cities'),
    ).expect(200);
    expect(isRecord(cities.body) ? cities.body['data'] : []).toContain('Lille');
  });

  it('lets a responsable reach their establishment only, without changing its type', async () => {
    const own = await createEstablishment(db);
    const other = await createEstablishment(db);
    const responsable = await createUser(db, {
      establishmentId: own,
      role: UserRole.RESPONSABLE,
    });
    const cookie = `senami_session=${await createBackofficeSession(db, responsable.id)}`;
    const as = (call: request.Test) =>
      call.set('Cookie', cookie).set('Origin', ORIGIN);

    await as(api().get(`/api/v1/establishments/${own}`)).expect(200);
    const hidden = await as(
      api().get(`/api/v1/establishments/${other}`),
    ).expect(404);
    expect(hidden.body).toMatchObject({
      error: { code: 'ESTABLISHMENT_NOT_FOUND' },
    });
    await as(api().get('/api/v1/establishments')).expect(403);

    const updated = await as(api().patch(`/api/v1/establishments/${own}`))
      .send({ phone: '03 20 00 00 00' })
      .expect(200);
    expect(dataOf(updated)['phone']).toBe('03 20 00 00 00');
    await as(api().patch(`/api/v1/establishments/${own}`))
      .send({ type: EstablishmentType.LYCEE })
      .expect(403);
  });

  it('suspends an establishment: its intervenant is refused, until reactivated', async () => {
    const establishmentId = await createEstablishment(db);
    const intervenant = await createUser(db, { establishmentId });
    const mobileSignIn = () =>
      api()
        .post('/api/v1/auth/mobile/login')
        .send({
          email: intervenant.email,
          password: PASSWORD,
          device: {
            id: crypto.randomUUID(),
            platform: DevicePlatform.IOS,
            appVersion: '1.0.0',
          },
        });

    await asSuperAdmin(
      api().post(`/api/v1/establishments/${establishmentId}/suspension`),
    )
      .send({ reason: 'Abonnement impayé' })
      .expect(204);
    const refused = await mobileSignIn().expect(403);
    expect(refused.body).toMatchObject({
      error: { code: 'ESTABLISHMENT_SUSPENDED' },
    });
    await asSuperAdmin(
      api().post(`/api/v1/establishments/${establishmentId}/suspension`),
    )
      .send({ reason: 'encore' })
      .expect(409);

    await asSuperAdmin(
      api().delete(`/api/v1/establishments/${establishmentId}/suspension`),
    ).expect(204);
    await mobileSignIn().expect(200);

    const audit = await db
      .select({ action: auditLogs.action })
      .from(auditLogs)
      .where(eq(auditLogs.establishmentId, establishmentId));
    expect(audit.map((row) => row.action)).toEqual(
      expect.arrayContaining([
        AuditAction.ESTABLISHMENT_SUSPENDED,
        AuditAction.ESTABLISHMENT_REACTIVATED,
      ]),
    );
  });

  it('stores a cleaned logo and refuses the others', async () => {
    const establishmentId = await createEstablishment(db);
    const url = `/api/v1/establishments/${establishmentId}/logo`;

    await asSuperAdmin(api().put(url))
      .attach('logo', PNG, 'logo.png')
      .expect(204);
    const logo = await asSuperAdmin(api().get(url)).expect(200);
    expect(logo.headers['content-type']).toBe('image/png');
    expect(logo.headers['cache-control']).toBe('private, no-cache');

    await asSuperAdmin(api().put(url))
      .attach(
        'logo',
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script><rect width="1" height="1"/></svg>',
        ),
        'logo.svg',
      )
      .expect(204);
    const svg = await asSuperAdmin(api().get(url))
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(String(svg.body)).not.toMatch(/onload|script/);

    const gif = await asSuperAdmin(api().put(url))
      .attach('logo', Buffer.from('GIF89a'), 'logo.gif')
      .expect(422);
    expect(gif.body).toMatchObject({
      error: { code: 'LOGO_TYPE_NOT_ALLOWED' },
    });
    await asSuperAdmin(api().put(url))
      .attach('logo', Buffer.alloc(600 * 1024), 'big.png')
      .expect(413);

    await asSuperAdmin(api().delete(url)).expect(204);
    await asSuperAdmin(api().get(url)).expect(404);
  });

  it('refuses a mobile token on every route', async () => {
    const establishmentId = await createEstablishment(db);
    const responsable = await createUser(db, {
      establishmentId,
      role: UserRole.RESPONSABLE,
    });
    const signIn = await api()
      .post('/api/v1/auth/mobile/login')
      .send({
        email: responsable.email,
        password: PASSWORD,
        device: {
          id: crypto.randomUUID(),
          platform: DevicePlatform.IOS,
          appVersion: '1.0.0',
        },
      })
      .expect(200);
    const accessToken = String(dataOf(signIn)['accessToken']);

    const response = await api()
      .get(`/api/v1/establishments/${establishmentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
    expect(response.body).toMatchObject({
      error: { code: 'CHANNEL_NOT_ALLOWED' },
    });
  });

  it('never writes an invitation token, an email address or a password in the logs', async () => {
    logs.length = 0;
    const { responsableEmail } = await create();
    const token = tokenFrom(email.lastTo(responsableEmail)?.text ?? '');
    await api()
      .post('/api/v1/invitations/acceptance')
      .send({ token, password: PASSWORD })
      .expect(204);

    const written = logs.join('\n');
    expect(written).not.toContain(token);
    expect(written).not.toContain(responsableEmail);
    expect(written).not.toContain(PASSWORD);
  });
});

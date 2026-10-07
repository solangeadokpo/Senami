import type { INestApplication } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { Secret, TOTP } from 'otpauth';
import type { DestinationStream } from 'pino';
import request, { type Response } from 'supertest';
import type { App } from 'supertest/types.js';
import { DRIZZLE, type Database } from '@core/database/index.js';
import { auditLogs, users } from '@database/schema/index.js';
import { AuditAction } from '@shared/enums/audit-action.enum.js';
import { AuthStep } from '@shared/enums/auth-step.enum.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { isRecord } from '@shared/utils/is-record.js';
import { createTestApp } from './app.js';
import {
  PASSWORD,
  createBackofficeSession,
  createEstablishment,
  createUser,
} from './fixtures/accounts.js';

const ALLOWED_ORIGIN = 'http://localhost:3001';

function dataOf(response: Response): Record<string, unknown> {
  const data: unknown = isRecord(response.body)
    ? response.body['data']
    : undefined;
  if (!isRecord(data)) throw new Error(`no data in ${response.text}`);
  return data;
}

function stringOf(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  if (typeof value !== 'string') throw new Error(`no ${key}`);
  return value;
}

function sessionCookieOf(response: Response): string {
  const header: unknown = response.headers['set-cookie'];
  const cookies = Array.isArray(header) ? header : [];
  const cookie: unknown = cookies.find(
    (candidate) =>
      typeof candidate === 'string' && candidate.startsWith('senami_session='),
  );
  if (typeof cookie !== 'string') throw new Error('no session cookie');
  return cookie;
}

function codeOf(secret: string): string {
  return new TOTP({ secret: Secret.fromBase32(secret) }).generate();
}

describe('back office sign-in', () => {
  let app: INestApplication<App>;
  let db: Database;
  const logs: string[] = [];
  const destination: DestinationStream = {
    write: (line: string) => void logs.push(line),
  };

  beforeAll(async () => {
    app = await createTestApp({ logDestination: destination });
    db = app.get<Database>(DRIZZLE);
  });

  afterAll(async () => {
    await app.close();
  });

  function post(path: string, body: object) {
    return request(app.getHttpServer())
      .post(`/api/v1/auth/backoffice/${path}`)
      .send(body);
  }

  async function login(email: string): Promise<Record<string, unknown>> {
    return dataOf(
      await post('login', { email, password: PASSWORD }).expect(200),
    );
  }

  /** Signs in for the first time; returns the cookie, secret and codes. */
  async function enrol(email: string) {
    const challengeToken = stringOf(await login(email), 'challengeToken');
    const enrolment = dataOf(
      await post('totp/enrolment', { challengeToken }).expect(200),
    );
    const secret = stringOf(enrolment, 'secret');
    const confirmed = await post('totp/enrolment/confirm', {
      challengeToken,
      code: codeOf(secret),
    }).expect(200);
    const recoveryCodes = dataOf(confirmed)['recoveryCodes'];
    if (!Array.isArray(recoveryCodes)) throw new Error('no recovery codes');
    return {
      secret,
      cookie: sessionCookieOf(confirmed),
      recoveryCodes: recoveryCodes.filter(
        (code): code is string => typeof code === 'string',
      ),
      response: confirmed,
    };
  }

  function cookieValue(setCookie: string): string {
    return setCookie.split(';')[0] ?? '';
  }

  async function responsable() {
    return createUser(db, {
      establishmentId: await createEstablishment(db),
      role: UserRole.RESPONSABLE,
    });
  }

  it('enrols on the first sign-in and opens a cookie session', async () => {
    const user = await responsable();

    const challenge = await login(user.email);
    expect(challenge['step']).toBe(AuthStep.TOTP_ENROLMENT);

    const { cookie, recoveryCodes, response } = await enrol(user.email);
    expect(recoveryCodes).toHaveLength(10);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Expires=/);
    expect(JSON.stringify(response.body)).not.toContain(
      cookieValue(cookie).split('=')[1],
    );

    const profile = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookieValue(cookie))
      .expect(200);
    expect(dataOf(profile)['channel']).toBe(SessionChannel.BACKOFFICE);

    const [row] = await db
      .select({ enrolledAt: users.totpEnrolledAt })
      .from(users)
      .where(eq(users.id, user.id));
    expect(row?.enrolledAt).toBeInstanceOf(Date);
  });

  it('asks an enrolled user for a code, then signs out', async () => {
    const user = await responsable();
    const { secret } = await enrol(user.email);

    const challenge = await login(user.email);
    expect(challenge['step']).toBe(AuthStep.TOTP_VERIFICATION);
    const verified = await post('totp/verify', {
      challengeToken: stringOf(challenge, 'challengeToken'),
      code: codeOf(secret),
    }).expect(200);
    const cookie = cookieValue(sessionCookieOf(verified));

    const logout = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .set('Origin', ALLOWED_ORIGIN)
      .expect(204);
    expect(sessionCookieOf(logout)).toMatch(/Expires=Thu, 01 Jan 1970/);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie)
      .expect(401);
  });

  it('locks the second factor after five wrong codes', async () => {
    const user = await responsable();
    await enrol(user.email);
    const challengeToken = stringOf(await login(user.email), 'challengeToken');

    for (let attempt = 1; attempt < 5; attempt++) {
      const wrong = await post('totp/verify', {
        challengeToken,
        code: '000000',
      }).expect(401);
      expect(wrong.body).toMatchObject({
        error: { code: 'INVALID_TOTP_CODE' },
      });
    }
    const locked = await post('totp/verify', {
      challengeToken,
      code: '000000',
    }).expect(403);
    expect(locked.body).toMatchObject({ error: { code: 'TOTP_LOCKED' } });
    expect(JSON.stringify(locked.body)).toMatch(/"lockedUntil":"\d{4}-/);

    const again = await post('login', {
      email: user.email,
      password: PASSWORD,
    }).expect(403);
    expect(again.body).toMatchObject({ error: { code: 'TOTP_LOCKED' } });
    const audit = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, AuditAction.TOTP_LOCKED),
          eq(auditLogs.targetId, user.id),
        ),
      );
    expect(audit).toHaveLength(1);
  });

  it('accepts a recovery code once', async () => {
    const user = await responsable();
    const { recoveryCodes } = await enrol(user.email);
    const recoveryCode = recoveryCodes[0] ?? '';

    const first = await post('totp/recovery', {
      challengeToken: stringOf(await login(user.email), 'challengeToken'),
      recoveryCode,
    }).expect(200);
    expect(dataOf(first)['remainingRecoveryCodes']).toBe(9);
    sessionCookieOf(first);

    const second = await post('totp/recovery', {
      challengeToken: stringOf(await login(user.email), 'challengeToken'),
      recoveryCode,
    }).expect(401);
    expect(second.body).toMatchObject({ error: { code: 'INVALID_TOTP_CODE' } });
  });

  it('refuses an intervenant and a forged challenge', async () => {
    const intervenant = await createUser(db, {
      establishmentId: await createEstablishment(db),
    });

    const refused = await post('login', {
      email: intervenant.email,
      password: PASSWORD,
    }).expect(403);
    expect(refused.body).toMatchObject({
      error: { code: 'CHANNEL_NOT_ALLOWED' },
    });

    const forged = await post('totp/verify', {
      challengeToken: 'not-a-token',
      code: '123456',
    }).expect(401);
    expect(forged.body).toMatchObject({ error: { code: 'INVALID_CHALLENGE' } });
  });

  it('lets the super admin reset a second factor, audited', async () => {
    const superAdmin = await createUser(db, {
      establishmentId: null,
      role: UserRole.SUPER_ADMIN,
    });
    const { cookie: adminCookie } = await enrol(superAdmin.email);
    const user = await responsable();
    const { cookie: userCookie } = await enrol(user.email);

    await request(app.getHttpServer())
      .post(`/api/v1/users/${user.id}/totp/reset`)
      .set('Cookie', cookieValue(adminCookie))
      .set('Origin', ALLOWED_ORIGIN)
      .set('User-Agent', 'e2e-browser')
      .expect(204);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookieValue(userCookie))
      .expect(401);
    expect((await login(user.email))['step']).toBe(AuthStep.TOTP_ENROLMENT);

    const [entry] = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, AuditAction.TOTP_RESET),
          eq(auditLogs.targetId, user.id),
        ),
      );
    expect(entry).toMatchObject({
      actorUserId: superAdmin.id,
      actorRole: UserRole.SUPER_ADMIN,
      targetType: 'user',
      userAgent: 'e2e-browser',
    });
    expect(entry?.ipAddress).not.toBeNull();
  });

  it('keeps the reset to the super admin', async () => {
    const user = await responsable();
    const cookie = await createBackofficeSession(db, user.id);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/users/${user.id}/totp/reset`)
      .set('Cookie', `senami_session=${cookie}`)
      .set('Origin', ALLOWED_ORIGIN)
      .expect(403);
    expect(response.body).toMatchObject({
      error: { code: 'ROLE_NOT_ALLOWED' },
    });
  });

  it('never writes a code, a secret or a token in the logs', async () => {
    logs.length = 0;
    const user = await responsable();
    const { secret, recoveryCodes, cookie } = await enrol(user.email);

    const written = logs.join('\n');
    expect(written).not.toContain(PASSWORD);
    expect(written).not.toContain(secret);
    expect(written).not.toContain(recoveryCodes[0]);
    expect(written).not.toContain(cookieValue(cookie).split('=')[1]);
    expect(written).not.toContain('challengeToken');
  });
});

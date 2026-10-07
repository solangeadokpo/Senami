import { DevicePlatform } from '@shared/enums/device-platform.enum.js';
import { SubscriptionStatus } from '@shared/enums/subscription-status.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { DestinationStream } from 'pino';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DRIZZLE, type Database } from '@core/database/index.js';
import { isRecord } from '@shared/utils/is-record.js';
import { createTestApp } from './app.js';
import {
  PASSWORD,
  createBackofficeSession,
  createEstablishment,
  createUser,
  deactivateUser,
  suspendSubscription,
} from './fixtures/accounts.js';

const ALLOWED_ORIGIN = 'http://localhost:3001';

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

function tokensOf(body: unknown): Tokens {
  const data = isRecord(body) ? body['data'] : undefined;
  if (
    !isRecord(data) ||
    typeof data['accessToken'] !== 'string' ||
    typeof data['refreshToken'] !== 'string'
  ) {
    throw new Error(`no tokens in ${JSON.stringify(body)}`);
  }
  return {
    accessToken: data['accessToken'],
    refreshToken: data['refreshToken'],
  };
}

describe('authentication and sessions', () => {
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

  async function signIn(email: string, deviceId = 'device-1'): Promise<Tokens> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/mobile/login')
      .send({
        email,
        password: PASSWORD,
        device: {
          id: deviceId,
          name: 'iPhone',
          platform: DevicePlatform.IOS,
          appVersion: '1.0.0',
        },
      })
      .expect(200);
    return tokensOf(response.body);
  }

  function me(accessToken: string) {
    return request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
  }

  it('signs in, calls a protected route, refreshes and signs out', async () => {
    const establishmentId = await createEstablishment(db);
    const user = await createUser(db, { establishmentId });

    const first = await signIn(user.email);
    const profile = await me(first.accessToken).expect(200);
    expect(profile.body).toMatchObject({
      data: {
        email: user.email,
        role: UserRole.INTERVENANT,
        channel: SessionChannel.MOBILE,
      },
    });

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/mobile/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(200);
    const second = tokensOf(refreshed.body);
    await me(second.accessToken).expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${second.accessToken}`)
      .expect(204);

    const after = await me(second.accessToken).expect(401);
    expect(after.body).toMatchObject({ error: { code: 'SESSION_REVOKED' } });
  });

  it('rejects a wrong password and an unknown email alike', async () => {
    const establishmentId = await createEstablishment(db);
    const user = await createUser(db, { establishmentId });
    const device = {
      id: 'd',
      platform: DevicePlatform.ANDROID,
      appVersion: '1.0.0',
    };

    const wrong = await request(app.getHttpServer())
      .post('/api/v1/auth/mobile/login')
      .send({ email: user.email, password: 'wrong', device })
      .expect(401);
    const unknown = await request(app.getHttpServer())
      .post('/api/v1/auth/mobile/login')
      .send({ email: `${randomUUID()}@e2e.test`, password: 'wrong', device })
      .expect(401);

    expect(wrong.body).toMatchObject({
      error: { code: 'INVALID_CREDENTIALS' },
    });
    expect(unknown.body).toMatchObject({
      error: { code: 'INVALID_CREDENTIALS' },
    });
  });

  it('refuses a deactivated user on the next request', async () => {
    const establishmentId = await createEstablishment(db);
    const user = await createUser(db, { establishmentId });
    const { accessToken } = await signIn(user.email);

    await deactivateUser(db, user.id);

    const response = await me(accessToken).expect(401);
    expect(response.body).toMatchObject({
      error: { code: 'ACCOUNT_DEACTIVATED' },
    });
  });

  it('refuses the mobile app as soon as the subscription is suspended', async () => {
    const establishmentId = await createEstablishment(db);
    const user = await createUser(db, { establishmentId });
    const { accessToken } = await signIn(user.email);

    await suspendSubscription(db, establishmentId);

    const response = await me(accessToken).expect(403);
    expect(response.body).toMatchObject({
      error: { code: 'SUBSCRIPTION_SUSPENDED' },
    });
  });

  it('lets a responsable revoke the sessions of a user of their establishment', async () => {
    const establishmentId = await createEstablishment(db);
    const responsable = await createUser(db, {
      establishmentId,
      role: UserRole.RESPONSABLE,
    });
    const intervenant = await createUser(db, { establishmentId });
    const admin = await signIn(responsable.email);
    const target = await signIn(intervenant.email);

    await request(app.getHttpServer())
      .delete(`/api/v1/users/${intervenant.id}/sessions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(204);

    const response = await me(target.accessToken).expect(401);
    expect(response.body).toMatchObject({ error: { code: 'SESSION_REVOKED' } });
  });

  it('hides the users of another establishment from a responsable', async () => {
    const responsable = await createUser(db, {
      establishmentId: await createEstablishment(db),
      role: UserRole.RESPONSABLE,
    });
    const stranger = await createUser(db, {
      establishmentId: await createEstablishment(db),
    });
    const admin = await signIn(responsable.email);

    const response = await request(app.getHttpServer())
      .delete(`/api/v1/users/${stranger.id}/sessions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(404);
    expect(response.body).toMatchObject({ error: { code: 'USER_NOT_FOUND' } });
  });

  it('refuses the revocation of others to an intervenant', async () => {
    const establishmentId = await createEstablishment(db);
    const intervenant = await createUser(db, { establishmentId });
    const colleague = await createUser(db, { establishmentId });
    const { accessToken } = await signIn(intervenant.email);

    const response = await request(app.getHttpServer())
      .delete(`/api/v1/users/${colleague.id}/sessions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
    expect(response.body).toMatchObject({
      error: { code: 'ROLE_NOT_ALLOWED' },
    });
  });

  it('lists the caller sessions and revokes one of them', async () => {
    const establishmentId = await createEstablishment(db);
    const user = await createUser(db, { establishmentId });
    const phone = await signIn(user.email, 'phone');
    const tablet = await signIn(user.email, 'tablet');

    const list = await request(app.getHttpServer())
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${phone.accessToken}`)
      .expect(200);
    const sessions: unknown = isRecord(list.body)
      ? list.body['data']
      : undefined;
    if (!Array.isArray(sessions)) throw new Error('no sessions');
    expect(sessions).toHaveLength(2);
    const other: unknown = sessions.find(
      (session) => isRecord(session) && session['current'] === false,
    );
    if (!isRecord(other) || typeof other['id'] !== 'string')
      throw new Error('no other session');

    await request(app.getHttpServer())
      .delete(`/api/v1/auth/sessions/${other['id']}`)
      .set('Authorization', `Bearer ${phone.accessToken}`)
      .expect(204);
    await me(tablet.accessToken).expect(401);
    await me(phone.accessToken).expect(200);
  });

  it('rejects a session id that is not a uuid', async () => {
    const user = await createUser(db, {
      establishmentId: await createEstablishment(db),
    });
    const { accessToken } = await signIn(user.email);

    const response = await request(app.getHttpServer())
      .delete('/api/v1/auth/sessions/not-a-uuid')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
    expect(response.body).toMatchObject({
      error: { code: 'VALIDATION_FAILED' },
    });
  });

  it('accepts the back office cookie despite a suspended subscription', async () => {
    const establishmentId = await createEstablishment(
      db,
      SubscriptionStatus.SUSPENDED,
    );
    const responsable = await createUser(db, {
      establishmentId,
      role: UserRole.RESPONSABLE,
    });
    const cookie = await createBackofficeSession(db, responsable.id);

    const profile = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', `senami_session=${cookie}`)
      .expect(200);
    expect(profile.body).toMatchObject({
      data: { channel: SessionChannel.BACKOFFICE },
    });

    const foreign = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', `senami_session=${cookie}`)
      .set('Origin', 'https://evil.example')
      .expect(403);
    expect(foreign.body).toMatchObject({
      error: { code: 'ORIGIN_NOT_ALLOWED' },
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', `senami_session=${cookie}`)
      .set('Origin', ALLOWED_ORIGIN)
      .expect(204);
  });

  it('answers 401 on a protected route without credential', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401);
    expect(response.body).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
  });

  it('answers 429 to the eleventh sign-in attempt within a minute', async () => {
    const email = `${randomUUID()}@e2e.test`;
    const attempt = () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/mobile/login')
        .send({
          email,
          password: 'wrong',
          device: {
            id: 'd',
            platform: DevicePlatform.IOS,
            appVersion: '1.0.0',
          },
        });

    for (let index = 0; index < 10; index++) {
      await attempt().expect(401);
    }
    const blocked = await attempt().expect(429);
    expect(blocked.body).toMatchObject({ error: { code: 'RATE_LIMITED' } });
  });

  it('never writes a password or a token in the logs', async () => {
    const user = await createUser(db, {
      establishmentId: await createEstablishment(db),
    });
    const tokens = await signIn(user.email);
    await request(app.getHttpServer())
      .post('/api/v1/auth/mobile/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(200);

    const output = logs.join('');
    expect(output).not.toContain(PASSWORD);
    expect(output).not.toContain(tokens.accessToken);
    expect(output).not.toContain(tokens.refreshToken);
  });
});

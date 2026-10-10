import { FakeAuditRepository } from '@modules/audit/repositories/audit.repository.fake.js';
import { AuditAction } from '@shared/enums/audit-action.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { FakeClock } from '@shared/testing/fake-clock.js';
import { AuditService } from './audit.service.js';

describe('AuditService', () => {
  let clock: FakeClock;
  let repository: FakeAuditRepository;
  let service: AuditService;

  beforeEach(() => {
    clock = new FakeClock();
    repository = new FakeAuditRepository();
    service = new AuditService(repository, clock);
  });

  it('records the actor, the target, the establishment and the client', async () => {
    await service.record({
      action: AuditAction.TOTP_RESET,
      actor: { userId: 'admin', role: UserRole.SUPER_ADMIN },
      target: { type: 'user', id: 'u1' },
      establishmentId: 'e1',
      details: { reason: 'lost_device' },
      client: { ipAddress: '203.0.113.7', userAgent: 'Firefox' },
    });

    expect(repository.rows).toEqual([
      {
        action: AuditAction.TOTP_RESET,
        actorUserId: 'admin',
        actorRole: UserRole.SUPER_ADMIN,
        establishmentId: 'e1',
        targetType: 'user',
        targetId: 'u1',
        details: { reason: 'lost_device' },
        ipAddress: '203.0.113.7',
        userAgent: 'Firefox',
        occurredAt: clock.now(),
      },
    ]);
  });

  it('records a system action without actor nor client', async () => {
    await service.record({ action: AuditAction.TOTP_LOCKED, actor: null });

    expect(repository.rows).toEqual([
      expect.objectContaining({
        actorUserId: null,
        actorRole: null,
        targetType: null,
        targetId: null,
        establishmentId: null,
        details: {},
        ipAddress: null,
        userAgent: null,
      }),
    ]);
  });
});

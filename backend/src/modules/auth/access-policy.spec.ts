import { SubscriptionStatus } from '@shared/enums/subscription-status.enum.js';
import { EstablishmentStatus } from '@shared/enums/establishment-status.enum.js';
import { UserStatus } from '@shared/enums/user-status.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { assertAccountMayUse } from './access-policy.js';
import {
  AccountDeactivatedError,
  AccountNotActivatedError,
  ChannelNotAllowedError,
  EstablishmentSuspendedError,
  SubscriptionSuspendedError,
} from './auth.errors.js';
import { ESTABLISHMENT_ID, buildAccount } from './testing/auth-fixtures.js';

const suspendedEstablishment = {
  id: ESTABLISHMENT_ID,
  name: 'École',
  status: EstablishmentStatus.SUSPENDED as const,
};

describe('assertAccountMayUse', () => {
  it.each([
    ['an active intervenant on mobile', buildAccount(), SessionChannel.MOBILE],
    [
      'a responsable on the back office',
      buildAccount({ role: UserRole.RESPONSABLE }),
      SessionChannel.BACKOFFICE,
    ],
    [
      'a super admin on the back office',
      buildAccount({
        role: UserRole.SUPER_ADMIN,
        establishment: null,
        subscription: null,
      }),
      SessionChannel.BACKOFFICE,
    ],
    [
      'a past_due subscription on mobile',
      buildAccount({
        subscription: {
          status: SubscriptionStatus.PAST_DUE,
          currentPeriodEnd: null,
        },
      }),
      SessionChannel.MOBILE,
    ],
    [
      'a suspended subscription on the back office',
      buildAccount({
        role: UserRole.RESPONSABLE,
        subscription: {
          status: SubscriptionStatus.SUSPENDED,
          currentPeriodEnd: null,
        },
      }),
      SessionChannel.BACKOFFICE,
    ],
  ] as const)('admits %s', (_label, account, channel) => {
    expect(() => assertAccountMayUse(account, channel)).not.toThrow();
  });

  it.each([
    [
      'an invited user',
      buildAccount({ status: UserStatus.INVITED }),
      SessionChannel.MOBILE,
      AccountNotActivatedError,
    ],
    [
      'a deactivated user',
      buildAccount({ status: UserStatus.DEACTIVATED }),
      SessionChannel.MOBILE,
      AccountDeactivatedError,
    ],
    [
      'a super admin on mobile',
      buildAccount({
        role: UserRole.SUPER_ADMIN,
        establishment: null,
        subscription: null,
      }),
      SessionChannel.MOBILE,
      ChannelNotAllowedError,
    ],
    [
      'an intervenant on the back office',
      buildAccount(),
      SessionChannel.BACKOFFICE,
      ChannelNotAllowedError,
    ],
    [
      'a suspended establishment',
      buildAccount({ establishment: suspendedEstablishment }),
      SessionChannel.MOBILE,
      EstablishmentSuspendedError,
    ],
    [
      'a suspended establishment on the back office',
      buildAccount({
        role: UserRole.RESPONSABLE,
        establishment: suspendedEstablishment,
      }),
      SessionChannel.BACKOFFICE,
      EstablishmentSuspendedError,
    ],
    [
      'a suspended subscription on mobile',
      buildAccount({
        subscription: {
          status: SubscriptionStatus.SUSPENDED,
          currentPeriodEnd: null,
        },
      }),
      SessionChannel.MOBILE,
      SubscriptionSuspendedError,
    ],
    [
      'a subscription awaiting payment on mobile',
      buildAccount({
        subscription: {
          status: SubscriptionStatus.PENDING_PAYMENT,
          currentPeriodEnd: null,
        },
      }),
      SessionChannel.MOBILE,
      SubscriptionSuspendedError,
    ],
    [
      'no subscription on mobile',
      buildAccount({ subscription: null }),
      SessionChannel.MOBILE,
      SubscriptionSuspendedError,
    ],
  ] as const)('refuses %s', (_label, account, channel, error) => {
    expect(() => assertAccountMayUse(account, channel)).toThrow(error);
  });
});

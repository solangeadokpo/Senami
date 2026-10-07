import { SubscriptionStatus } from '@shared/enums/subscription-status.enum.js';
import { EstablishmentStatus } from '@shared/enums/establishment-status.enum.js';
import { UserStatus } from '@shared/enums/user-status.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import {
  AccountDeactivatedError,
  AccountNotActivatedError,
  ChannelNotAllowedError,
  EstablishmentSuspendedError,
  SubscriptionSuspendedError,
} from './auth.errors.js';
import type { Account } from './repositories/auth.repository.js';

const ALLOWED_CHANNELS: Record<UserRole, readonly SessionChannel[]> = {
  [UserRole.INTERVENANT]: [SessionChannel.MOBILE],
  [UserRole.RESPONSABLE]: [SessionChannel.MOBILE, SessionChannel.BACKOFFICE],
  [UserRole.SUPER_ADMIN]: [SessionChannel.BACKOFFICE],
};

// past_due: unpaid but still in dunning, the establishment keeps working.
const OPEN_SUBSCRIPTIONS: readonly SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
];

/**
 * Checked at sign-in, refresh and on every request. A suspended subscription
 * only closes the mobile app: the responsable must reach the back office to
 * pay (PAY-05).
 */
export function assertAccountMayUse(
  account: Account,
  channel: SessionChannel,
): void {
  if (account.status === UserStatus.INVITED)
    throw new AccountNotActivatedError();
  if (account.status === UserStatus.DEACTIVATED)
    throw new AccountDeactivatedError();

  const allowed = ALLOWED_CHANNELS[account.role];
  if (!allowed.includes(channel)) throw new ChannelNotAllowedError();

  if (account.role === UserRole.SUPER_ADMIN) return;

  if (account.establishment?.status !== EstablishmentStatus.ACTIVE) {
    throw new EstablishmentSuspendedError();
  }

  const subscriptionStatus = account.subscription?.status;
  if (
    channel === SessionChannel.MOBILE &&
    (subscriptionStatus === undefined ||
      !OPEN_SUBSCRIPTIONS.includes(subscriptionStatus))
  ) {
    throw new SubscriptionSuspendedError();
  }
}

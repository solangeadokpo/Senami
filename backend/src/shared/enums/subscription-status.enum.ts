/** `PAST_DUE` is the "à renouveler" of SA-03: unpaid, still in dunning. */
export enum SubscriptionStatus {
  PENDING_PAYMENT = 'pending_payment',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

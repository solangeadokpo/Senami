/** Mirrors the backend SubscriptionStatus. PAST_DUE: "à renouveler". */
export enum SubscriptionStatus {
  PENDING_PAYMENT = 'pending_payment',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

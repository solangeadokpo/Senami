import { pgEnum } from 'drizzle-orm/pg-core';

export const establishmentType = pgEnum('establishment_type', [
  'maternelle',
  'primaire',
  'college',
  'lycee',
  'groupe_scolaire',
]);
export const establishmentStatus = pgEnum('establishment_status', [
  'active',
  'suspended',
  'terminated',
]);
export const userRole = pgEnum('user_role', [
  'intervenant',
  'responsable',
  'super_admin',
]);
export const userStatus = pgEnum('user_status', [
  'invited',
  'active',
  'deactivated',
]);
export const sessionChannel = pgEnum('session_channel', [
  'mobile',
  'backoffice',
]);
// `past_due` is the "à renouveler" of SA-03: unpaid, still in dunning.
export const subscriptionStatus = pgEnum('subscription_status', [
  'pending_payment',
  'active',
  'past_due',
  'suspended',
  'cancelled',
]);
export const paymentStatus = pgEnum('payment_status', [
  'pending',
  'succeeded',
  'failed',
  'refunded',
]);
export const registrationStatus = pgEnum('registration_status', [
  'received',
  'under_review',
  'info_requested',
  'validated',
  'activated',
  'rejected',
]);
export const demoStatus = pgEnum('demo_status', [
  'new',
  'contacted',
  'done',
  'dropped',
]);
export const contactCategory = pgEnum('contact_category', [
  'direction',
  'emergency',
  'samu',
  'other',
]);
export const recipientType = pgEnum('recipient_type', ['to', 'cc', 'bcc']);
export const submissionStatus = pgEnum('submission_status', [
  'numbered',
  'sent',
]);
export const referenceList = pgEnum('reference_list', [
  'location',
  'event_type',
  'bodily_damage',
  'body_part',
  'laterality',
  'observed_sign',
  'checked_risk',
]);

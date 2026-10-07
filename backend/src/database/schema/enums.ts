import { pgEnum } from 'drizzle-orm/pg-core';
import { ContactCategory } from '@shared/enums/contact-category.enum.js';
import { DemoStatus } from '@shared/enums/demo-status.enum.js';
import { EstablishmentStatus } from '@shared/enums/establishment-status.enum.js';
import { EstablishmentType } from '@shared/enums/establishment-type.enum.js';
import { PaymentStatus } from '@shared/enums/payment-status.enum.js';
import { RecipientType } from '@shared/enums/recipient-type.enum.js';
import { ReferenceList } from '@shared/enums/reference-list.enum.js';
import { RegistrationStatus } from '@shared/enums/registration-status.enum.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { SubmissionStatus } from '@shared/enums/submission-status.enum.js';
import { SubscriptionStatus } from '@shared/enums/subscription-status.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { UserStatus } from '@shared/enums/user-status.enum.js';

// Built from the TypeScript enums: the values exist in one place only.
export const establishmentType = pgEnum(
  'establishment_type',
  EstablishmentType,
);
export const establishmentStatus = pgEnum(
  'establishment_status',
  EstablishmentStatus,
);
export const userRole = pgEnum('user_role', UserRole);
export const userStatus = pgEnum('user_status', UserStatus);
export const sessionChannel = pgEnum('session_channel', SessionChannel);
export const subscriptionStatus = pgEnum(
  'subscription_status',
  SubscriptionStatus,
);
export const paymentStatus = pgEnum('payment_status', PaymentStatus);
export const registrationStatus = pgEnum(
  'registration_status',
  RegistrationStatus,
);
export const demoStatus = pgEnum('demo_status', DemoStatus);
export const contactCategory = pgEnum('contact_category', ContactCategory);
export const recipientType = pgEnum('recipient_type', RecipientType);
export const submissionStatus = pgEnum('submission_status', SubmissionStatus);
export const referenceList = pgEnum('reference_list', ReferenceList);

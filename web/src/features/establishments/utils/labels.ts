import type { BadgeTone } from '@shared/components/ui/badge';
import { EstablishmentStatus } from '@shared/enums/establishment-status.enum';
import { EstablishmentType } from '@shared/enums/establishment-type.enum';
import { SubscriptionStatus } from '@shared/enums/subscription-status.enum';
import { enumValue } from '@shared/utils/enum-value';

export const TYPE_LABELS: Record<EstablishmentType, string> = {
  [EstablishmentType.MATERNELLE]: 'Maternelle',
  [EstablishmentType.PRIMAIRE]: 'Primaire',
  [EstablishmentType.COLLEGE]: 'Collège',
  [EstablishmentType.LYCEE]: 'Lycée',
  [EstablishmentType.GROUPE_SCOLAIRE]: 'Groupe scolaire',
};

export const TYPE_OPTIONS = Object.values(EstablishmentType).map((value) => ({
  value,
  label: TYPE_LABELS[value],
}));

export const STATUS_LABELS: Record<
  EstablishmentStatus,
  { label: string; tone: BadgeTone }
> = {
  [EstablishmentStatus.ACTIVE]: { label: 'Actif', tone: 'success' },
  [EstablishmentStatus.SUSPENDED]: { label: 'Suspendu', tone: 'warning' },
  [EstablishmentStatus.TERMINATED]: { label: 'Résilié', tone: 'neutral' },
};

export const SUBSCRIPTION_LABELS: Record<
  SubscriptionStatus,
  { label: string; tone: BadgeTone }
> = {
  [SubscriptionStatus.PENDING_PAYMENT]: {
    label: 'Paiement en attente',
    tone: 'info',
  },
  [SubscriptionStatus.ACTIVE]: { label: 'Actif', tone: 'success' },
  [SubscriptionStatus.PAST_DUE]: { label: 'À renouveler', tone: 'coral' },
  [SubscriptionStatus.SUSPENDED]: { label: 'Suspendu', tone: 'warning' },
  [SubscriptionStatus.CANCELLED]: { label: 'Résilié', tone: 'neutral' },
};

/** Labels of API values; an unknown value shows as is rather than failing. */
export function typeLabel(value: string): string {
  const type = enumValue(EstablishmentType, value);
  return type === undefined ? value : TYPE_LABELS[type];
}

export function statusOf(value: string): { label: string; tone: BadgeTone } {
  const status = enumValue(EstablishmentStatus, value);
  return status === undefined
    ? { label: value, tone: 'neutral' }
    : STATUS_LABELS[status];
}

export function subscriptionOf(value: string): {
  label: string;
  tone: BadgeTone;
} {
  const status = enumValue(SubscriptionStatus, value);
  return status === undefined
    ? { label: value, tone: 'neutral' }
    : SUBSCRIPTION_LABELS[status];
}

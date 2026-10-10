'use client';

import {
  Clock,
  CreditCard,
  ImageIcon,
  KeyRound,
  Mail,
  MapPin,
  Pause,
  PenLine,
  Phone,
  Play,
  Send,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState, useTransition } from 'react';
import {
  reactivateEstablishmentAction,
  resendInvitationAction,
  resetSecondFactorAction,
  suspendEstablishmentAction,
} from '@features/establishments/actions/establishment.actions';
import type { EstablishmentDetail as Detail } from '@features/establishments/api/establishments.api';
import { describeEstablishmentError } from '@features/establishments/utils/error-messages';
import {
  statusOf,
  subscriptionOf,
  typeLabel,
} from '@features/establishments/utils/labels';
import { Alert } from '@shared/components/ui/alert';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { ConfirmDialog } from '@shared/components/ui/confirm-dialog';
import { Toast } from '@shared/components/ui/toast';
import { EstablishmentStatus } from '@shared/enums/establishment-status.enum';
import { UserRole } from '@shared/enums/user-role.enum';
import { UserStatus } from '@shared/enums/user-status.enum';
import { enumValue } from '@shared/utils/enum-value';
import { formatDate, formatDateTime } from '@shared/utils/format-date';

/** The value of a role is its French noun, but for the super admin. */
function roleNoun(role: UserRole, count: number): string {
  const noun = role === UserRole.SUPER_ADMIN ? 'administrateur' : role;
  return count > 1 ? `${noun}s` : noun;
}

export function EstablishmentDetail({ detail }: { detail: Detail }) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const status = statusOf(detail.status);
  const isSuspended =
    enumValue(EstablishmentStatus, detail.status) ===
    EstablishmentStatus.SUSPENDED;
  const isActive =
    enumValue(EstablishmentStatus, detail.status) ===
    EstablishmentStatus.ACTIVE;
  const responsable = detail.responsable;
  const userCount = detail.users.reduce(
    (total, group) => total + group.count,
    0,
  );
  const done = (message: string) => {
    setToast(message);
    router.refresh();
  };

  return (
    <>
      <div className="grid gap-2">
        <Link
          href="/etablissements"
          className="text-sm font-bold text-muted-foreground hover:text-indigo-900"
        >
          ← Établissements
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-1">
            <h1 className="text-[1.625rem] font-bold tracking-tight text-indigo-900">
              {detail.name}
            </h1>
            <p className="text-muted-foreground">
              {typeLabel(detail.type)} · {detail.city}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            {detail.isDemo ? (
              <Badge tone="neutral" hasDot={false}>
                Démo
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={`/etablissements/${detail.id}/modifier`}>
            <PenLine aria-hidden />
            Modifier
          </Link>
        </Button>
        {isActive ? (
          <ConfirmDialog
            trigger={
              <Button variant="outline">
                <Pause aria-hidden />
                Suspendre
              </Button>
            }
            tone="warning"
            icon={<Pause />}
            title={`Suspendre ${detail.name} ?`}
            description="Ses responsables et intervenants ne pourront plus se connecter, sur le back-office comme sur l’application. Rien n’est supprimé ; la réactivation rend l’accès."
            reason={{
              label: 'Motif de la suspension',
              placeholder: 'Ex. Abonnement impayé depuis septembre',
              hint: 'Visible des administrateurs Sènami seulement.',
              min: 3,
              max: 500,
            }}
            confirmLabel="Suspendre l’établissement"
            isDestructive
            onConfirm={async (reason) => {
              const result = await suspendEstablishmentAction(
                detail.id,
                reason,
              );
              if (!result.ok) return describeEstablishmentError(result.code);
              done(`${detail.name} est suspendu.`);
              return null;
            }}
          />
        ) : null}
        {isSuspended ? (
          <ConfirmDialog
            trigger={
              <Button variant="outline">
                <Play aria-hidden />
                Réactiver
              </Button>
            }
            tone="success"
            icon={<Play />}
            title={`Réactiver ${detail.name} ?`}
            description="Ses comptes pourront de nouveau se connecter. L’abonnement n’est pas modifié."
            confirmLabel="Réactiver l’établissement"
            onConfirm={async () => {
              const result = await reactivateEstablishmentAction(detail.id);
              if (!result.ok) return describeEstablishmentError(result.code);
              done(`${detail.name} est réactivé.`);
              return null;
            }}
          />
        ) : null}
      </div>

      {isSuspended && detail.suspendedAt !== null ? (
        <Alert
          tone="warning"
          title={`Suspendu depuis le ${formatDate(new Date(detail.suspendedAt))}`}
        >
          {detail.suspensionReason === null ? null : (
            <span className="block">Motif : {detail.suspensionReason}</span>
          )}
          Les comptes de l’établissement ne peuvent plus se connecter.
        </Alert>
      ) : null}
      {notice === null ? null : (
        <Alert tone="error" title="L’action n’a pas abouti">
          {notice}
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          <Card>
            <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-4">
              <span className="grid size-18 place-items-center overflow-hidden rounded-2xl bg-indigo-50 text-slate-500">
                {detail.hasLogo ? (
                  // Authenticated and per establishment: served by the API through /api.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/v1/establishments/${detail.id}/logo`}
                    alt={`Logo de ${detail.name}`}
                    className="size-full object-contain"
                  />
                ) : (
                  <ImageIcon className="size-6" aria-hidden />
                )}
              </span>
              <div>
                <h2 className="text-[1.0625rem] font-bold text-indigo-900">
                  {detail.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {detail.hasLogo
                    ? 'Logo fourni par le responsable'
                    : 'Pas encore de logo : le responsable l’ajoutera.'}
                </p>
              </div>
            </div>
            <dl className="grid gap-3.5">
              <Fact icon={<MapPin />} label="Adresse">
                {detail.addressLine}, {detail.postalCode} {detail.city}
              </Fact>
              <Fact icon={<Phone />} label="Téléphone">
                {detail.phone ?? 'Non renseigné'}
              </Fact>
              <Fact icon={<Mail />} label="E-mail">
                {detail.email ?? 'Non renseigné'}
              </Fact>
              <Fact icon={<Users />} label="Élèves (environ)">
                {detail.approxStudentCount ?? 'Non renseigné'}
              </Fact>
            </dl>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[1.0625rem] font-bold text-indigo-900">
                Responsable
              </h2>
              {responsable === null ? null : enumValue(
                  UserStatus,
                  responsable.status,
                ) === UserStatus.INVITED ? (
                <Badge tone="info">Invitation envoyée</Badge>
              ) : (
                <Badge tone="success">Actif</Badge>
              )}
            </div>
            {responsable === null ? (
              <p className="text-muted-foreground">Aucun responsable.</p>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-indigo-100 font-display text-[0.8125rem] font-bold text-indigo-600">
                    {`${responsable.firstName.charAt(0)}${responsable.lastName.charAt(0)}`.toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <b className="block">
                      {responsable.firstName} {responsable.lastName}
                    </b>
                    <span className="block text-[0.8125rem] break-all text-muted-foreground">
                      {responsable.email}
                    </span>
                  </span>
                </div>
                {enumValue(UserStatus, responsable.status) ===
                UserStatus.INVITED ? (
                  <ResendInvitation
                    userId={responsable.userId}
                    onDone={setToast}
                    onFailure={setNotice}
                  />
                ) : (
                  <>
                    <dl>
                      <Fact icon={<KeyRound />} label="Double authentification">
                        {responsable.isSecondFactorEnrolled
                          ? 'Activée'
                          : 'À activer à la prochaine connexion'}
                      </Fact>
                    </dl>
                    {responsable.isSecondFactorEnrolled ? (
                      <div>
                        <ConfirmDialog
                          trigger={
                            <Button
                              variant="outline"
                              className="h-auto min-h-9 px-4 py-1.5 whitespace-normal"
                            >
                              <KeyRound aria-hidden />
                              Réinitialiser la double authentification
                            </Button>
                          }
                          tone="warning"
                          icon={<KeyRound />}
                          title="Réinitialiser la double authentification ?"
                          description={`${responsable.firstName} ${responsable.lastName} devra l’activer de nouveau à sa prochaine connexion, avec le QR code. Ses sessions du back-office sont fermées ; ses codes de secours ne fonctionnent plus.`}
                          confirmLabel="Réinitialiser"
                          onConfirm={async () => {
                            const result = await resetSecondFactorAction(
                              responsable.userId,
                            );
                            if (!result.ok)
                              return describeEstablishmentError(result.code);
                            done(
                              `Double authentification réinitialisée pour ${responsable.firstName} ${responsable.lastName}.`,
                            );
                            return null;
                          }}
                        />
                      </div>
                    ) : null}
                  </>
                )}
              </>
            )}
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <h2 className="text-[1.0625rem] font-bold text-indigo-900">
              Activité
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1 rounded-2xl bg-coral-100 p-4">
                <span className="text-[0.8125rem] text-coral-600">
                  Déclarations ce mois
                </span>
                <span className="font-display text-[1.625rem] font-bold text-indigo-900 tabular-nums">
                  {detail.declarationsThisMonth}
                </span>
              </div>
              <div className="grid gap-1 rounded-2xl bg-indigo-50 p-4">
                <span className="text-[0.8125rem] text-muted-foreground">
                  Utilisateurs
                </span>
                <span className="font-display text-[1.625rem] font-bold text-indigo-900 tabular-nums">
                  {userCount}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {describeUsers(detail.users)} Un compteur, jamais le contenu d’une
              fiche.
            </p>
          </Card>
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[1.0625rem] font-bold text-indigo-900">
                Abonnement
              </h2>
              {detail.subscription === null ? null : (
                <Badge tone={subscriptionOf(detail.subscription.status).tone}>
                  {subscriptionOf(detail.subscription.status).label}
                </Badge>
              )}
            </div>
            {detail.subscription === null ? (
              <p className="text-muted-foreground">Aucun abonnement.</p>
            ) : (
              <dl className="grid gap-3.5">
                <Fact icon={<CreditCard />} label="Formule">
                  {detail.subscription.planName}
                </Fact>
                <Fact icon={<Clock />} label="Échéance">
                  {detail.subscription.currentPeriodEnd === null
                    ? 'Non définie'
                    : formatDate(
                        new Date(detail.subscription.currentPeriodEnd),
                      )}
                </Fact>
              </dl>
            )}
          </Card>
        </div>
      </div>
      <Toast message={toast} />
    </>
  );
}

function ResendInvitation({
  userId,
  onDone,
  onFailure,
}: {
  userId: string;
  onDone: (message: string) => void;
  onFailure: (message: string | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [expiry, setExpiry] = useState<string | null>(null);
  return (
    <div className="grid justify-items-start gap-2">
      {expiry === null ? null : (
        <p className="text-sm text-muted-foreground">
          Nouveau lien valable jusqu’au {expiry}. L’ancien ne fonctionne plus.
        </p>
      )}
      <Button
        variant="outline"
        className="h-9 px-4"
        isLoading={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await resendInvitationAction(userId);
            if (!result.ok) {
              onFailure(describeEstablishmentError(result.code));
              return;
            }
            onFailure(null);
            setExpiry(formatDateTime(new Date(result.expiresAt)));
            onDone('Invitation renvoyée.');
          })
        }
      >
        {isPending ? null : <Send aria-hidden />}
        {isPending ? 'Envoi…' : 'Renvoyer l’invitation'}
      </Button>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <section className="grid content-start gap-4 rounded-3xl border bg-white p-6">
      {children}
    </section>
  );
}

function Fact({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[24px_minmax(0,1fr)] items-start gap-3 [&_svg]:mt-0.5 [&_svg]:size-5 [&_svg]:text-slate-500">
      {icon}
      <div>
        <dt className="text-label text-slate-600 uppercase">{label}</dt>
        <dd className="mt-0.5 font-semibold break-words">{children}</dd>
      </div>
    </div>
  );
}

function describeUsers(groups: Detail['users']): string {
  const counts = new Map<UserRole, number>();
  for (const group of groups) {
    const role = enumValue(UserRole, group.role);
    if (role !== undefined)
      counts.set(role, (counts.get(role) ?? 0) + group.count);
  }
  const parts = [...counts].map(
    ([role, count]) => `${count} ${roleNoun(role, count)}`,
  );
  return parts.length === 0 ? 'Aucun utilisateur.' : `${parts.join(' · ')}.`;
}

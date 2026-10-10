'use client';

import {
  Building2,
  Check,
  CircleCheck,
  Clock,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  User,
} from 'lucide-react';
import Link from 'next/link';
import {
  type ReactNode,
  useEffect,
  useId,
  useState,
  useTransition,
} from 'react';
import {
  acceptInvitationAction,
  lookupInvitationAction,
} from '@features/invitations/actions/invitation.actions';
import type { Invitation } from '@features/invitations/api/invitations.api';
import {
  MIN_PASSWORD_LENGTH,
  passwordRules,
} from '@features/invitations/schemas/password.schema';
import { Alert } from '@shared/components/ui/alert';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Skeleton } from '@shared/components/ui/skeleton';
import { UserRole } from '@shared/enums/user-role.enum';
import { cn } from '@shared/utils/cn';
import { enumValue } from '@shared/utils/enum-value';
import { formatDateTime } from '@shared/utils/format-date';

type State =
  | { step: 'loading' }
  | { step: 'form'; token: string; invitation: Invitation }
  | { step: 'done'; invitation: Invitation }
  | { step: 'expired' }
  | { step: 'invalid' };

export function InvitationFlow() {
  const [state, setState] = useState<State>({ step: 'loading' });

  useEffect(() => {
    let lookup = 0;
    const readToken = (isFirstRead: boolean) => {
      // After the #: never sent to a server. Removed from the address bar at once.
      const token = window.location.hash.slice(1);
      if (token === '' && !isFirstRead) return;
      window.history.replaceState(null, '', window.location.pathname);
      const current = ++lookup;
      if (token === '') {
        setTimeout(() => setState({ step: 'invalid' }), 0);
        return;
      }
      setTimeout(() => setState({ step: 'loading' }), 0);
      void lookupInvitationAction(token).then((result) => {
        // A newer link was opened meanwhile: its answer wins.
        if (current !== lookup) return;
        if (result.ok)
          setState({ step: 'form', token, invitation: result.invitation });
        else
          setState({
            step: result.code === 'INVITATION_EXPIRED' ? 'expired' : 'invalid',
          });
      });
    };
    readToken(true);
    // Another link opened in this tab changes the # only: no new page load.
    const onHashChange = () => readToken(false);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (state.step === 'loading') {
    return (
      <div
        className="grid gap-4"
        aria-busy
        aria-label="Chargement de l’invitation"
      >
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }
  if (state.step === 'form') {
    return (
      <PasswordForm
        token={state.token}
        invitation={state.invitation}
        onDone={() => setState({ step: 'done', invitation: state.invitation })}
        onExpired={() => setState({ step: 'expired' })}
        onInvalid={() => setState({ step: 'invalid' })}
      />
    );
  }
  if (state.step === 'done') {
    const isIntervenant =
      enumValue(UserRole, state.invitation.role) === UserRole.INTERVENANT;
    return (
      <Outcome
        icon={<CircleCheck />}
        tone="success"
        overline="Compte activé"
        title="Votre mot de passe est créé"
      >
        {isIntervenant ? (
          <p className="text-[0.9375rem] text-muted-foreground">
            Ouvrez l’application Sènami sur votre téléphone et connectez-vous
            avec {state.invitation.email} et ce mot de passe.
          </p>
        ) : (
          <>
            <p className="text-[0.9375rem] text-muted-foreground">
              Connectez-vous au back-office. Vous activerez ensuite la double
              authentification avec votre application.
            </p>
            <Button asChild size="lg" className="w-full">
              <Link href="/connexion">Se connecter</Link>
            </Button>
          </>
        )}
      </Outcome>
    );
  }
  if (state.step === 'expired') {
    return (
      <Outcome
        icon={<Clock />}
        tone="info"
        overline="Lien expiré"
        title="Ce lien n’est plus valable"
      >
        <p className="text-[0.9375rem] text-muted-foreground">
          Une invitation est valable 72 heures, et un nouveau lien remplace le
          précédent. Demandez un nouveau lien à la personne qui vous a invité :
          l’équipe Sènami ou le responsable de votre établissement.
        </p>
      </Outcome>
    );
  }
  return (
    <Outcome
      icon={<LockKeyhole />}
      tone="info"
      overline="Lien inutilisable"
      title="Ce lien ne permet pas d’activer un compte"
    >
      <p className="text-[0.9375rem] text-muted-foreground">
        Il a peut-être déjà servi. Si votre compte est activé, connectez-vous ;
        sinon, demandez un nouveau lien.
      </p>
      <Button asChild variant="outline" size="lg" className="w-full">
        <Link href="/connexion">Se connecter</Link>
      </Button>
    </Outcome>
  );
}

function PasswordForm({
  token,
  invitation,
  onDone,
  onExpired,
  onInvalid,
}: {
  token: string;
  invitation: Invitation;
  onDone: () => void;
  onExpired: () => void;
  onInvalid: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const rulesId = useId();
  const rules = passwordRules(password, confirmation);
  const role = enumValue(UserRole, invitation.role);

  return (
    <form
      className="grid gap-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await acceptInvitationAction(token, password);
          if (result.ok) return onDone();
          if (result.code === 'INVITATION_EXPIRED') return onExpired();
          if (result.code === 'INVITATION_INVALID') return onInvalid();
          setFailure(
            'Le mot de passe n’a pas pu être créé. Réessayez dans un instant.',
          );
        });
      }}
    >
      <div className="grid gap-2">
        <p className="font-display text-overline text-coral-600 uppercase">
          Invitation
        </p>
        <h1 className="text-[1.625rem] leading-tight font-bold tracking-tight text-indigo-900">
          Bienvenue, {invitation.firstName}
        </h1>
        <p className="text-[0.9375rem] text-muted-foreground">
          Créez votre mot de passe pour activer votre compte.
        </p>
      </div>
      <div className="grid gap-2.5 rounded-2xl bg-indigo-50 p-4 text-sm [&_svg]:size-4.5 [&_svg]:shrink-0 [&_svg]:text-indigo-600">
        {invitation.establishmentName === null ? null : (
          <p className="flex items-center gap-2.5">
            <Building2 aria-hidden />
            <span>
              <b>{invitation.establishmentName}</b>
              {invitation.establishmentCity === null
                ? ''
                : `, ${invitation.establishmentCity}`}
            </span>
          </p>
        )}
        <p className="flex items-center gap-2.5">
          <User aria-hidden />
          {role === UserRole.INTERVENANT
            ? 'Intervenant'
            : 'Responsable d’établissement'}
        </p>
        <p className="flex items-center gap-2.5 break-all">
          <Mail aria-hidden />
          {invitation.email}
        </p>
        <p className="flex items-center gap-2.5 tabular-nums">
          <Clock aria-hidden />
          Lien valable jusqu’au {formatDateTime(new Date(invitation.expiresAt))}
        </p>
      </div>
      {failure === null ? null : (
        <Alert tone="error" title="L’activation n’a pas abouti">
          {failure}
        </Alert>
      )}
      <div className="grid gap-4">
        <PasswordInputRow
          id="new-password"
          label="Mot de passe"
          value={password}
          onChange={setPassword}
          isVisible={isVisible}
          onToggle={() => setIsVisible((v) => !v)}
          describedBy={rulesId}
        />
        <PasswordInputRow
          id="confirm-password"
          label="Confirmation"
          value={confirmation}
          onChange={setConfirmation}
          isVisible={isVisible}
          onToggle={() => setIsVisible((v) => !v)}
          describedBy={rulesId}
        />
      </div>
      <ul
        id={rulesId}
        aria-live="polite"
        className="grid gap-1.5 text-[0.8125rem]"
      >
        <Rule isMet={rules.isLongEnough}>
          <span className="tabular-nums">{password.length}</span> caractère
          {password.length > 1 ? 's' : ''} sur {MIN_PASSWORD_LENGTH} au moins
        </Rule>
        <Rule isMet={rules.isConfirmed}>Les deux saisies sont identiques</Rule>
      </ul>
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!rules.isLongEnough || !rules.isConfirmed}
        isLoading={isPending}
      >
        {isPending ? 'Activation…' : 'Créer mon mot de passe'}
      </Button>
    </form>
  );
}

function PasswordInputRow({
  id,
  label,
  value,
  onChange,
  isVisible,
  onToggle,
  describedBy,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  isVisible: boolean;
  onToggle: () => void;
  describedBy: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={isVisible ? 'text' : 'password'}
        autoComplete="new-password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={describedBy}
        leadingIcon={<LockKeyhole />}
        trailing={
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={isVisible}
            aria-label={
              isVisible
                ? 'Masquer les mots de passe'
                : 'Afficher les mots de passe'
            }
            className="grid size-9 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-indigo-100 hover:text-indigo-900 [&_svg]:size-5"
          >
            {isVisible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </button>
        }
      />
    </div>
  );
}

function Rule({ isMet, children }: { isMet: boolean; children: ReactNode }) {
  return (
    <li
      className={cn(
        'flex items-center gap-2 transition-colors',
        isMet ? 'text-success' : 'text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'grid size-4.5 place-items-center rounded-full border-[1.5px] transition-colors',
          isMet ? 'border-success bg-success text-white' : 'border-slate-300',
        )}
      >
        <Check
          className={cn(
            'size-3 transition-opacity',
            isMet ? 'opacity-100' : 'opacity-0',
          )}
          strokeWidth={3}
          aria-hidden
        />
      </span>
      <span>{children}</span>
      <span className="sr-only">{isMet ? ' : respecté' : ' : pas encore'}</span>
    </li>
  );
}

function Outcome({
  icon,
  tone,
  overline,
  title,
  children,
}: {
  icon: ReactNode;
  tone: 'success' | 'info';
  overline: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-6">
      <span
        className={cn(
          'grid size-16 place-items-center rounded-2xl [&_svg]:size-8',
          tone === 'success'
            ? 'bg-success-surface text-success'
            : 'bg-info-surface text-info',
        )}
      >
        {icon}
      </span>
      <div className="grid gap-2">
        <p className="font-display text-overline text-coral-600 uppercase">
          {overline}
        </p>
        <h1 className="text-[1.625rem] leading-tight font-bold tracking-tight text-indigo-900">
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}

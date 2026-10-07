'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import {
  type SignInResult,
  signInAction,
} from '@features/auth/actions/sign-in.action';
import { AuthHeading } from '@features/auth/components/auth-heading';
import {
  type SignInValues,
  signInSchema,
} from '@features/auth/schemas/sign-in.schema';
import {
  AuthErrorCode,
  type AuthErrorMessage,
  describeAuthError,
} from '@features/auth/utils/auth-error-messages';
import { Alert } from '@shared/components/ui/alert';
import { Button } from '@shared/components/ui/button';
import { Field, fieldControlProps } from '@shared/components/ui/field';
import { Input } from '@shared/components/ui/input';
import { PasswordInput } from '@shared/components/ui/password-input';

export function SignInStep({
  onChallenge,
  onLocked,
}: {
  onChallenge: (result: Extract<SignInResult, { ok: true }>) => void;
  onLocked: (until: string | undefined) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [failure, setFailure] = useState<AuthErrorMessage | null>(null);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFailure(null);
    startTransition(async () => {
      const result = await signInAction(values);
      if (result.ok) return onChallenge(result);
      if (result.code === AuthErrorCode.TOTP_LOCKED) {
        return onLocked(result.lockedUntil);
      }
      setFailure(describeAuthError(result.code));
      form.resetField('password');
      form.setFocus('password');
    });
  });

  return (
    <form
      className="grid gap-6"
      noValidate
      onSubmit={(event) => void onSubmit(event)}
    >
      <AuthHeading overline="Back-office" title="Connexion">
        Réservée aux responsables d’établissement et à l’équipe Sènami.
      </AuthHeading>

      {failure === null ? null : (
        <Alert tone="error" title={failure.title}>
          {failure.text}
        </Alert>
      )}

      <div className="grid gap-4">
        <Field id="email" label="Adresse e-mail" error={errors.email?.message}>
          <Input
            {...fieldControlProps('email', errors.email?.message)}
            {...form.register('email', { onChange: () => setFailure(null) })}
            type="email"
            autoComplete="username"
            placeholder="nom@etablissement.fr"
            leadingIcon={<Mail />}
          />
        </Field>
        <Field
          id="password"
          label="Mot de passe"
          error={errors.password?.message}
          warning={isCapsLockOn ? 'Majuscules activées.' : undefined}
        >
          <PasswordInput
            {...fieldControlProps('password', errors.password?.message)}
            {...form.register('password', { onChange: () => setFailure(null) })}
            autoComplete="current-password"
            placeholder="Votre mot de passe"
            onCapsLockChange={setIsCapsLockOn}
          />
        </Field>
      </div>

      <Button type="submit" size="lg" className="w-full" isLoading={isPending}>
        {isPending ? 'Connexion…' : 'Se connecter'}
      </Button>
    </form>
  );
}

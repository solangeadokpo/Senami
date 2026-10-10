'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, PenLine, Send, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { createEstablishmentAction } from '@features/establishments/actions/establishment.actions';
import { EstablishmentFields } from '@features/establishments/components/establishment-fields';
import {
  type EstablishmentValues,
  type ResponsableValues,
  establishmentSchema,
  responsableSchema,
} from '@features/establishments/schemas/establishment.schema';
import { describeEstablishmentError } from '@features/establishments/utils/error-messages';
import { typeLabel } from '@features/establishments/utils/labels';
import { Alert } from '@shared/components/ui/alert';
import { Button } from '@shared/components/ui/button';
import { Field, fieldControlProps } from '@shared/components/ui/field';
import { Input } from '@shared/components/ui/input';
import { cn } from '@shared/utils/cn';

const STEPS = ['Établissement', 'Responsable', 'Vérification'];
const RESPONSABLE_HINT =
  'Reçoit l’invitation à créer son mot de passe, valable 72 heures.';

/** SA-02 in three steps; the summary lets each block be changed. */
export function CreationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'next' | 'back'>('next');
  const [failure, setFailure] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const establishment = useForm<EstablishmentValues>({
    resolver: zodResolver(establishmentSchema),
    defaultValues: {
      name: '',
      addressLine: '',
      postalCode: '',
      city: '',
      phone: '',
      email: '',
    },
    mode: 'onTouched',
  });
  const responsable = useForm<ResponsableValues>({
    resolver: zodResolver(responsableSchema),
    defaultValues: { firstName: '', lastName: '', email: '' },
    mode: 'onTouched',
  });

  const goTo = (next: number) => {
    setDirection(next > step ? 'next' : 'back');
    setFailure(null);
    setStep(next);
  };

  const onContinue = async () => {
    const isValid =
      step === 0
        ? await establishment.trigger(undefined, { shouldFocus: true })
        : await responsable.trigger(undefined, { shouldFocus: true });
    if (isValid) goTo(step + 1);
  };

  const onCreate = () =>
    startTransition(async () => {
      const result = await createEstablishmentAction({
        establishment: establishment.getValues(),
        responsable: responsable.getValues(),
      });
      if (result.ok) {
        router.push(`/etablissements/${result.establishmentId}`);
        return;
      }
      setFailure(describeEstablishmentError(result.code));
    });

  const values = useWatch({ control: establishment.control });
  const person = useWatch({ control: responsable.control });
  const establishmentRows: [string, string][] = [
    ['Nom', values.name ?? ''],
    ['Type', values.type === undefined ? '' : typeLabel(values.type)],
    [
      'Adresse',
      `${values.addressLine ?? ''}, ${values.postalCode ?? ''} ${values.city ?? ''}`,
    ],
  ];
  if (values.phone) establishmentRows.push(['Téléphone', values.phone]);
  if (values.email) establishmentRows.push(['E-mail', values.email]);

  return (
    <form
      className="grid max-w-[760px] gap-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (step < 2) void onContinue();
        else onCreate();
      }}
    >
      <div className="grid gap-2">
        <Link
          href="/etablissements"
          className="text-sm font-bold text-muted-foreground hover:text-indigo-900"
        >
          ← Établissements
        </Link>
        <h1 className="text-[1.625rem] font-bold tracking-tight text-indigo-900">
          Nouvel établissement
        </h1>
      </div>

      <div className="grid gap-6 rounded-3xl border bg-white p-6 sm:p-7">
        <ol
          className="grid grid-cols-3 gap-2"
          aria-label="Étapes de la création"
        >
          {STEPS.map((label, index) => (
            <li
              key={label}
              aria-current={index === step ? 'step' : undefined}
              className={cn(
                'grid gap-2 text-[0.8125rem] font-bold before:h-1 before:rounded-full before:transition-colors before:duration-300',
                index < step && 'text-slate-600 before:bg-indigo-900',
                index === step && 'text-coral-600 before:bg-coral-300',
                index > step && 'text-slate-500 before:bg-slate-200',
              )}
            >
              {label}
            </li>
          ))}
        </ol>

        <div
          key={step}
          className={cn(
            'grid gap-5 motion-safe:animate-[slide_0.3s_ease-out]',
            direction === 'back' &&
              'motion-safe:animate-[slide-back_0.3s_ease-out]',
          )}
        >
          <StepTitle number={step + 1} title={STEPS[step] ?? ''} />
          {step === 0 ? (
            <EstablishmentFields
              register={establishment.register}
              control={establishment.control}
              errors={establishment.formState.errors}
              prefix="establishment-"
            />
          ) : null}
          {step === 1 ? (
            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="firstName"
                  label="Prénom"
                  error={responsable.formState.errors.firstName?.message}
                >
                  <Input
                    {...fieldControlProps(
                      'firstName',
                      responsable.formState.errors.firstName?.message,
                    )}
                    {...responsable.register('firstName')}
                    placeholder="Claire"
                    leadingIcon={<User />}
                  />
                </Field>
                <Field
                  id="lastName"
                  label="Nom"
                  error={responsable.formState.errors.lastName?.message}
                >
                  <Input
                    {...fieldControlProps(
                      'lastName',
                      responsable.formState.errors.lastName?.message,
                    )}
                    {...responsable.register('lastName')}
                    placeholder="Houngbo"
                  />
                </Field>
              </div>
              <Field
                id="responsable-email"
                label="E-mail du responsable"
                hint={RESPONSABLE_HINT}
                error={responsable.formState.errors.email?.message}
              >
                <Input
                  {...fieldControlProps(
                    'responsable-email',
                    responsable.formState.errors.email?.message,
                  )}
                  {...responsable.register('email')}
                  type="email"
                  placeholder="direction@ecole.fr"
                  leadingIcon={<Mail />}
                />
              </Field>
            </div>
          ) : null}
          {step === 2 ? (
            <div className="grid gap-4">
              <p className="text-sm text-muted-foreground">
                Relisez avant de créer : l’invitation part dès la création.
              </p>
              <Summary
                title="Établissement"
                onEdit={() => goTo(0)}
                rows={establishmentRows}
              />
              <Summary
                title="Responsable"
                onEdit={() => goTo(1)}
                rows={[
                  ['Nom', `${person.firstName ?? ''} ${person.lastName ?? ''}`],
                  ['E-mail', person.email ?? ''],
                ]}
              />
              {failure === null ? null : (
                <Alert tone="error" title="La création n’a pas abouti">
                  {failure}
                </Alert>
              )}
            </div>
          ) : null}
        </div>

        <div className="h-px bg-slate-200" />
        <div className="flex flex-wrap justify-between gap-2">
          {step === 0 ? (
            <Button asChild variant="ghost">
              <Link href="/etablissements">Annuler</Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => goTo(step - 1)}
              disabled={isPending}
            >
              Retour
            </Button>
          )}
          <Button type="submit" size="lg" isLoading={isPending}>
            {step < 2 ? (
              'Continuer'
            ) : (
              <>
                {isPending ? null : <Send aria-hidden />}
                {isPending ? 'Création…' : 'Créer et inviter le responsable'}
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

function StepTitle({ number, title }: { number: number; title: string }) {
  return (
    <p className="flex items-center gap-3 font-display text-lg font-bold text-indigo-900">
      <span className="grid size-7 place-items-center rounded-full bg-coral-100 text-[0.8125rem] text-coral-700">
        {number}
      </span>
      {title}
    </p>
  );
}

function Summary({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: [string, string][];
  onEdit: () => void;
}) {
  return (
    <section className="grid gap-3 rounded-2xl border px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[0.9375rem] font-bold text-indigo-900">{title}</h3>
        <Button type="button" variant="link" onClick={onEdit}>
          <PenLine aria-hidden />
          Modifier
        </Button>
      </div>
      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[160px_minmax(0,1fr)]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="mb-2 font-semibold break-words sm:mb-0">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

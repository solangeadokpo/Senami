'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Mail, MapPin, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { updateIdentityAction } from '@features/establishments/actions/establishment.actions';
import type { EstablishmentDetail } from '@features/establishments/api/establishments.api';
import { LogoField } from '@features/establishments/components/logo-field';
import { SheetHeaderPreview } from '@features/establishments/components/sheet-header-preview';
import {
  type IdentityValues,
  identitySchema,
} from '@features/establishments/schemas/establishment.schema';
import { describeEstablishmentError } from '@features/establishments/utils/error-messages';
import { Alert } from '@shared/components/ui/alert';
import { Button } from '@shared/components/ui/button';
import { Field, fieldControlProps } from '@shared/components/ui/field';
import { Input } from '@shared/components/ui/input';
import { Toast } from '@shared/components/ui/toast';

/**
 * ETB-03: what the responsable keeps up to date; the sheet prints it.
 * `children` goes under the form: the recipients.
 */
export function IdentityForm({
  detail,
  children,
}: {
  detail: EstablishmentDetail;
  children?: ReactNode;
}) {
  const router = useRouter();
  const savedLogoUrl = detail.hasLogo
    ? `/api/v1/establishments/${detail.id}/logo?v=${Date.parse(detail.createdAt)}`
    : null;
  const [logo, setLogo] = useState<{ file: File; url: string } | null>(null);
  const [isLogoRemoved, setIsLogoRemoved] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [isPending, startTransition] = useTransition();
  const defaults: IdentityValues = {
    name: detail.name,
    addressLine: detail.addressLine,
    postalCode: detail.postalCode,
    city: detail.city,
    phone: detail.phone ?? '',
    email: detail.email ?? '',
  };
  const form = useForm<IdentityValues>({
    resolver: zodResolver(identitySchema),
    defaultValues: defaults,
    mode: 'onTouched',
  });
  const values = useWatch({ control: form.control });
  const { errors } = form.formState;

  useEffect(
    () => () => {
      if (logo !== null) URL.revokeObjectURL(logo.url);
    },
    [logo],
  );

  const shownLogo =
    logo?.url ??
    (isLogoRemoved || savedLogoUrl === null
      ? null
      : `${savedLogoUrl}&r=${version}`);
  const isDirty = form.formState.isDirty || logo !== null || isLogoRemoved;

  const reset = () => {
    form.reset(defaults);
    setLogo(null);
    setIsLogoRemoved(false);
    setFailure(null);
  };

  const onSubmit = form.handleSubmit((submitted) =>
    startTransition(async () => {
      let upload: FormData | null = null;
      if (logo !== null) {
        upload = new FormData();
        upload.set('logo', logo.file);
      }
      const result = await updateIdentityAction(
        detail.id,
        submitted,
        upload,
        isLogoRemoved,
      );
      if (!result.ok) {
        setFailure(describeEstablishmentError(result.code));
        return;
      }
      setFailure(null);
      form.reset(submitted);
      setLogo(null);
      setIsLogoRemoved(false);
      setVersion((current) => current + 1);
      setToast('Identité de l’établissement mise à jour.');
      router.refresh();
    }),
  );

  return (
    <>
      <div className="grid gap-1">
        <h1 className="text-[1.625rem] font-bold tracking-tight text-indigo-900">
          Fiche et destinataires
        </h1>
        <p className="text-muted-foreground">
          L’identité de l’établissement imprimée sur chaque fiche.
        </p>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-6">
          <form
            className="grid gap-5 rounded-3xl border bg-white p-6"
            noValidate
            onSubmit={(event) => void onSubmit(event)}
          >
            <h2 className="text-[1.0625rem] font-bold text-indigo-900">
              Identité de l’établissement
            </h2>
            {failure === null ? null : (
              <Alert tone="error" title="L’enregistrement n’a pas abouti">
                {failure}
              </Alert>
            )}
            <LogoField
              previewUrl={shownLogo}
              onChoose={(file) => {
                setLogo({ file, url: URL.createObjectURL(file) });
                setIsLogoRemoved(false);
              }}
              onRemove={() => {
                setLogo(null);
                setIsLogoRemoved(savedLogoUrl !== null);
              }}
            />
            <Field
              id="name"
              label="Nom imprimé sur la fiche"
              error={errors.name?.message}
            >
              <Input
                {...fieldControlProps('name', errors.name?.message)}
                {...form.register('name')}
                leadingIcon={<Building2 />}
              />
            </Field>
            <Field
              id="addressLine"
              label="Adresse"
              error={errors.addressLine?.message}
            >
              <Input
                {...fieldControlProps(
                  'addressLine',
                  errors.addressLine?.message,
                )}
                {...form.register('addressLine')}
                leadingIcon={<MapPin />}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="postalCode"
                label="Code postal"
                error={errors.postalCode?.message}
              >
                <Input
                  {...fieldControlProps(
                    'postalCode',
                    errors.postalCode?.message,
                  )}
                  {...form.register('postalCode')}
                  inputMode="numeric"
                  maxLength={5}
                  className="tabular-nums"
                />
              </Field>
              <Field id="city" label="Ville" error={errors.city?.message}>
                <Input
                  {...fieldControlProps('city', errors.city?.message)}
                  {...form.register('city')}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="phone" label="Téléphone" error={errors.phone?.message}>
                <Input
                  {...fieldControlProps('phone', errors.phone?.message)}
                  {...form.register('phone')}
                  inputMode="tel"
                  leadingIcon={<Phone />}
                  className="tabular-nums"
                />
              </Field>
              <Field id="email" label="E-mail" error={errors.email?.message}>
                <Input
                  {...fieldControlProps('email', errors.email?.message)}
                  {...form.register('email')}
                  type="email"
                  leadingIcon={<Mail />}
                />
              </Field>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={!isDirty || isPending}
                onClick={reset}
              >
                Annuler les modifications
              </Button>
              <Button type="submit" disabled={!isDirty} isLoading={isPending}>
                {isPending
                  ? 'Enregistrement…'
                  : 'Enregistrer les modifications'}
              </Button>
            </div>
          </form>
          {children}
        </div>
        <aside className="grid gap-4 rounded-3xl border bg-white p-6 xl:sticky xl:top-6">
          <h2 className="text-[1.0625rem] font-bold text-indigo-900">
            Aperçu de l’en-tête
          </h2>
          <SheetHeaderPreview
            name={values.name ?? ''}
            address={[
              values.addressLine,
              [values.postalCode, values.city].filter(Boolean).join(' '),
            ]
              .filter(Boolean)
              .join(', ')}
            phone={values.phone ?? ''}
            logoUrl={shownLogo}
          />
          <p className="text-sm text-muted-foreground">
            Données fictives. L’aperçu suit vos modifications.
          </p>
        </aside>
      </div>
      <Toast message={toast} />
    </>
  );
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { updateEstablishmentAction } from '@features/establishments/actions/establishment.actions';
import type { EstablishmentDetail } from '@features/establishments/api/establishments.api';
import { EstablishmentFields } from '@features/establishments/components/establishment-fields';
import {
  type EstablishmentValues,
  establishmentSchema,
} from '@features/establishments/schemas/establishment.schema';
import { describeEstablishmentError } from '@features/establishments/utils/error-messages';
import { Alert } from '@shared/components/ui/alert';
import { Button } from '@shared/components/ui/button';
import { EstablishmentType } from '@shared/enums/establishment-type.enum';
import { enumValue } from '@shared/utils/enum-value';

export function EstablishmentEditForm({
  detail,
}: {
  detail: EstablishmentDetail;
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const type = enumValue(EstablishmentType, detail.type);
  const form = useForm<EstablishmentValues>({
    resolver: zodResolver(establishmentSchema),
    defaultValues: {
      name: detail.name,
      ...(type === undefined ? {} : { type }),
      addressLine: detail.addressLine,
      postalCode: detail.postalCode,
      city: detail.city,
      phone: detail.phone ?? '',
      email: detail.email ?? '',
    },
    mode: 'onTouched',
  });

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await updateEstablishmentAction(detail.id, values);
      if (result.ok) {
        router.push(`/etablissements/${detail.id}`);
        return;
      }
      setFailure(describeEstablishmentError(result.code));
    }),
  );

  return (
    <form
      className="grid max-w-[760px] gap-6"
      noValidate
      onSubmit={(event) => void onSubmit(event)}
    >
      <div className="grid gap-2">
        <Link
          href={`/etablissements/${detail.id}`}
          className="text-sm font-bold text-muted-foreground hover:text-indigo-900"
        >
          ← {detail.name}
        </Link>
        <h1 className="text-[1.625rem] font-bold tracking-tight text-indigo-900">
          Modifier l’établissement
        </h1>
      </div>
      {failure === null ? null : (
        <Alert tone="error" title="La modification n’a pas abouti">
          {failure}
        </Alert>
      )}
      <div className="grid gap-6 rounded-3xl border bg-white p-6 sm:p-7">
        <EstablishmentFields
          register={form.register}
          control={form.control}
          errors={form.formState.errors}
        />
        <div className="h-px bg-slate-200" />
        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild variant="ghost">
            <Link href={`/etablissements/${detail.id}`}>Annuler</Link>
          </Button>
          <Button
            type="submit"
            disabled={!form.formState.isDirty}
            isLoading={isPending}
          >
            {isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </div>
    </form>
  );
}

'use client';

import { Building2, Mail, MapPin, Phone } from 'lucide-react';
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { TYPE_OPTIONS } from '@features/establishments/utils/labels';
import {
  Field,
  FieldHelp,
  fieldControlProps,
} from '@shared/components/ui/field';
import { Input } from '@shared/components/ui/input';
import { RadioChips } from '@shared/components/ui/radio-chips';
import type { EstablishmentValues } from '@features/establishments/schemas/establishment.schema';

/** The fields of an establishment, shared by the wizard and the edit page. */
export function EstablishmentFields({
  register,
  control,
  errors,
  prefix = '',
  isTypeEditable = true,
}: {
  // The wizard nests them under `establishment.`, the edit page does not.
  register: UseFormRegister<EstablishmentValues>;
  control: Control<EstablishmentValues>;
  errors: FieldErrors<EstablishmentValues>;
  prefix?: string;
  isTypeEditable?: boolean;
}) {
  const id = (name: string) => `${prefix}${name}`;
  return (
    <div className="grid gap-5">
      <Field
        id={id('name')}
        label="Nom de l’établissement"
        error={errors.name?.message}
      >
        <Input
          {...fieldControlProps(id('name'), errors.name?.message)}
          {...register('name')}
          placeholder="Ex. École Sainte-Marie"
          leadingIcon={<Building2 />}
        />
      </Field>
      {isTypeEditable ? (
        <div className="grid gap-2">
          <span
            id={id('type-label')}
            className="text-label text-slate-700 uppercase"
          >
            Type
          </span>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <RadioChips
                options={TYPE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                labelledBy={id('type-label')}
                describedBy={id('type-help')}
                isInvalid={errors.type !== undefined}
              />
            )}
          />
          <FieldHelp id={id('type-help')} error={errors.type?.message} />
        </div>
      ) : null}
      <Field
        id={id('addressLine')}
        label="Adresse"
        error={errors.addressLine?.message}
      >
        <Input
          {...fieldControlProps(id('addressLine'), errors.addressLine?.message)}
          {...register('addressLine')}
          placeholder="Ex. 12 rue des Écoles"
          leadingIcon={<MapPin />}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={id('postalCode')}
          label="Code postal"
          error={errors.postalCode?.message}
        >
          <Input
            {...fieldControlProps(id('postalCode'), errors.postalCode?.message)}
            {...register('postalCode')}
            inputMode="numeric"
            maxLength={5}
            placeholder="59000"
            className="tabular-nums"
          />
        </Field>
        <Field id={id('city')} label="Ville" error={errors.city?.message}>
          <Input
            {...fieldControlProps(id('city'), errors.city?.message)}
            {...register('city')}
            placeholder="Lille"
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={id('phone')}
          label="Téléphone (facultatif)"
          error={errors.phone?.message}
        >
          <Input
            {...fieldControlProps(id('phone'), errors.phone?.message)}
            {...register('phone')}
            inputMode="tel"
            placeholder="03 20 00 00 00"
            leadingIcon={<Phone />}
            className="tabular-nums"
          />
        </Field>
        <Field
          id={id('email')}
          label="E-mail de l’établissement (facultatif)"
          error={errors.email?.message}
        >
          <Input
            {...fieldControlProps(id('email'), errors.email?.message)}
            {...register('email')}
            type="email"
            placeholder="contact@ecole.fr"
            leadingIcon={<Mail />}
          />
        </Field>
      </div>
    </div>
  );
}

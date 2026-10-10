'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState, useTransition } from 'react';
import { updateSheetRecipientsAction } from '@features/sheet-recipients/actions/sheet-recipients.actions';
import { EmailChipsField } from '@features/sheet-recipients/components/email-chips-field';
import {
  DUPLICATE_EMAIL,
  INVALID_EMAIL,
  NO_PRIMARY_RECIPIENT,
  type RecipientsValues,
  recipientsSchema,
} from '@features/sheet-recipients/schemas/sheet-recipients.schema';
import { describeRecipientsError } from '@features/sheet-recipients/utils/error-messages';
import { hasEmail, isEmail } from '@features/sheet-recipients/utils/email-list';
import { Alert } from '@shared/components/ui/alert';
import { Button } from '@shared/components/ui/button';
import { Toast } from '@shared/components/ui/toast';
import { RecipientList } from '@shared/enums/recipient-list.enum';

type ListErrors = Partial<
  Record<RecipientList, { message: string; index?: number }>
>;

const LISTS = Object.values(RecipientList);

const FIELDS: Record<RecipientList, { label: string; hint?: string }> = {
  [RecipientList.TO]: {
    label: 'Destinataires principaux',
    hint: 'Au moins une adresse.',
  },
  [RecipientList.CC]: { label: 'Copie' },
  [RecipientList.BCC]: {
    label: 'Copie cachée',
    hint: 'Ces adresses ne sont pas visibles des autres destinataires.',
  },
};

function isRecipientList(value: unknown): value is RecipientList {
  return LISTS.some((list) => list === value);
}

function sameLists(a: RecipientsValues, b: RecipientsValues): boolean {
  return LISTS.every(
    (list) =>
      a[list].length === b[list].length &&
      a[list].every((email, i) => email === b[list][i]),
  );
}

/** ETB-03: who receives the sheets, saved apart from the identity. */
export function RecipientsForm({ initial }: { initial: RecipientsValues }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [lists, setLists] = useState(initial);
  const [errors, setErrors] = useState<ListErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isDirty = !sameLists(lists, saved);

  /** Refuses an invalid address, or one present in any of the three lists. */
  const validateIn =
    (list: RecipientList) => (email: string, accepted: string[]) => {
      if (!isEmail(email)) return INVALID_EMAIL;
      const others = LISTS.filter((other) => other !== list).flatMap(
        (other) => lists[other],
      );
      return hasEmail([...accepted, ...others], email) ? DUPLICATE_EMAIL : null;
    };

  const change = (list: RecipientList, emails: string[]) => {
    setLists((current) => ({ ...current, [list]: emails }));
    setErrors(({ [list]: _, ...others }) => others);
  };

  const reset = () => {
    setLists(saved);
    setErrors({});
    setFailure(null);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = recipientsSchema.safeParse(lists);
    if (!parsed.success) {
      const found: ListErrors = {};
      for (const issue of parsed.error.issues) {
        const [list, index] = issue.path;
        if (!isRecipientList(list) || found[list] !== undefined) continue;
        found[list] = {
          message: issue.message,
          ...(typeof index === 'number' ? { index } : {}),
        };
      }
      setErrors(found);
      return;
    }

    startTransition(async () => {
      const result = await updateSheetRecipientsAction(parsed.data);
      if (!result.ok) {
        const apiErrors = errorsOf(result);
        setErrors(apiErrors);
        setFailure(
          Object.keys(apiErrors).length > 0
            ? null
            : describeRecipientsError(result.code),
        );
        return;
      }
      const { to, cc, bcc } = result.recipients;
      setSaved({ to, cc, bcc });
      setLists({ to, cc, bcc });
      setErrors({});
      setFailure(null);
      setToast('Destinataires mis à jour.');
      router.refresh();
    });
  };

  return (
    <form
      className="grid gap-5 rounded-3xl border bg-white p-6"
      noValidate
      onSubmit={onSubmit}
    >
      <div className="grid gap-1">
        <h2 className="text-[1.0625rem] font-bold text-indigo-900">
          Destinataires des fiches
        </h2>
        <p className="text-sm text-muted-foreground">
          Les fiches sont transmises par e-mail à ces adresses.
        </p>
      </div>
      {failure === null ? null : (
        <Alert tone="error" title="L’enregistrement n’a pas abouti">
          {failure}
        </Alert>
      )}
      {LISTS.map((list) => (
        <EmailChipsField
          key={list}
          id={`recipients-${list}`}
          label={FIELDS[list].label}
          hint={FIELDS[list].hint}
          emails={lists[list]}
          onChange={(emails) => change(list, emails)}
          validate={validateIn(list)}
          isLastRequired={list === RecipientList.TO}
          error={errors[list]?.message}
          invalidIndex={errors[list]?.index}
        />
      ))}
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
          {isPending ? 'Enregistrement…' : 'Enregistrer les destinataires'}
        </Button>
      </div>
      <Toast message={toast} />
    </form>
  );
}

/** The API errors that point at a list, shown under it. */
function errorsOf(result: {
  code: string;
  fields?: { field: string }[];
  details?: Record<string, unknown>;
}): ListErrors {
  if (result.code === 'NO_PRIMARY_RECIPIENT') {
    return { [RecipientList.TO]: { message: NO_PRIMARY_RECIPIENT } };
  }
  if (result.code === 'RECIPIENT_EMAIL_DUPLICATED') {
    const list = result.details?.['list'];
    const index = result.details?.['index'];
    if (!isRecipientList(list)) return {};
    return {
      [list]: {
        message: DUPLICATE_EMAIL,
        ...(typeof index === 'number' ? { index } : {}),
      },
    };
  }
  if (result.code === 'VALIDATION_FAILED') {
    const found: ListErrors = {};
    for (const { field } of result.fields ?? []) {
      const list = field.split(/[.[]/)[0];
      if (isRecipientList(list)) {
        found[list] = { message: describeRecipientsError(result.code) };
      }
    }
    return found;
  }
  return {};
}

'use client';

import { X } from 'lucide-react';
import {
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
  useRef,
  useState,
} from 'react';
import { splitEmails } from '@features/sheet-recipients/utils/email-list';
import { FieldHelp } from '@shared/components/ui/field';
import { Label } from '@shared/components/ui/label';
import { cn } from '@shared/utils/cn';

const SEPARATOR_KEYS = new Set(['Enter', ',', ';']);

/**
 * A list of emails as chips, each removed with its cross; typing then Enter,
 * a comma, a semicolon or leaving the field adds what was typed.
 */
export function EmailChipsField({
  id,
  label,
  hint,
  emails,
  onChange,
  validate,
  isLastRequired = false,
  error,
  invalidIndex,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  emails: string[];
  onChange: (emails: string[]) => void;
  /** The message refusing an email, given the ones already accepted. */
  validate: (email: string, accepted: string[]) => string | null;
  /** The last chip cannot be removed. */
  isLastRequired?: boolean;
  /** From the form or the API. */
  error?: string | undefined;
  /** The chip the error is about. */
  invalidIndex?: number | undefined;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isLastSelected, setIsLastSelected] = useState(false);
  const isLocked = isLastRequired && emails.length === 1;
  const shownError = draftError ?? error ?? undefined;

  /** Adds the valid addresses; the refused ones stay in the input. */
  const commit = (text: string) => {
    const accepted: string[] = [];
    const refused: string[] = [];
    let message: string | null = null;
    for (const email of splitEmails(text)) {
      const refusal = validate(email, [...emails, ...accepted]);
      if (refusal === null) accepted.push(email);
      else {
        refused.push(email);
        message ??= refusal;
      }
    }
    if (accepted.length > 0) onChange([...emails, ...accepted]);
    setDraft(refused.join(', '));
    setDraftError(message);
  };

  const remove = (index: number) => {
    onChange(emails.filter((_, i) => i !== index));
    setIsLastSelected(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (SEPARATOR_KEYS.has(event.key) && draft.trim() !== '') {
      event.preventDefault();
      commit(draft);
      return;
    }
    if (event.key === 'Backspace' && draft === '' && emails.length > 0) {
      if (isLocked) return;
      event.preventDefault();
      if (isLastSelected) remove(emails.length - 1);
      else setIsLastSelected(true);
      return;
    }
    setIsLastSelected(false);
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text');
    if (!/[\s,;]/.test(text.trim())) return;
    event.preventDefault();
    commit(`${draft} ${text}`);
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div
        className={cn(
          'flex min-h-12 flex-wrap items-center gap-2 rounded-xl border-[1.5px] border-transparent bg-indigo-50 px-2 py-1.5 transition-[background-color,border-color,box-shadow] focus-within:border-indigo-600 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgb(91_81_160/0.12)] hover:bg-indigo-100',
          shownError !== undefined && 'border-error bg-white',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {emails.length === 0 ? null : (
          <ul
            role="list"
            className="contents"
            aria-label={`${label} : adresses ajoutées`}
          >
            {emails.map((email, index) => {
              const isLast = index === emails.length - 1;
              return (
                <li
                  key={`${email}-${index}`}
                  className={cn(
                    'inline-flex max-w-full items-center gap-1 rounded-full bg-white py-1 pr-1 pl-3 text-sm font-semibold text-indigo-900 ring-1 ring-indigo-900/12',
                    index === invalidIndex &&
                      'text-error ring-[1.5px] ring-error',
                    isLast && isLastSelected && 'ring-2 ring-indigo-600',
                  )}
                >
                  <span className="truncate">{email}</span>
                  <button
                    type="button"
                    className="-my-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors outline-none hover:bg-indigo-50 hover:text-indigo-900 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
                    aria-label={`Retirer ${email}`}
                    disabled={isLocked}
                    onClick={(event) => {
                      event.stopPropagation();
                      remove(index);
                    }}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="email"
          autoComplete="off"
          aria-describedby={`${id}-help`}
          aria-invalid={shownError === undefined ? undefined : true}
          placeholder={emails.length === 0 ? 'nom@etablissement.fr' : undefined}
          className="h-9 min-w-[12ch] flex-1 bg-transparent px-2 text-base font-medium text-foreground outline-none placeholder:font-normal placeholder:text-slate-500"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setDraftError(null);
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => {
            setIsLastSelected(false);
            if (draft.trim() !== '') commit(draft);
          }}
        />
      </div>
      <FieldHelp
        id={`${id}-help`}
        error={shownError}
        hint={
          isLocked ? 'Au moins un destinataire principal est requis.' : hint
        }
      />
    </div>
  );
}

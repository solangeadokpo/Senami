'use client';

import { Dialog } from 'radix-ui';
import { type ReactNode, useId, useState, useTransition } from 'react';
import { Button } from '@shared/components/ui/button';
import { Label } from '@shared/components/ui/label';
import { Textarea } from '@shared/components/ui/textarea';
import { cn } from '@shared/utils/cn';

const TONES = {
  warning: 'bg-warning-surface text-warning',
  success: 'bg-success-surface text-success',
  error: 'bg-error-surface text-error',
} as const;

export interface ReasonField {
  label: string;
  placeholder: string;
  hint: string;
  min: number;
  max: number;
}

/**
 * I-06: a confirmation, before an action that cannot be taken back lightly.
 * `onConfirm` returns an error message to show, or null once done.
 */
export function ConfirmDialog({
  trigger,
  tone,
  icon,
  title,
  description,
  confirmLabel,
  isDestructive = false,
  reason,
  onConfirm,
}: {
  trigger: ReactNode;
  tone: keyof typeof TONES;
  icon: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  isDestructive?: boolean;
  reason?: ReasonField;
  onConfirm: (reason: string) => Promise<string | null>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const reasonId = useId();
  const isReady = reason === undefined || text.trim().length >= reason.min;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (isPending) return;
        setIsOpen(open);
        if (!open) {
          setText('');
          setError(null);
        }
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-indigo-950/50 motion-safe:animate-[appear_0.15s_ease-out]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 gap-5 rounded-3xl bg-white p-7 shadow-[0_40px_80px_-32px_rgb(0_0_0/0.5)] motion-safe:animate-rise">
          <span
            className={cn(
              'grid size-12 place-items-center rounded-2xl [&_svg]:size-6',
              TONES[tone],
            )}
          >
            {icon}
          </span>
          <div className="grid gap-2">
            <Dialog.Title className="font-display text-xl font-bold text-indigo-900">
              {title}
            </Dialog.Title>
            <Dialog.Description className="text-slate-700">
              {description}
            </Dialog.Description>
          </div>
          {reason === undefined ? null : (
            <div className="grid gap-2">
              <Label htmlFor={reasonId}>{reason.label}</Label>
              <Textarea
                id={reasonId}
                value={text}
                maxLength={reason.max}
                placeholder={reason.placeholder}
                onChange={(event) => setText(event.target.value)}
                aria-describedby={`${reasonId}-help`}
              />
              <div className="flex justify-between gap-3 text-sm text-muted-foreground">
                <span id={`${reasonId}-help`}>{reason.hint}</span>
                <span className="tabular-nums">
                  {text.length} / {reason.max}
                </span>
              </div>
            </div>
          )}
          {error === null ? null : (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={isPending}>
                Annuler
              </Button>
            </Dialog.Close>
            <Button
              variant={isDestructive ? 'destructive' : 'default'}
              disabled={!isReady}
              isLoading={isPending}
              onClick={() =>
                startTransition(async () => {
                  const failure = await onConfirm(text.trim());
                  if (failure === null) {
                    setIsOpen(false);
                    setText('');
                  } else {
                    setError(failure);
                  }
                })
              }
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

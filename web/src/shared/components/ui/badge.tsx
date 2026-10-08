import type { ReactNode } from 'react';
import { cn } from '@shared/utils/cn';

const TONES = {
  success: 'bg-success-surface text-success',
  warning: 'bg-warning-surface text-warning',
  error: 'bg-error-surface text-error',
  info: 'bg-indigo-100 text-indigo-600',
  coral: 'bg-coral-100 text-coral-700',
  neutral: 'bg-slate-100 text-slate-600',
} as const;

export type BadgeTone = keyof typeof TONES;

/** A state at a glance: the label carries it, the colour only helps (I-05). */
export function Badge({
  tone,
  children,
  hasDot = true,
}: {
  tone: BadgeTone;
  children: ReactNode;
  hasDot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-0.5 text-xs font-extrabold whitespace-nowrap',
        TONES[tone],
      )}
    >
      {hasDot ? (
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
      ) : null}
      {children}
    </span>
  );
}

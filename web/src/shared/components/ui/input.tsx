import type { ComponentProps } from 'react';
import { cn } from '@shared/utils/cn';

// I-03: the label above (Label), the hint below, the error in place of the
// hint. `aria-invalid` turns the border to the error colour.
export function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-11 w-full min-w-0 rounded-xl border border-input bg-background px-4 text-base font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground focus-visible:border-indigo-600 focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-error aria-invalid:ring-error/20',
        className,
      )}
      {...props}
    />
  );
}

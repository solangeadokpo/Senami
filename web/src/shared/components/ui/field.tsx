import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Label } from '@shared/components/ui/label';
import { cn } from '@shared/utils/cn';

/** The accessibility props a control placed in a Field must carry. */
export function fieldControlProps(id: string, error: string | undefined) {
  return {
    id,
    'aria-describedby': `${id}-help`,
    'aria-invalid': error === undefined ? undefined : true,
  } as const;
}

/** I-03: label above, hint below, the error in place of the hint. */
export function Field({
  id,
  label,
  hint,
  error,
  warning,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | undefined;
  /** Shown in place of the hint when there is no error, e.g. caps lock. */
  warning?: string | undefined;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      <p
        id={`${id}-help`}
        aria-live="polite"
        className={cn(
          'flex min-h-5 items-center gap-2 text-sm',
          error === undefined
            ? warning === undefined
              ? 'text-muted-foreground'
              : 'text-warning'
            : 'text-error',
        )}
      >
        {error === undefined ? null : (
          <CircleAlert className="size-4 shrink-0" aria-hidden />
        )}
        {error ?? warning ?? hint}
      </p>
    </div>
  );
}

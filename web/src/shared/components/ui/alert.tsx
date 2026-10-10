import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@shared/utils/cn';

const TONES = {
  error: { icon: CircleAlert, className: 'bg-error-surface text-error' },
  warning: {
    icon: TriangleAlert,
    className: 'bg-warning-surface text-warning',
  },
  info: { icon: Info, className: 'bg-info-surface text-info' },
  success: { icon: CircleCheck, className: 'bg-success-surface text-success' },
} as const;

/** I-05: a message always carries an icon and a tone label, never colour alone. */
export function Alert({
  tone,
  title,
  children,
  className,
}: {
  tone: keyof typeof TONES;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  const { icon: Icon, className: toneClassName } = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-xl px-4 py-3 text-sm motion-safe:animate-appear',
        toneClassName,
        className,
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="grid gap-0.5">
        <p className="font-extrabold">{title}</p>
        {children === undefined ? null : (
          <div className="text-foreground">{children}</div>
        )}
      </div>
    </div>
  );
}

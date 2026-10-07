import { cn } from '@shared/utils/cn';

const STEPS = ['Scanner', 'Confirmer', 'Codes de secours'];

/** The three steps of a first sign-in; the current one in coral. */
export function EnrolmentProgress({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Étapes de l’activation">
      {STEPS.map((label, index) => (
        <li
          key={label}
          aria-current={index === current ? 'step' : undefined}
          className={cn(
            'grid gap-2 text-xs font-semibold before:h-1 before:rounded-full before:transition-colors before:duration-300',
            index < current && 'text-muted-foreground before:bg-indigo-900',
            index === current && 'text-coral-600 before:bg-coral-300',
            index > current && 'text-muted-foreground before:bg-slate-200',
          )}
        >
          {label}
        </li>
      ))}
    </ol>
  );
}

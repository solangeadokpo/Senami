import { Check } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@shared/utils/cn';

export function Checkbox({
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <span className="relative inline-grid size-5 shrink-0 place-items-center">
      <input
        type="checkbox"
        className={cn(
          'peer rounded-md size-5 cursor-pointer appearance-none border-[1.5px] border-slate-300 bg-white transition-colors outline-none checked:border-indigo-900 checked:bg-indigo-900 hover:border-indigo-600 focus-visible:ring-3 focus-visible:ring-ring/50',
          className,
        )}
        {...props}
      />
      <Check
        className="pointer-events-none absolute size-3 text-white opacity-0 peer-checked:opacity-100"
        strokeWidth={3}
        aria-hidden
      />
    </span>
  );
}

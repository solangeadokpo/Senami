import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@shared/utils/cn';

/** The native select: keyboard, mobile pickers and screen readers for free. */
export function Select({
  className,
  children,
  ...props
}: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          'h-12 w-full cursor-pointer appearance-none rounded-xl border-[1.5px] border-transparent bg-indigo-50 pr-10 pl-4 font-medium text-foreground transition-[background-color,border-color] outline-none hover:bg-indigo-100 focus:border-indigo-600 focus:bg-white',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-slate-600"
        aria-hidden
      />
    </div>
  );
}

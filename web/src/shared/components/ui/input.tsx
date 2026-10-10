import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@shared/utils/cn';

// Filled fields of the validated mockup, ruled on focus. I-03: the label
// above, the hint below, the error in place of the hint (see Field).
export function Input({
  className,
  type,
  leadingIcon,
  trailing,
  ...props
}: ComponentProps<'input'> & {
  /** A decorative icon at the start of the field. */
  leadingIcon?: ReactNode;
  /** A control at the end of the field, such as a show-password button. */
  trailing?: ReactNode;
}) {
  return (
    <div className="group/input relative flex items-center">
      {leadingIcon === undefined ? null : (
        <span
          className="pointer-events-none absolute left-4 text-slate-500 transition-colors group-focus-within/input:text-indigo-600 [&_svg]:size-5"
          aria-hidden
        >
          {leadingIcon}
        </span>
      )}
      <input
        type={type}
        data-slot="input"
        className={cn(
          'h-12 w-full min-w-0 rounded-xl border-[1.5px] border-transparent bg-indigo-50 px-4 text-base font-medium text-foreground transition-[background-color,border-color,box-shadow] outline-none placeholder:font-normal placeholder:text-slate-500 hover:bg-indigo-100 focus:border-indigo-600 focus:bg-white focus:shadow-[0_0_0_4px_rgb(91_81_160/0.12)] disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-error aria-invalid:bg-white',
          leadingIcon !== undefined && 'pl-11',
          trailing !== undefined && 'pr-12',
          className,
        )}
        {...props}
      />
      {trailing === undefined ? null : (
        <span className="absolute right-1">{trailing}</span>
      )}
    </div>
  );
}

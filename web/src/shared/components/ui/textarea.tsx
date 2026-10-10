import type { ComponentProps } from 'react';
import { cn } from '@shared/utils/cn';

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'min-h-24 w-full resize-y rounded-xl border-[1.5px] border-transparent bg-indigo-50 px-4 py-3 font-medium text-foreground transition-[background-color,border-color,box-shadow] outline-none placeholder:font-normal placeholder:text-slate-500 hover:bg-indigo-100 focus:border-indigo-600 focus:bg-white focus:shadow-[0_0_0_4px_rgb(91_81_160/0.12)] aria-invalid:border-error aria-invalid:bg-white',
        className,
      )}
      {...props}
    />
  );
}

'use client';

import { Label as LabelPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@shared/utils/cn';

/** The charter field label: spaced capitals, above the field. */
export function Label({
  className,
  ...props
}: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'text-label text-slate-700 uppercase select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

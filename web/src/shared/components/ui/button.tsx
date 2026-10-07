import { type VariantProps, cva } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@shared/utils/cn';

// I-01: pill, ExtraBold, 44 px touch target at least. I-02: no arrow nor
// chevron, the label is enough. S-02: one `default` button per screen.
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-extrabold whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        /** The action of the screen: indigo, never coral (C-04). */
        default: 'bg-primary text-primary-foreground hover:bg-indigo-800',
        /** Secondary: indigo outline, transparent fill. */
        outline:
          'border border-indigo-900 bg-transparent text-indigo-900 hover:bg-indigo-50',
        /** Discreet: text only, indigo 600. */
        link: 'text-link hover:underline',
        /** Icon only, for closing a dialog (S-08). */
        ghost: 'text-indigo-900 hover:bg-accent',
        /** After an explicit confirmation only. */
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-error/90',
      },
      size: {
        default: 'h-11 px-5 text-sm [&_svg]:size-5',
        lg: 'h-13 px-6 text-md [&_svg]:size-5',
        xl: 'h-14 px-7 text-base [&_svg]:size-6',
        icon: 'size-11 [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot.Root : 'button';
  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

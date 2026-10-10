import { type VariantProps, cva } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@shared/utils/cn';

// I-01: pill, ExtraBold, 44 px touch target at least. I-02: no arrow nor
// chevron, the label is enough. S-02: one `default` button per screen.
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-extrabold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-busy:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        /** The action of the screen: indigo, never coral (C-04). */
        default:
          'bg-primary text-primary-foreground shadow-[0_6px_16px_-8px_rgb(46_42_77/0.7)] hover:bg-indigo-800 hover:shadow-[0_10px_20px_-10px_rgb(46_42_77/0.8)]',
        /** Secondary: indigo outline, transparent fill. */
        outline:
          'border border-indigo-900 bg-transparent text-indigo-900 hover:bg-indigo-50',
        /** Discreet: text only, coral 600 (validated mockup). */
        link: 'h-auto min-h-8 rounded-lg px-1 text-coral-600 hover:text-coral-700 hover:underline hover:underline-offset-4',
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
  isLoading = false,
  children,
  ...props
}: ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Shows a spinner and blocks a second submission. */
    isLoading?: boolean;
  }) {
  const Component = asChild ? Slot.Root : 'button';
  return (
    <Component
      data-slot="button"
      aria-busy={isLoading || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {isLoading ? (
        <>
          <LoaderCircle className="animate-spin" aria-hidden />
          {children}
        </>
      ) : (
        children
      )}
    </Component>
  );
}

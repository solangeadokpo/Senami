import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The charter type scale (globals.css) is unknown to tailwind-merge, which
// would take `text-label` for a colour and drop it next to `text-slate-700`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display',
            'title',
            'subtitle',
            'body',
            'value',
            'label',
            'overline',
            'mention',
            'md',
          ],
        },
      ],
    },
  },
});

/** Joins class names; a later Tailwind class wins over a conflicting one. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

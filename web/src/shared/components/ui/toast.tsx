'use client';

import { CircleCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@shared/utils/cn';

/** A short confirmation at the bottom of the screen, gone after 4 s. */
export function Toast({ message }: { message: string | null }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message === null) return;
    const show = setTimeout(() => setIsVisible(true), 50);
    const hide = setTimeout(() => setIsVisible(false), 4000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [message]);

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-none fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-xl bg-indigo-900 px-4 py-3 text-sm text-white shadow-[0_12px_32px_-12px_rgb(46_42_77/0.5)] transition-[opacity,translate] duration-300',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
      )}
    >
      <CircleCheck className="size-5 shrink-0 text-coral-300" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

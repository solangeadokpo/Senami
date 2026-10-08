'use client';

import type { KeyboardEvent } from 'react';
import { cn } from '@shared/utils/cn';

/** A single choice shown as chips: a radio group, arrows move the choice. */
export function RadioChips<T extends string>({
  options,
  value,
  onChange,
  labelledBy,
  describedBy,
  isInvalid = false,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
  labelledBy: string;
  describedBy?: string;
  isInvalid?: boolean;
}) {
  const onKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    if (next === undefined) return;
    onChange(next.value);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [(index + step + options.length) % options.length]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={isInvalid || undefined}
      className="flex flex-wrap gap-2"
    >
      {options.map((option, index) => {
        const isChecked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isChecked}
            tabIndex={
              isChecked || (value === undefined && index === 0) ? 0 : -1
            }
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'min-h-10 rounded-full px-4 text-sm font-bold transition-[background-color,color,transform] outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97]',
              isChecked
                ? 'bg-indigo-900 text-white'
                : 'bg-indigo-50 text-slate-700 hover:bg-indigo-100 hover:text-indigo-900',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

'use client';

import {
  type ClipboardEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
} from 'react';
import { cn } from '@shared/utils/cn';

/**
 * A one-time code in separate boxes: typing moves forward, Backspace and the
 * arrows move back, a pasted code fills every box. `errorCount` changes on
 * each refusal, which shakes the boxes and clears them.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  isInvalid = false,
  errorCount = 0,
  isDisabled = false,
  autoFocus = false,
  labelledBy,
  describedBy,
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  isInvalid?: boolean;
  errorCount?: number;
  isDisabled?: boolean;
  autoFocus?: boolean;
  labelledBy: string;
  describedBy?: string;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? '');

  useEffect(() => {
    if (autoFocus || errorCount > 0) inputs.current[0]?.focus();
  }, [autoFocus, errorCount]);

  const focus = (index: number) =>
    inputs.current[Math.max(0, Math.min(index, length - 1))]?.focus();

  const setDigit = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join('').slice(0, length));
  };

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && digits[index] === '' && index > 0) {
      event.preventDefault();
      setDigit(index - 1, '');
      focus(index - 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focus(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focus(index + 1);
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, length);
    if (pasted === '') return;
    event.preventDefault();
    onChange(pasted);
    focus(pasted.length);
  };

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      key={errorCount}
      className={cn(
        'grid grid-cols-6 gap-2',
        errorCount > 0 && 'motion-safe:animate-shake',
      )}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element;
          }}
          value={digit}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={isDisabled}
          aria-label={`Chiffre ${index + 1} sur ${length}`}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy}
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={onPaste}
          onChange={(event) => {
            const typed = event.target.value.replace(/\D/g, '').slice(-1);
            setDigit(index, typed);
            if (typed !== '') focus(index + 1);
          }}
          className={cn(
            'h-14 w-full min-w-0 rounded-xl border-[1.5px] border-transparent bg-indigo-50 text-center font-display text-2xl font-bold text-indigo-900 tabular-nums caret-indigo-600 transition-[background-color,border-color,box-shadow] outline-none hover:bg-indigo-100 focus:border-indigo-600 focus:bg-white focus:shadow-[0_0_0_4px_rgb(91_81_160/0.12)] disabled:opacity-60',
            digit !== '' && 'border-indigo-200 bg-white',
            isInvalid && 'border-error bg-white',
            index === Math.floor(length / 2) - 1 && 'mr-2',
          )}
        />
      ))}
    </div>
  );
}

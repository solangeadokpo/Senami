'use client';

import { useEffect, useState } from 'react';
import { NBSP } from '@shared/utils/format-time';

/** Milliseconds left until `deadline`, refreshed four times a second. */
export function useCountdown(deadline: Date): number {
  const [left, setLeft] = useState(() =>
    Math.max(0, deadline.getTime() - Date.now()),
  );

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, deadline.getTime() - Date.now()));
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [deadline]);

  return left;
}

/** "4 min 05 s" */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}${NBSP}min ${String(seconds % 60).padStart(2, '0')}${NBSP}s`;
}

/** "14:58", for the large lock countdown. */
export function formatClock(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

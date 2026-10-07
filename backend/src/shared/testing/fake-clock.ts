import type { Clock } from '@shared/interfaces/clock.interface.js';

export class FakeClock implements Clock {
  constructor(private current = new Date('2026-10-06T08:00:00.000Z')) {}

  now(): Date {
    return new Date(this.current);
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

export const MINUTE_MS = 60_000;
export const DAY_MS = 86_400_000;

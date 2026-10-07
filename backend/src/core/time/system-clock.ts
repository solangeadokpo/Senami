import type { Clock } from '@shared/interfaces/clock.interface.js';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

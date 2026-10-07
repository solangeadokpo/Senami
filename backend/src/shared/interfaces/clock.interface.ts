/** Injected instead of `new Date()`, so tests control the time. */
export interface Clock {
  now(): Date;
}

export const CLOCK = Symbol('CLOCK');

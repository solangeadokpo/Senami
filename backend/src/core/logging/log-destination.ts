import type { DestinationStream } from 'pino';

/** Where logs are written. `null` means stdout; tests provide a stream. */
export const LOG_DESTINATION = Symbol('LOG_DESTINATION');

export type LogDestination = DestinationStream | null;

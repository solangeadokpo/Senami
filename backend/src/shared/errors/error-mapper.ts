export interface FieldError {
  field: string;
  constraint: string;
  message: string;
}

/** An error translated into what the filter needs to answer and log. */
export interface ResolvedError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  fields?: FieldError[];
  context?: Record<string, unknown>;
  /** Logged at error level whatever the status. */
  securityAlert?: boolean;
}

/** Translates one kind of error, or returns undefined to let the next try. */
export interface ErrorMapper {
  map(exception: unknown): ResolvedError | undefined;
}

/** Ordered list of mappers, the first match wins. */
export const ERROR_MAPPERS = Symbol('ERROR_MAPPERS');

import type { ValidationError } from 'class-validator';
import type { FieldError } from '@shared/errors/error-mapper.js';

/** One entry per failed constraint; nested and array paths joined with dots. */
export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): FieldError[] {
  return errors.flatMap((error) => {
    const field =
      parentPath === '' ? error.property : `${parentPath}.${error.property}`;

    const own = Object.entries(error.constraints ?? {}).map(
      ([constraint, message]) => ({ field, constraint, message }),
    );

    return [...own, ...flattenValidationErrors(error.children ?? [], field)];
  });
}

import { ValidationError } from 'class-validator';
import { flattenValidationErrors } from './flatten-validation-errors.js';

function validationError(
  property: string,
  constraints: Record<string, string> = {},
  children: ValidationError[] = [],
): ValidationError {
  return Object.assign(new ValidationError(), {
    property,
    constraints,
    children,
  });
}

describe('flattenValidationErrors', () => {
  it('returns one field error per failed constraint', () => {
    const errors = [
      validationError('postalCode', {
        isNotEmpty: 'postalCode should not be empty',
        matches: 'postalCode must be 5 digits',
      }),
    ];

    expect(flattenValidationErrors(errors)).toEqual([
      {
        field: 'postalCode',
        constraint: 'isNotEmpty',
        message: 'postalCode should not be empty',
      },
      {
        field: 'postalCode',
        constraint: 'matches',
        message: 'postalCode must be 5 digits',
      },
    ]);
  });

  it('joins nested and array paths with dots', () => {
    const errors = [
      validationError('contacts', {}, [
        validationError('0', {}, [
          validationError('phone', { isNotEmpty: 'phone should not be empty' }),
        ]),
      ]),
    ];

    expect(flattenValidationErrors(errors)).toEqual([
      {
        field: 'contacts.0.phone',
        constraint: 'isNotEmpty',
        message: 'phone should not be empty',
      },
    ]);
  });
});

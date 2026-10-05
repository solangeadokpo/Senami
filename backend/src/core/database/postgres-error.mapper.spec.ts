import { DatabaseError } from 'pg';
import { PostgresErrorMapper } from './postgres-error.mapper.js';

function databaseError(code: string): DatabaseError {
  const error = new DatabaseError(
    'duplicate key value violates unique constraint "users_email_uq"',
    0,
    'error',
  );
  error.code = code;
  error.constraint = 'users_email_uq';
  error.table = 'users';
  return error;
}

// What Drizzle throws: its own error, with the driver error as cause.
function drizzleQueryError(cause: DatabaseError): Error {
  return new Error('Failed query: insert into "users" ...', { cause });
}

describe('PostgresErrorMapper', () => {
  const mapper = new PostgresErrorMapper();

  it.each([
    ['23505', 409, 'UNIQUE_VIOLATION'],
    ['23503', 409, 'REFERENCE_VIOLATION'],
    ['23514', 422, 'CONSTRAINT_VIOLATION'],
    ['23502', 422, 'CONSTRAINT_VIOLATION'],
    ['42501', 403, 'FORBIDDEN'],
    ['40001', 500, 'INTERNAL_ERROR'],
  ])('maps PostgreSQL %s to %i %s', (pgCode, status, code) => {
    const resolved = mapper.map(drizzleQueryError(databaseError(pgCode)));

    expect(resolved?.status).toBe(status);
    expect(resolved?.code).toBe(code);
  });

  it('keeps the SQL details out of the message, in the context', () => {
    const resolved = mapper.map(drizzleQueryError(databaseError('23505')));

    expect(resolved?.message).not.toMatch(/users_email_uq|insert/);
    expect(resolved?.context).toEqual({
      pgCode: '23505',
      constraint: 'users_email_uq',
      table: 'users',
    });
  });

  it('flags a row level security violation as a security alert', () => {
    expect(
      mapper.map(drizzleQueryError(databaseError('42501')))?.securityAlert,
    ).toBe(true);
  });

  it('ignores an error with no database error in its causes', () => {
    expect(
      mapper.map(new Error('boom', { cause: new Error('deeper') })),
    ).toBeUndefined();
  });
});

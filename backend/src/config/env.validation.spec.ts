import {
  NodeEnv,
  validateEnvironment,
  validateScriptEnvironment,
} from './env.validation.js';

const DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
const JWT_SECRET = 'a-test-secret-of-at-least-32-characters';

describe('validateEnvironment', () => {
  it('applies the defaults when only the required variables are set', () => {
    const env = validateEnvironment({ DATABASE_URL, JWT_SECRET });

    expect(env.NODE_ENV).toBe(NodeEnv.DEVELOPMENT);
    expect(env.PORT).toBe(3000);
    expect(env.API_PREFIX).toBe('api');
  });

  it('converts a numeric string port', () => {
    expect(
      validateEnvironment({ DATABASE_URL, JWT_SECRET, PORT: '8080' }).PORT,
    ).toBe(8080);
  });

  it('rejects a missing DATABASE_URL, naming it', () => {
    expect(() => validateEnvironment({ JWT_SECRET })).toThrow(/DATABASE_URL/);
  });

  it('rejects an out of range port', () => {
    expect(() =>
      validateEnvironment({ DATABASE_URL, JWT_SECRET, PORT: '70000' }),
    ).toThrow(/PORT/);
  });

  it('rejects a non numeric API version', () => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL,
        JWT_SECRET,
        API_DEFAULT_VERSION: 'v1',
      }),
    ).toThrow(/API_DEFAULT_VERSION/);
  });

  it('rejects a missing JWT_SECRET', () => {
    expect(() => validateEnvironment({ DATABASE_URL })).toThrow(/JWT_SECRET/);
  });

  it('rejects a JWT_SECRET shorter than 32 characters', () => {
    expect(() =>
      validateEnvironment({ DATABASE_URL, JWT_SECRET: 'too-short' }),
    ).toThrow(/JWT_SECRET/);
  });

  it('applies the session defaults', () => {
    const env = validateEnvironment({ DATABASE_URL, JWT_SECRET });

    expect(env.ACCESS_TOKEN_TTL_MINUTES).toBe(15);
    expect(env.MOBILE_SESSION_DAYS).toBe(30);
  });
});

describe('validateScriptEnvironment', () => {
  it('needs no API secret', () => {
    expect(validateScriptEnvironment({ DATABASE_URL }).DATABASE_URL).toBe(
      DATABASE_URL,
    );
  });
});

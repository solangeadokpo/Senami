import { NodeEnv, validateEnvironment } from './env.validation.js';

const DATABASE_URL = 'postgres://user:pass@localhost:5432/db';

describe('validateEnvironment', () => {
  it('applies the defaults when only DATABASE_URL is set', () => {
    const env = validateEnvironment({ DATABASE_URL });

    expect(env.NODE_ENV).toBe(NodeEnv.DEVELOPMENT);
    expect(env.PORT).toBe(3000);
    expect(env.API_PREFIX).toBe('api');
  });

  it('converts a numeric string port', () => {
    expect(validateEnvironment({ DATABASE_URL, PORT: '8080' }).PORT).toBe(8080);
  });

  it('rejects a missing DATABASE_URL, naming it', () => {
    expect(() => validateEnvironment({})).toThrow(/DATABASE_URL/);
  });

  it('rejects an out of range port', () => {
    expect(() => validateEnvironment({ DATABASE_URL, PORT: '70000' })).toThrow(
      /PORT/,
    );
  });

  it('rejects a non numeric API version', () => {
    expect(() =>
      validateEnvironment({ DATABASE_URL, API_DEFAULT_VERSION: 'v1' }),
    ).toThrow(/API_DEFAULT_VERSION/);
  });
});

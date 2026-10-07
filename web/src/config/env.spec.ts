import { validateEnvironment } from './env';

const VALID = {
  API_URL: 'http://localhost:3000',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3001',
  NEXT_PUBLIC_APP_URL: 'http://app.localhost:3001',
};

describe('validateEnvironment', () => {
  it('accepts the three URLs', () => {
    expect(validateEnvironment(VALID)).toEqual(VALID);
  });

  it('names a missing variable', () => {
    expect(() => validateEnvironment({ ...VALID, API_URL: undefined })).toThrow(
      /API_URL/,
    );
  });

  it('rejects a value that is not a URL', () => {
    expect(() =>
      validateEnvironment({ ...VALID, NEXT_PUBLIC_APP_URL: 'app.senami.fr' }),
    ).toThrow(/NEXT_PUBLIC_APP_URL/);
  });
});

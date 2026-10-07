import { signInSchema } from './sign-in.schema';

function errorsOf(values: unknown) {
  const result = signInSchema.safeParse(values);
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue): [string, string] => [
          String(issue.path[0]),
          issue.message,
        ]),
      );
}

describe('signInSchema', () => {
  it('accepts an email and a password, trimming the email', () => {
    expect(
      signInSchema.parse({ email: ' lea@ecole.fr ', password: 'secret' }),
    ).toEqual({ email: 'lea@ecole.fr', password: 'secret' });
  });

  it('asks for both fields', () => {
    expect(errorsOf({ email: '', password: '' })).toEqual({
      email: 'Saisissez votre adresse e-mail.',
      password: 'Saisissez votre mot de passe.',
    });
  });

  it('rejects an address that is not an email', () => {
    expect(errorsOf({ email: 'lea.ecole.fr', password: 'x' })).toEqual({
      email: 'Saisissez une adresse e-mail valide, par exemple nom@ecole.fr.',
    });
  });
});

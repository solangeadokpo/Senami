import {
  AuthErrorCode,
  describeAuthError,
  isChallengeLost,
} from './auth-error-messages';

describe('describeAuthError', () => {
  it('names what is wrong and what to do', () => {
    expect(describeAuthError(AuthErrorCode.INVALID_CREDENTIALS)).toEqual({
      title: 'Adresse e-mail ou mot de passe incorrect',
      text: 'Vérifiez-les puis reconnectez-vous.',
    });
  });

  it('tells an intervenant to use the mobile app', () => {
    expect(describeAuthError(AuthErrorCode.CHANNEL_NOT_ALLOWED).title).toBe(
      'Ce compte se connecte depuis l’application mobile',
    );
  });

  it('reads an unknown code as a service unavailable', () => {
    expect(describeAuthError('API_UNAVAILABLE').title).toBe(
      'Le service est momentanément indisponible',
    );
  });
});

describe('isChallengeLost', () => {
  it.each([
    AuthErrorCode.INVALID_CHALLENGE,
    AuthErrorCode.TOTP_ALREADY_ENROLLED,
    AuthErrorCode.TOTP_NOT_ENROLLED,
    AuthErrorCode.TOTP_ENROLMENT_NOT_STARTED,
  ])('restarts the sign-in on %s', (code) => {
    expect(isChallengeLost(code)).toBe(true);
  });

  it('keeps the step on a wrong code', () => {
    expect(isChallengeLost(AuthErrorCode.INVALID_TOTP_CODE)).toBe(false);
  });
});

/** The codes of the API errors the sign-in handles. */
export const AuthErrorCode = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_NOT_ACTIVATED: 'ACCOUNT_NOT_ACTIVATED',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
  CHANNEL_NOT_ALLOWED: 'CHANNEL_NOT_ALLOWED',
  ESTABLISHMENT_SUSPENDED: 'ESTABLISHMENT_SUSPENDED',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_TOTP_CODE: 'INVALID_TOTP_CODE',
  TOTP_LOCKED: 'TOTP_LOCKED',
  INVALID_CHALLENGE: 'INVALID_CHALLENGE',
  TOTP_ALREADY_ENROLLED: 'TOTP_ALREADY_ENROLLED',
  TOTP_NOT_ENROLLED: 'TOTP_NOT_ENROLLED',
  TOTP_ENROLMENT_NOT_STARTED: 'TOTP_ENROLMENT_NOT_STARTED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
} as const;

export interface AuthErrorMessage {
  title: string;
  text: string;
}

// T-13: name what is concerned and the action to take again, no apology.
const MESSAGES: Record<string, AuthErrorMessage> = {
  [AuthErrorCode.INVALID_CREDENTIALS]: {
    title: 'Adresse e-mail ou mot de passe incorrect',
    text: 'Vérifiez-les puis reconnectez-vous.',
  },
  [AuthErrorCode.ACCOUNT_NOT_ACTIVATED]: {
    title: 'Ce compte n’est pas encore activé',
    text: 'Ouvrez le lien d’invitation reçu par e-mail pour créer votre mot de passe.',
  },
  [AuthErrorCode.ACCOUNT_DEACTIVATED]: {
    title: 'Ce compte est désactivé',
    text: 'Contactez le responsable de votre établissement.',
  },
  [AuthErrorCode.CHANNEL_NOT_ALLOWED]: {
    title: 'Ce compte se connecte depuis l’application mobile',
    text: 'Le back-office est réservé aux responsables d’établissement et à l’équipe Sènami.',
  },
  [AuthErrorCode.ESTABLISHMENT_SUSPENDED]: {
    title: 'L’accès de votre établissement est suspendu',
    text: 'Contactez l’équipe Sènami pour le rétablir.',
  },
  [AuthErrorCode.RATE_LIMITED]: {
    title: 'Trop de tentatives en une minute',
    text: 'Patientez une minute avant de réessayer.',
  },
  [AuthErrorCode.VALIDATION_FAILED]: {
    title: 'Informations incomplètes',
    text: 'Vérifiez les champs signalés puis réessayez.',
  },
};

const UNAVAILABLE: AuthErrorMessage = {
  title: 'Le service est momentanément indisponible',
  text: 'Réessayez dans un instant.',
};

/** The message of a sign-in error; any unknown code reads as unavailable. */
export function describeAuthError(code: string): AuthErrorMessage {
  return MESSAGES[code] ?? UNAVAILABLE;
}

/** The challenge is gone: the sign-in starts over. */
export function isChallengeLost(code: string): boolean {
  return (
    code === AuthErrorCode.INVALID_CHALLENGE ||
    code === AuthErrorCode.TOTP_ALREADY_ENROLLED ||
    code === AuthErrorCode.TOTP_NOT_ENROLLED ||
    code === AuthErrorCode.TOTP_ENROLMENT_NOT_STARTED
  );
}

export const INVALID_CODE_MESSAGE =
  'Code incorrect. Saisissez le code affiché en ce moment par votre application.';
export const INVALID_RECOVERY_CODE_MESSAGE =
  'Code de secours incorrect ou déjà utilisé. Vérifiez-le ou essayez-en un autre.';

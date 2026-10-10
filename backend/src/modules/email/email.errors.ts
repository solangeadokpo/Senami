import { UnavailableError } from '@shared/errors/domain.error.js';

export class EmailProviderUnavailableError extends UnavailableError {
  readonly code = 'EMAIL_PROVIDER_UNAVAILABLE';
  constructor(cause?: unknown) {
    super('The email could not be sent', { cause });
  }
}

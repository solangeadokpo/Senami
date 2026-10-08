export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** The template name, the only part of an email that is logged. */
  template: string;
}

/** Sends one email; rejects with EmailProviderUnavailableError. */
export interface EmailSender {
  send(email: OutgoingEmail): Promise<void>;
}

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

import { EmailProviderUnavailableError } from '@modules/email/email.errors.js';
import type {
  EmailSender,
  OutgoingEmail,
} from '@shared/interfaces/email-sender.interface.js';

/** Keeps the emails in memory. `failNext` makes the next send fail. */
export class FakeEmailSender implements EmailSender {
  readonly sent: OutgoingEmail[] = [];
  failNext = false;

  send(email: OutgoingEmail): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      return Promise.reject(new EmailProviderUnavailableError());
    }
    this.sent.push(email);
    return Promise.resolve();
  }

  lastTo(address: string): OutgoingEmail | undefined {
    return this.sent.filter((email) => email.to === address).at(-1);
  }
}

import { EmailProviderUnavailableError } from '@modules/email/email.errors.js';
import type { MailConfig } from '@config/index.js';
import { SmtpEmailSender } from './smtp-email-sender.js';

const CONFIG: MailConfig = {
  // Nothing listens on port 1 of the loopback: the connection is refused.
  host: '127.0.0.1',
  port: 1,
  secure: false,
  requireTls: false,
  auth: null,
  from: { address: 'no-reply@senami.test', name: 'Sènami' },
  webAppUrl: 'http://app.localhost:3001',
};

describe('SmtpEmailSender', () => {
  it('turns a refused delivery into EmailProviderUnavailableError', async () => {
    const sender = new SmtpEmailSender(CONFIG);

    await expect(
      sender.send({
        to: 'a@b.test',
        subject: 's',
        text: 't',
        html: '<p>t</p>',
        template: 'test',
      }),
    ).rejects.toBeInstanceOf(EmailProviderUnavailableError);
    sender.onModuleDestroy();
  });
});

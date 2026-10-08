import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
} from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { type MailConfig, mailConfig } from '@config/index.js';
import { EmailProviderUnavailableError } from '@modules/email/email.errors.js';
import type {
  EmailSender,
  OutgoingEmail,
} from '@shared/interfaces/email-sender.interface.js';

/** Any SMTP server: Mailpit locally, the provider's relay elsewhere. */
@Injectable()
export class SmtpEmailSender implements EmailSender, OnModuleDestroy {
  private readonly logger = new Logger(SmtpEmailSender.name);
  private readonly transport: Transporter;

  constructor(@Inject(mailConfig.KEY) private readonly config: MailConfig) {
    this.transport = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: config.requireTls,
      ...(config.auth === null ? {} : { auth: config.auth }),
    });
  }

  async send(email: OutgoingEmail): Promise<void> {
    try {
      await this.transport.sendMail({
        from: this.config.from,
        to: email.to,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
    } catch (error) {
      // Never the address, the subject nor the body.
      this.logger.warn('Email not sent', {
        template: email.template,
        err: error,
      });
      throw new EmailProviderUnavailableError(error);
    }
    this.logger.log('Email sent', { template: email.template });
  }

  onModuleDestroy(): void {
    this.transport.close();
  }
}

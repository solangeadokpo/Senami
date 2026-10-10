import { Module } from '@nestjs/common';
import { SmtpEmailSender } from '@modules/email/senders/smtp-email-sender.js';
import { EMAIL_SENDER } from '@shared/interfaces/email-sender.interface.js';

@Module({
  providers: [{ provide: EMAIL_SENDER, useClass: SmtpEmailSender }],
  exports: [EMAIL_SENDER],
})
export class EmailModule {}

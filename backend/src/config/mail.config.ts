import { registerAs } from '@nestjs/config';
import { NodeEnv, env } from './env.validation.js';

export const mailConfig = registerAs('mail', () => {
  const e = env();

  return {
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    secure: e.SMTP_SECURE,
    // In production a password never travels in clear: STARTTLS is required
    // when the connection does not start encrypted.
    requireTls: e.NODE_ENV === NodeEnv.PRODUCTION && !e.SMTP_SECURE,
    auth:
      e.SMTP_USER === undefined || e.SMTP_USER === ''
        ? null
        : { user: e.SMTP_USER, pass: e.SMTP_PASSWORD ?? '' },
    from: { address: e.MAIL_FROM_EMAIL, name: e.MAIL_FROM_NAME },
    webAppUrl: e.WEB_APP_URL.replace(/\/$/, ''),
  };
});

export type MailConfig = ReturnType<typeof mailConfig>;

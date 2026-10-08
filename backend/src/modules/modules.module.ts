import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { EmailModule } from './email/email.module.js';
import { EstablishmentsModule } from './establishments/establishments.module.js';
import { InvitationsModule } from './invitations/invitations.module.js';

/**
 * The business surface. Registering a new module here is the only change
 * outside its own folder.
 */
@Module({
  imports: [
    AuditModule,
    AuthModule,
    EmailModule,
    InvitationsModule,
    EstablishmentsModule,
  ],
})
export class ModulesModule {}

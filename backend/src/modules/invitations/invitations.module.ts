import { Module } from '@nestjs/common';
import { AuditModule } from '@modules/audit/audit.module.js';
import { AuthModule } from '@modules/auth/auth.module.js';
import { EmailModule } from '@modules/email/email.module.js';
import { InvitationsController } from './controllers/invitations.controller.js';
import { UserInvitationController } from './controllers/user-invitation.controller.js';
import { INVITATIONS_REPOSITORY } from './repositories/invitations.repository.js';
import { DrizzleInvitationsRepository } from './repositories/invitations.repository.drizzle.js';
import { InvitationsService } from './services/invitations.service.js';

@Module({
  imports: [AuditModule, AuthModule, EmailModule],
  controllers: [InvitationsController, UserInvitationController],
  providers: [
    InvitationsService,
    { provide: INVITATIONS_REPOSITORY, useClass: DrizzleInvitationsRepository },
  ],
  exports: [InvitationsService],
})
export class InvitationsModule {}

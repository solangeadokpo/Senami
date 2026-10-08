import { Module } from '@nestjs/common';
import { AuditModule } from '@modules/audit/audit.module.js';
import { InvitationsModule } from '@modules/invitations/invitations.module.js';
import { EstablishmentsController } from './controllers/establishments.controller.js';
import { ESTABLISHMENTS_REPOSITORY } from './repositories/establishments.repository.js';
import { DrizzleEstablishmentsRepository } from './repositories/establishments.repository.drizzle.js';
import { EstablishmentsService } from './services/establishments.service.js';

@Module({
  imports: [AuditModule, InvitationsModule],
  controllers: [EstablishmentsController],
  providers: [
    EstablishmentsService,
    {
      provide: ESTABLISHMENTS_REPOSITORY,
      useClass: DrizzleEstablishmentsRepository,
    },
  ],
})
export class EstablishmentsModule {}

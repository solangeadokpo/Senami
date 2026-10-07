import { Module } from '@nestjs/common';
import { AUDIT_REPOSITORY } from './repositories/audit.repository.js';
import { DrizzleAuditRepository } from './repositories/audit.repository.drizzle.js';
import { AuditService } from './services/audit.service.js';

@Module({
  providers: [
    AuditService,
    { provide: AUDIT_REPOSITORY, useClass: DrizzleAuditRepository },
  ],
  exports: [AuditService],
})
export class AuditModule {}

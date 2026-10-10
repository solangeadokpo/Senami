import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';

/**
 * The business surface. Registering a new module here is the only change
 * outside its own folder.
 */
@Module({
  imports: [AuditModule, AuthModule],
})
export class ModulesModule {}

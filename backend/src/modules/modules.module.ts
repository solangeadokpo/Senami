import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';

/**
 * The business surface. Registering a new module here is the only change
 * outside its own folder.
 */
@Module({
  imports: [AuthModule],
})
export class ModulesModule {}

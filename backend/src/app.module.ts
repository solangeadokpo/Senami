import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module.js';
import { ModulesModule } from './modules/modules.module.js';

@Module({
  imports: [CoreModule, ModulesModule],
})
export class AppModule {}

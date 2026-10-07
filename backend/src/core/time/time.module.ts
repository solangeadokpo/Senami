import { Global, Module } from '@nestjs/common';
import { CLOCK } from '@shared/interfaces/clock.interface.js';
import { SystemClock } from './system-clock.js';

@Global()
@Module({
  providers: [{ provide: CLOCK, useClass: SystemClock }],
  exports: [CLOCK],
})
export class TimeModule {}

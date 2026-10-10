import { Module } from '@nestjs/common';
import { AuditModule } from '@modules/audit/audit.module.js';
import { SheetRecipientsController } from './controllers/sheet-recipients.controller.js';
import { SHEET_RECIPIENTS_REPOSITORY } from './repositories/sheet-recipients.repository.js';
import { DrizzleSheetRecipientsRepository } from './repositories/sheet-recipients.repository.drizzle.js';
import { SheetRecipientsService } from './services/sheet-recipients.service.js';

@Module({
  imports: [AuditModule],
  controllers: [SheetRecipientsController],
  providers: [
    SheetRecipientsService,
    {
      provide: SHEET_RECIPIENTS_REPOSITORY,
      useClass: DrizzleSheetRecipientsRepository,
    },
  ],
  exports: [SheetRecipientsService],
})
export class SheetRecipientsModule {}

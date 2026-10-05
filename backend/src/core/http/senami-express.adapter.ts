import { BadRequestException } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';

/**
 * Nest turns a body parser SyntaxError into a BadRequestException and drops
 * the original; keeping it as `cause` lets HttpExceptionMapper answer
 * MALFORMED_JSON. Used by main.ts and by the e2e app.
 */
export class SenamiExpressAdapter extends ExpressAdapter {
  override mapException(error: unknown): unknown {
    if (error instanceof SyntaxError) {
      return new BadRequestException(error.message, { cause: error });
    }
    return super.mapException(error);
  }
}

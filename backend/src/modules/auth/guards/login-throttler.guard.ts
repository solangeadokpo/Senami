import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { isRecord } from '@shared/utils/is-record.js';

/** Counts sign-in attempts per IP address and email. */
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(
    request: Record<string, unknown>,
  ): Promise<string> {
    const ip = typeof request['ip'] === 'string' ? request['ip'] : 'unknown';
    const body = request['body'];
    const email =
      isRecord(body) && typeof body['email'] === 'string'
        ? body['email'].toLowerCase()
        : '';
    return Promise.resolve(`${ip}|${email}`);
  }
}

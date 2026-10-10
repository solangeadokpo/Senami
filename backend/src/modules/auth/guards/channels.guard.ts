import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHANNELS } from '@shared/decorators/channels.decorator.js';
import type { SessionChannel } from '@shared/enums/session-channel.enum.js';
import type { AuthenticatedRequest } from '@shared/interfaces/authenticated-user.interface.js';
import { ChannelNotAllowedError } from '@modules/auth/auth.errors.js';

/** Global, after AuthGuard. A route without @Channels() admits both. */
@Injectable()
export class ChannelsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const channels = this.reflector.getAllAndOverride<
      SessionChannel[] | undefined
    >(CHANNELS, [context.getHandler(), context.getClass()]);
    if (channels === undefined || channels.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (user === undefined || !channels.includes(user.channel)) {
      throw new ChannelNotAllowedError();
    }
    return true;
  }
}

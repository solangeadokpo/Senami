import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { ChannelNotAllowedError } from '@modules/auth/auth.errors.js';
import { Channels } from '@shared/decorators/channels.decorator.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import type { AuthenticatedRequest } from '@shared/interfaces/authenticated-user.interface.js';
import { ChannelsGuard } from './channels.guard.js';

class ProbeController {
  anywhere(this: void): void {}

  @Channels(SessionChannel.BACKOFFICE)
  backofficeOnly(this: void): void {}
}

@Channels(SessionChannel.BACKOFFICE)
class BackofficeController {
  inherited(this: void): void {}
}

describe('ChannelsGuard', () => {
  const guard = new ChannelsGuard(new Reflector());

  function run(
    channel: SessionChannel,
    controller: new () => object,
    handler: (this: void) => void,
  ): boolean {
    const request: Pick<AuthenticatedRequest, 'user'> = {
      user: {
        userId: 'u1',
        role: UserRole.RESPONSABLE,
        establishmentId: 'e1',
        sessionId: 's1',
        channel,
      },
    };
    return guard.canActivate(
      new ExecutionContextHost([request], controller, handler),
    );
  }

  it.each([SessionChannel.MOBILE, SessionChannel.BACKOFFICE])(
    'admits a %s session on a route without @Channels()',
    (channel) => {
      expect(
        run(channel, ProbeController, ProbeController.prototype.anywhere),
      ).toBe(true);
    },
  );

  it('admits a back office session on a back office route', () => {
    expect(
      run(
        SessionChannel.BACKOFFICE,
        ProbeController,
        ProbeController.prototype.backofficeOnly,
      ),
    ).toBe(true);
  });

  it('refuses a mobile session on a back office route', () => {
    expect(() =>
      run(
        SessionChannel.MOBILE,
        ProbeController,
        ProbeController.prototype.backofficeOnly,
      ),
    ).toThrow(ChannelNotAllowedError);
  });

  it('applies a @Channels() set on the controller', () => {
    expect(() =>
      run(
        SessionChannel.MOBILE,
        BackofficeController,
        BackofficeController.prototype.inherited,
      ),
    ).toThrow(ChannelNotAllowedError);
  });
});

import { SetMetadata } from '@nestjs/common';
import type { SessionChannel } from '@shared/enums/session-channel.enum.js';

export const CHANNELS = 'senami:channels';

/**
 * Restricts a route to sessions of these channels. Every back office route
 * carries `@Channels(SessionChannel.BACKOFFICE)`: a responsable signed in on
 * the mobile app has not proved a second factor.
 */
export const Channels = (...channels: SessionChannel[]) =>
  SetMetadata(CHANNELS, channels);

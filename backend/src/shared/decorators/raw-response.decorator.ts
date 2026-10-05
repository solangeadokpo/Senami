import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE = 'senami:raw-response';

/** Opts out of the `{ data }` envelope: health probes, provider webhooks. */
export const RawResponse = () => SetMetadata(RAW_RESPONSE, true);

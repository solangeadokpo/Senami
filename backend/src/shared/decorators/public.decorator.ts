import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'senami:public';

/** Opts a route out of authentication, which is required by default. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

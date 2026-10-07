import 'server-only';
import { validateEnvironment } from '@config/env';

/** Server Components, Server Actions and route handlers only. */
export const serverEnv = validateEnvironment(process.env);

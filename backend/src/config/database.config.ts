import { registerAs } from '@nestjs/config';
import { env } from './env.validation.js';

export const databaseConfig = registerAs('database', () => ({
  url: env().DATABASE_URL,
}));

export type DatabaseConfig = ReturnType<typeof databaseConfig>;

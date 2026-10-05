import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const url = process.env['DATABASE_URL'];
if (url === undefined || url === '') {
  throw new Error('DATABASE_URL is not set (see .env.example)');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  // TypeScript keys in camelCase, columns in snake_case. Must match the
  // `casing` option given to drizzle() in DatabaseModule.
  casing: 'snake_case',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});

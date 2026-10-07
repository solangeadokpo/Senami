import { z } from 'zod';

const environmentSchema = z.object({
  /** The API, called from the server only. */
  API_URL: z.url(),
  /** Showcase site, e.g. https://www.senami.fr. */
  NEXT_PUBLIC_SITE_URL: z.url(),
  /** Back office, e.g. https://app.senami.fr. */
  NEXT_PUBLIC_APP_URL: z.url(),
});

export type Environment = z.infer<typeof environmentSchema>;

/** Called by next.config.ts: dev, build and start fail on a bad variable. */
export function validateEnvironment(
  source: Record<string, string | undefined>,
): Environment {
  const result = environmentSchema.safeParse(source);
  if (result.success) return result.data;

  const issues = result.error.issues.map(
    (issue) => `  - ${issue.path.join('.')}: ${issue.message}`,
  );
  throw new Error(
    ['Invalid environment:', ...issues, '', 'See .env.example.'].join('\n'),
  );
}

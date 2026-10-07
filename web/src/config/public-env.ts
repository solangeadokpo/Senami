// Written out in full: Next.js inlines NEXT_PUBLIC_* at build time only for
// literal accesses. next.config.ts has already validated them.
export const publicEnv = {
  siteUrl: required('NEXT_PUBLIC_SITE_URL', process.env.NEXT_PUBLIC_SITE_URL),
  appUrl: required('NEXT_PUBLIC_APP_URL', process.env.NEXT_PUBLIC_APP_URL),
};

function required(name: string, value: string | undefined): string {
  if (value === undefined) throw new Error(`${name} is missing`);
  return value;
}

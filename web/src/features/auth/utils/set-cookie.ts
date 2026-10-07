export interface SessionCookie {
  value: string;
  expires: Date | undefined;
}

/** Finds a cookie among the Set-Cookie headers of an API response. */
export function findSetCookie(
  setCookies: string[],
  name: string,
): SessionCookie | undefined {
  const header = setCookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (header === undefined) return undefined;

  const [pair = '', ...attributes] = header
    .split(';')
    .map((part) => part.trim());
  const value = pair.slice(name.length + 1);
  if (value === '') return undefined;

  const expiresAttribute = attributes.find((attribute) =>
    attribute.toLowerCase().startsWith('expires='),
  );
  const expires =
    expiresAttribute === undefined
      ? undefined
      : new Date(expiresAttribute.slice('expires='.length));
  return {
    value,
    expires:
      expires === undefined || Number.isNaN(expires.getTime())
        ? undefined
        : expires,
  };
}

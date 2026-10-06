/**
 * Cuts at the first `?` and leaves the path as received: no URL parsing, which
 * would resolve `..` and swallow a leading `//` as a host, and so log a path
 * other than the one requested.
 */
export function pathWithoutQuery(url: string): string {
  const queryStart = url.indexOf('?');
  return queryStart === -1 ? url : url.slice(0, queryStart);
}

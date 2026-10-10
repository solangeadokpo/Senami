const HALF = 5;

/** Upper case, without separators, cut to ten characters, shown XXXXX-XXXXX. */
export function formatRecoveryCode(input: string): string {
  const raw = input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, HALF * 2);
  return raw.length > HALF ? `${raw.slice(0, HALF)}-${raw.slice(HALF)}` : raw;
}

export function isCompleteRecoveryCode(formatted: string): boolean {
  return formatted.replace('-', '').length === HALF * 2;
}

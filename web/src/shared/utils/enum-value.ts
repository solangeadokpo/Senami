/** The member of a string enum whose value is `value`, or undefined. */
export function enumValue<T extends string>(
  enumObject: Record<string, T>,
  value: string,
): T | undefined {
  return new Map<string, T>(
    Object.values(enumObject).map((member) => [member, member]),
  ).get(value);
}

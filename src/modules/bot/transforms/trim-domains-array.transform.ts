/**
 * class-transformer @Transform handler: trim each string in bot `domains` array.
 */
export function transformTrimDomainsArray({ value }: { value: unknown }): unknown {
  if (!Array.isArray(value)) {
    return value;
  }
  return value.map((v) => (typeof v === 'string' ? v.trim() : v));
}

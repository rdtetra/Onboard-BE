/**
 * Trim, default `https://` when no scheme, upgrade `http:` → `https:`, return canonical `URL` href.
 * Used for link chips, KB URL sources, and any user-entered web URL.
 */
export function normalizeHttpUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
    }
    return url.href;
  } catch {
    return withScheme;
  }
}

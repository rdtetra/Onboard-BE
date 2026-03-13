export function parseExpiry(expiry: string): { month: number; year: number } | null {
  const match = expiry.trim().match(/^(0[1-9]|1[0-2])\/([0-9]{2}|[0-9]{4})$/);
  if (!match) return null;
  const month = parseInt(match[1], 10);
  let year = parseInt(match[2], 10);
  if (year < 100) year += 2000;
  return { month, year };
}

import { ChipType } from '../../../common/enums/task.enum';

/**
 * class-transformer @Transform handler: for LINK chips, trim, default https, upgrade http→https, canonical href.
 */
export function transformLinkChipUrl({
  obj,
  value,
}: {
  obj: { type?: ChipType };
  value: unknown;
}): unknown {
  if (obj?.type !== ChipType.LINK || typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
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

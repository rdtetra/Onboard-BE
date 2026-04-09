import { ChipType } from '../../../common/enums/task.enum';
import { normalizeHttpUrl } from '../../../utils/normalize-http-url';

/**
 * class-transformer @Transform: LINK chips — same normalization as KB URL sources.
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
  return normalizeHttpUrl(value);
}

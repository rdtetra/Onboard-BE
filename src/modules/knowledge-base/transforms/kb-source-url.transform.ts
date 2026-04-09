import { SourceType } from '../../../common/enums/knowledge-base.enum';
import { normalizeHttpUrl } from '../../../utils/normalize-http-url';

/**
 * class-transformer @Transform for KB `url` when `sourceType` is URL, or on PATCH when `sourceType` is omitted.
 */
export function transformKbSourceUrl({
  obj,
  value,
}: {
  obj: { sourceType?: SourceType };
  value: unknown;
}): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  if (
    obj.sourceType !== undefined &&
    obj.sourceType !== SourceType.URL
  ) {
    return value;
  }
  return normalizeHttpUrl(value);
}

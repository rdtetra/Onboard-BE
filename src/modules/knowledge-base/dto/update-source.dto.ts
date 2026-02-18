import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateKBSourceDto } from './create-source.dto';

/** sourceType cannot be changed on update; only fields for the existing type apply */
export class UpdateKBSourceDto extends PartialType(
  OmitType(CreateKBSourceDto, ['sourceType']),
) {}

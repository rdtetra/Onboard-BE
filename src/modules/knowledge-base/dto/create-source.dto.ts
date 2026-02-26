import {
  IsEnum,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { SourceType, RefreshSchedule } from '../../../types/knowledge-base';

export class CreateKBSourceDto {
  @IsEnum(SourceType)
  sourceType: SourceType;

  @IsString()
  @MaxLength(200)
  name: string;

  @ValidateIf((o) => o.sourceType === SourceType.URL)
  @IsUrl()
  @MaxLength(2048)
  url?: string;

  @ValidateIf((o) => o.sourceType === SourceType.URL)
  @IsEnum(RefreshSchedule)
  refreshSchedule?: RefreshSchedule;

  @ValidateIf((o) => o.sourceType === SourceType.PDF || o.sourceType === SourceType.DOCX)
  @IsString()
  @MaxLength(2048)
  fileKey?: string;

  @ValidateIf((o) => o.sourceType === SourceType.TXT)
  @IsString()
  @MaxLength(50000)
  content?: string;
}

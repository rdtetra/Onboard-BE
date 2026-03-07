import {
  IsEnum,
  IsString,
  IsUrl,
  IsNotEmpty,
  IsDefined,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { SourceType, RefreshSchedule } from '../../../types/knowledge-base';

export class CreateKBSourceDto {
  @IsEnum(SourceType)
  sourceType: SourceType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ValidateIf((o) => o.sourceType === SourceType.URL)
  @IsNotEmpty({ message: 'URL is required for URL source type' })
  @IsUrl()
  @MaxLength(2048)
  url?: string;

  @ValidateIf((o) => o.sourceType === SourceType.URL)
  @IsEnum(RefreshSchedule)
  @IsNotEmpty({ message: 'refreshSchedule is required for URL source type' })
  refreshSchedule?: RefreshSchedule;

  @ValidateIf(
    (o) => o.sourceType === SourceType.PDF || o.sourceType === SourceType.DOCX,
  )
  @IsNotEmpty({ message: 'fileKey is required for file source type' })
  @IsString()
  @MaxLength(2048)
  fileKey?: string;

  @ValidateIf((o) => o.sourceType === SourceType.TXT)
  @IsDefined({ message: 'content is required for TXT source type' })
  @IsString()
  @MaxLength(50000)
  content?: string;
}

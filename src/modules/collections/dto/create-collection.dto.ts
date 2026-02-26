import { IsString, MaxLength, IsOptional } from 'class-validator';

export class CreateCollectionDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}

import { PartialType } from '@nestjs/mapped-types';
import { CreateTokenWalletDto } from './create-token-wallet.dto';

export class UpdateTokenWalletDto extends PartialType(CreateTokenWalletDto) {}

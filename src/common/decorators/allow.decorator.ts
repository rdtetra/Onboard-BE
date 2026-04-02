import { SetMetadata } from '@nestjs/common';
import { Permission } from '../enums/permissions.enum';

export const ALLOW_KEY = 'allow';
export const Allow = (...permissions: Permission[]) =>
  SetMetadata(ALLOW_KEY, permissions);

import { SetMetadata } from '@nestjs/common';
import { Permission } from '../../types/permissions';

export const ALLOW_KEY = 'allow';
export const Allow = (...permissions: Permission[]) => SetMetadata(ALLOW_KEY, permissions);

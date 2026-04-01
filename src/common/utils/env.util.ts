import type { ConfigService } from '@nestjs/config';

export function getRequiredEnv(configService: ConfigService, name: string): string {
  const value = configService.get<string>(name);
  if (!value || !value.trim()) {
    throw new Error(`${name} is missing`);
  }
  return value.trim();
}

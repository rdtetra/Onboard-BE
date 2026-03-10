import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { seedRoles } from 'src/database/seed-roles';
import { seedConversations } from 'src/database/seed-conversations';
import { DataSource } from 'typeorm';

function isSeedEnabled(envKey: string): boolean {
  return process.env[envKey] === 'true' || process.env[envKey] === '1';
}

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      if (isSeedEnabled('SEED_PERMISSIONS')) {
        this.logger.log('Running SEED_PERMISSIONS...');
        await seedRoles(this.dataSource);
        this.logger.log('SEED_PERMISSIONS completed');
      }

      if (isSeedEnabled('SEED_CONVERSATIONS')) {
        this.logger.log('Running SEED_CONVERSATIONS...');
        await seedConversations(this.dataSource);
        this.logger.log('SEED_CONVERSATIONS completed');
      }

      if (!isSeedEnabled('SEED_PERMISSIONS') && !isSeedEnabled('SEED_CONVERSATIONS')) {
        this.logger.debug('No seed env vars set (SEED_PERMISSIONS, SEED_CONVERSATIONS); skipping seed');
      }
    } catch (error) {
      this.logger.error('Database seed failed', error);
      throw error; // fail fast on startup if something is wrong
    }
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { seedRoles } from 'src/database/seed-roles';
import { DataSource } from 'typeorm';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    // Optional guard
    if (process.env.DISABLE_SEED === 'true') {
      this.logger.warn('Seeding is disabled');
      return;
    }

    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      this.logger.log('Starting database seed...');

      await seedRoles(this.dataSource);

      this.logger.log('Database seed completed');
    } catch (error) {
      this.logger.error('Database seed failed', error);
      throw error; // fail fast on startup if something is wrong
    }
  }
}

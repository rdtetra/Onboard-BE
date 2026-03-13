import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { seedRoles } from 'src/database/seed-roles';
import { seedConversations } from 'src/database/seed-conversations';
import { seedPlans } from 'src/database/seed-plans';
import { seedInvoices } from 'src/database/seed-invoices';
import { DataSource } from 'typeorm';

function isSeedEnabled(envKey: string, defaultValue = false): boolean {
  const raw = process.env[envKey];
  if (raw === undefined || raw === '') return defaultValue;
  return raw === 'true' || raw === '1';
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

      if (isSeedEnabled('SEED_PERMISSIONS', true)) {
        this.logger.log('Running SEED_PERMISSIONS...');
        await seedRoles(this.dataSource);
        this.logger.log('SEED_PERMISSIONS completed');
      }

      if (isSeedEnabled('SEED_CONVERSATIONS')) {
        this.logger.log('Running SEED_CONVERSATIONS...');
        await seedConversations(this.dataSource);
        this.logger.log('SEED_CONVERSATIONS completed');
      }

      if (isSeedEnabled('SEED_PLANS')) {
        this.logger.log('Running SEED_PLANS...');
        await seedPlans(this.dataSource);
        this.logger.log('SEED_PLANS completed');
      }

      if (isSeedEnabled('SEED_INVOICES')) {
        this.logger.log('Running SEED_INVOICES...');
        await seedInvoices(this.dataSource);
        this.logger.log('SEED_INVOICES completed');
      }

      if (
        !isSeedEnabled('SEED_PERMISSIONS') &&
        !isSeedEnabled('SEED_CONVERSATIONS') &&
        !isSeedEnabled('SEED_PLANS') &&
        !isSeedEnabled('SEED_INVOICES')
      ) {
        this.logger.debug(
          'No seed env vars set (SEED_PERMISSIONS, SEED_CONVERSATIONS, SEED_PLANS, SEED_INVOICES); skipping seed',
        );
      }
    } catch (error) {
      this.logger.error('Database seed failed', error);
      throw error; // fail fast on startup if something is wrong
    }
  }
}

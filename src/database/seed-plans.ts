import { DataSource } from 'typeorm';
import { Plan } from '../common/entities/plan.entity';
import { Subscription } from '../common/entities/subscription.entity';
import { Organization } from '../common/entities/organization.entity';
import { PlanKey } from '../types/plan-key';
import { SubscriptionStatus } from '../types/subscription-status';

interface PlanSeedRow {
  key: PlanKey;
  name: string;
  monthlyPriceCents: number;
  monthlyTokens: number;
  storageLimitMb: number;
  maxBots: number;
  features: Record<string, unknown>;
}

const DEFAULT_PLANS: PlanSeedRow[] = [
  {
    key: PlanKey.STARTER,
    name: 'Starter',
    monthlyPriceCents: 29000,
    monthlyTokens: 10_000,
    storageLimitMb: 10000,
    maxBots: 3,
    features: { prioritySupport: false, apiAccess: true },
  },
  {
    key: PlanKey.PRO,
    name: 'Pro',
    monthlyPriceCents: 99000,
    monthlyTokens: 50_000,
    storageLimitMb: 50000,
    maxBots: 10,
    features: { prioritySupport: true, apiAccess: true, analytics: true },
  },
  {
    key: PlanKey.ENTERPRISE,
    name: 'Enterprise',
    monthlyPriceCents: 299000,
    monthlyTokens: 200_000,
    storageLimitMb: 200_000,
    maxBots: 50,
    features: { prioritySupport: true, apiAccess: true, analytics: true, sso: true, dedicatedSlack: true },
  },
];

export async function seedPlans(dataSource: DataSource): Promise<void> {
  const planRepository = dataSource.getRepository(Plan);
  const subscriptionRepository = dataSource.getRepository(Subscription);
  const organizationRepository = dataSource.getRepository(Organization);

  for (const row of DEFAULT_PLANS) {
    const existing = await planRepository.findOne({ where: { key: row.key } });
    if (existing) {
      existing.name = row.name;
      existing.monthlyPriceCents = row.monthlyPriceCents;
      existing.monthlyTokens = row.monthlyTokens;
      existing.storageLimitMb = row.storageLimitMb;
      existing.maxBots = row.maxBots;
      existing.features = row.features;
      await planRepository.save(existing);
    } else {
      const plan = planRepository.create({
        key: row.key,
        name: row.name,
        monthlyPriceCents: row.monthlyPriceCents,
        monthlyTokens: row.monthlyTokens,
        storageLimitMb: row.storageLimitMb,
        maxBots: row.maxBots,
        features: row.features,
      });
      await planRepository.save(plan);
    }
  }

  const starterPlan = await planRepository.findOne({
    where: { key: PlanKey.STARTER },
  });
  if (!starterPlan) return;

  const allOrgs = await organizationRepository.find({ select: ['id'] });
  const orgsWithSubscription = await subscriptionRepository
    .createQueryBuilder('s')
    .select('DISTINCT s.org_id')
    .getRawMany<{ org_id: string }>();
  const orgIdsWithSub = new Set(orgsWithSubscription.map((r) => r.org_id));

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

  for (const org of allOrgs) {
    if (orgIdsWithSub.has(org.id)) continue;
    const sub = subscriptionRepository.create({
      organizationId: org.id,
      planId: starterPlan.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      nextRenewalAt: periodEnd,
      providerSubscriptionId: null,
    });
    await subscriptionRepository.save(sub);
  }
}

import { DataSource } from 'typeorm';
import { Plan } from '../common/entities/plan.entity';
import { Subscription } from '../common/entities/subscription.entity';
import { Organization } from '../common/entities/organization.entity';
import { TokenWallet } from '../common/entities/token-wallet.entity';
import { TokenTransaction } from '../common/entities/token-transaction.entity';
import { PlanKey } from '../types/plan-key';
import { SubscriptionStatus } from '../types/subscription-status';
import { TokenTransactionType } from '../types/token-transaction-type';

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
    features: {
      prioritySupport: true,
      apiAccess: true,
      analytics: true,
      sso: true,
      dedicatedSlack: true,
    },
  },
];

/** Credit the org wallet (same as recordGrant) — used when assigning a plan in seed. */
async function grantTokensToOrgWallet(
  dataSource: DataSource,
  orgId: string,
  amount: number,
  metadata: Record<string, unknown>,
): Promise<void> {
  if (amount <= 0) return;
  const walletRepo = dataSource.getRepository(TokenWallet);
  const txRepo = dataSource.getRepository(TokenTransaction);
  let wallet = await walletRepo.findOne({ where: { organizationId: orgId } });
  if (!wallet) {
    wallet = walletRepo.create({ organizationId: orgId, balance: 0 });
    wallet = await walletRepo.save(wallet);
  }
  const tx = txRepo.create({
    walletId: wallet.id,
    type: TokenTransactionType.SUBSCRIPTION_GRANT,
    amount,
    botId: null,
    conversationId: null,
    metadata,
  });
  await txRepo.save(tx);
  wallet.balance += amount;
  await walletRepo.save(wallet);
}

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
    await grantTokensToOrgWallet(
      dataSource,
      org.id,
      starterPlan.monthlyTokens,
      {
        source: 'seed',
        reason: 'new_subscription_starter_plan',
      },
    );
  }

  // Orgs that already had a subscription but no grant row yet (e.g. before wallet grants existed)
  const activeSubs = await subscriptionRepository.find({
    where: { status: SubscriptionStatus.ACTIVE },
    relations: ['plan'],
  });
  const walletRepo = dataSource.getRepository(TokenWallet);
  const txRepo = dataSource.getRepository(TokenTransaction);
  for (const sub of activeSubs) {
    const plan = sub.plan as Plan | undefined;
    if (!plan?.monthlyTokens) continue;
    let wallet = await walletRepo.findOne({
      where: { organizationId: sub.organizationId },
    });
    if (!wallet) {
      wallet = walletRepo.create({
        organizationId: sub.organizationId,
        balance: 0,
      });
      wallet = await walletRepo.save(wallet);
    }
    const grantCount = await txRepo.count({
      where: {
        walletId: wallet.id,
        type: TokenTransactionType.SUBSCRIPTION_GRANT,
      },
    });
    if (grantCount > 0) continue;
    await grantTokensToOrgWallet(
      dataSource,
      sub.organizationId,
      plan.monthlyTokens,
      { source: 'seed', reason: 'backfill_subscription_grant' },
    );
  }
}

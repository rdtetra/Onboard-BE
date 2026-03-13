import { DataSource } from 'typeorm';
import { Invoice } from '../common/entities/invoice.entity';
import { Subscription } from '../common/entities/subscription.entity';
import { Plan } from '../common/entities/plan.entity';
import { InvoiceStatus } from '../types/invoice-status';

function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setUTCMonth(out.getUTCMonth() + months);
  return out;
}

function startOfMonth(d: Date): Date {
  const out = new Date(d);
  out.setUTCDate(1);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

export async function seedInvoices(dataSource: DataSource): Promise<void> {
  const invoiceRepository = dataSource.getRepository(Invoice);
  const subscriptionRepository = dataSource.getRepository(Subscription);

  const existingCount = await invoiceRepository.count();
  if (existingCount > 0) {
    return; // already have invoices; skip to avoid duplicates
  }

  const allSubs = await subscriptionRepository.find({
    relations: ['plan'],
    order: { currentPeriodEnd: 'DESC' },
  });

  // One subscription per org (most recent)
  const byOrg = new Map<string, (typeof allSubs)[0]>();
  for (const sub of allSubs) {
    if (!byOrg.has(sub.organizationId)) {
      byOrg.set(sub.organizationId, sub);
    }
  }
  const subscriptions = Array.from(byOrg.values());

  if (subscriptions.length === 0) {
    return;
  }

  const now = new Date();

  for (const sub of subscriptions) {
    const plan = sub.plan as Plan | undefined;
    const amountCents = plan?.monthlyPriceCents ?? 29_00; // fallback $29

    // 3 past paid invoices (previous months)
    for (let i = 1; i <= 3; i++) {
      const periodEnd = startOfMonth(addMonths(now, -i));
      const periodStart = addMonths(periodEnd, -1);
      const dueDate = new Date(periodEnd);
      const paidAt = new Date(periodEnd);
      paidAt.setUTCDate(Math.min(5, 28)); // e.g. paid on 5th

      const inv = invoiceRepository.create({
        organizationId: sub.organizationId,
        subscriptionId: sub.id,
        status: InvoiceStatus.PAID,
        amountDue: amountCents,
        amountPaid: amountCents,
        currency: 'usd',
        providerInvoiceId: `inv_dummy_${sub.id}_${i}`,
        invoicePdfUrl: null,
        periodStart,
        periodEnd,
        dueDate,
        paidAt,
      });
      await invoiceRepository.save(inv);
    }

    // 1 open invoice (current period)
    const currentPeriodStart = startOfMonth(now);
    const currentPeriodEnd = addMonths(currentPeriodStart, 1);
    const dueDate = new Date(currentPeriodEnd);
    dueDate.setUTCDate(5);

    const openInv = invoiceRepository.create({
      organizationId: sub.organizationId,
      subscriptionId: sub.id,
      status: InvoiceStatus.OPEN,
      amountDue: amountCents,
      amountPaid: 0,
      currency: 'usd',
      providerInvoiceId: `inv_dummy_${sub.id}_current`,
      invoicePdfUrl: null,
      periodStart: currentPeriodStart,
      periodEnd: currentPeriodEnd,
      dueDate,
      paidAt: null,
    });
    await invoiceRepository.save(openInv);
  }
}

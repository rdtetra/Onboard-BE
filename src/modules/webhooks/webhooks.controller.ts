import { Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Stripe webhook endpoint. Prepared for future Stripe integration.
 *
 * - This route is PUBLIC (no JWT) so Stripe can POST events.
 * - When implementing Stripe: verify signature using raw body and
 *   STRIPE_WEBHOOK_SECRET; then dispatch events (invoice.paid, customer.subscription.*, etc.)
 *   to update local subscriptions, invoices, and payment methods.
 * - Raw body: Stripe signature verification requires the raw request body.
 *   Configure NestJS to provide raw body for this route (e.g. bodyParser raw for
 *   /webhooks/stripe) when implementing.
 */
@Controller('webhooks')
export class WebhooksController {
  @Public()
  @Post('stripe')
  stripeWebhook(@Req() req: Request): { received: boolean } {
    void req;
    // Placeholder: no Stripe logic yet. Return 200 so Stripe does not retry.
    // When implementing: use raw body (e.g. from middleware) for
    // stripe.webhooks.constructEvent(payload, signature, secret).
    return { received: true };
  }
}

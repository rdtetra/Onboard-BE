import type { OverviewConversationDay } from './bots-overview';

/** GET /admin/overview response shape (super admin only). Platform-wide counts, no org filter. Tenants = users. */
export type SuperAdminOverview = {
  /** Total users (all, regardless of status). */
  totalTenants: number;
  /** Users with status ACTIVE. */
  activeTenants: number;
  totalBots: number;
  totalConversations: number;
  totalKbSources: number;
  conversationsOverTime?: OverviewConversationDay[];
};

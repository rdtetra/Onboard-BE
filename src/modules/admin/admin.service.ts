import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { BotsService } from '../bots/bots.service';
import { ConversationsService } from '../conversations/conversations.service';
import { SourcesService } from '../knowledge-base/sources.service';
import { RoleName } from '../../types/roles';
import type { RequestContext } from '../../types/request';
import type { SuperAdminOverview } from '../../types/super-admin-overview';

@Injectable()
export class AdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly botsService: BotsService,
    private readonly conversationsService: ConversationsService,
    private readonly sourcesService: SourcesService,
  ) {}

  /**
   * Platform-wide overview: total tenants, active tenants, bots, conversations, KB sources.
   * Super admin only; no org filtering.
   */
  async getOverview(ctx: RequestContext): Promise<SuperAdminOverview> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    if (ctx.user.roleName !== RoleName.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin access required');
    }

    const [
      totalTenants,
      activeTenants,
      totalBots,
      totalConversations,
      totalKbSources,
    ] = await Promise.all([
      this.usersService.countAll(),
      this.usersService.getActiveTenantsCount(),
      this.botsService.countAll(ctx),
      this.conversationsService.countAll(ctx),
      this.sourcesService.countAll(ctx),
    ]);

    return {
      totalTenants,
      activeTenants,
      totalBots,
      totalConversations,
      totalKbSources,
    };
  }
}

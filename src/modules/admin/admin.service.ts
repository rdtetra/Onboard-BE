import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { BotService } from '../bot/bot.service';
import { ConversationService } from '../conversation/conversation.service';
import { SourcesService } from '../knowledge-base/sources.service';
import { RoleName } from '../../types/roles';
import type { RequestContext } from '../../types/request';
import type { SuperAdminOverview } from '../../types/super-admin-overview';

@Injectable()
export class AdminService {
  constructor(
    private readonly usersService: UserService,
    private readonly botsService: BotService,
    private readonly conversationsService: ConversationService,
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

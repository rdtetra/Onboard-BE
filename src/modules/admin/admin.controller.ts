import { Controller, Get } from '@nestjs/common';
import { AdminService } from './admin.service';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import type { RequestContext as RequestContextType } from '../../types/request';
import type { SuperAdminOverview } from '../../types/super-admin-overview';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  getOverview(
    @RequestContext() ctx: RequestContextType,
  ): Promise<SuperAdminOverview> {
    return this.adminService.getOverview(ctx);
  }
}

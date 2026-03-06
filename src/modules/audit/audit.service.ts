import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { AuditLog } from '../../common/entities/audit-log.entity';
import type { RequestContext } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import {
  parsePagination,
  toPaginatedResult,
} from '../../utils/pagination.util';
import { RoleName } from '../../types/roles';

export interface AuditLogPayload {
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(ctx: RequestContext, payload: AuditLogPayload): Promise<AuditLog> {
    const organizationId = ctx.user?.organizationId ?? null;
    const userId = ctx.user?.userId ?? null;
    const entry = this.auditLogRepository.create({
      organizationId,
      userId,
      action: payload.action,
      resource: payload.resource,
      resourceId: payload.resourceId ?? null,
      details: payload.details ?? null,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    });
    return this.auditLogRepository.save(entry);
  }

  async findAll(
    ctx: RequestContext,
    pagination?: { page?: string; limit?: string },
    filters?: {
      action?: string;
      resource?: string;
      userId?: string;
      organizationId?: string;
    },
  ): Promise<PaginatedResult<AuditLog>> {
    const { page, limit, skip } = parsePagination(pagination ?? {});
    const isSuperAdmin = ctx.user?.roleName === RoleName.SUPER_ADMIN;
    const userOrgId = ctx.user?.organizationId ?? null;

    if (!isSuperAdmin && !userOrgId) {
      return toPaginatedResult([], 0, page, limit);
    }

    const where: FindOptionsWhere<AuditLog> = {};
    if (isSuperAdmin && filters?.organizationId?.trim()) {
      where.organizationId = filters.organizationId.trim();
    } else if (!isSuperAdmin && userOrgId) {
      where.organizationId = userOrgId;
    }
    if (filters?.action?.trim()) where.action = filters.action.trim();
    if (filters?.resource?.trim()) where.resource = filters.resource.trim();
    if (filters?.userId?.trim()) where.userId = filters.userId.trim();

    const [data, total] = await this.auditLogRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });
    return toPaginatedResult(data, total, page, limit);
  }
}

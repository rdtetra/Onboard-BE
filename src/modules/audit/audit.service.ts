import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { AuditLog } from '../../common/entities/audit-log.entity';
import type { RequestContext } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import { parsePagination, toPaginatedResult } from '../../utils/pagination.util';

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

  async log(
    ctx: RequestContext,
    payload: AuditLogPayload,
  ): Promise<AuditLog> {
    const tenantId = ctx.user?.userId ?? null;
    const userId = ctx.user?.userId ?? null;
    const entry = this.auditLogRepository.create({
      tenantId,
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
    filters?: { action?: string; resource?: string; userId?: string },
  ): Promise<PaginatedResult<AuditLog>> {
    const tenantId = ctx.user?.userId;
    const { page, limit, skip } = parsePagination(pagination ?? {});
    if (!tenantId) {
      return toPaginatedResult([], 0, page, limit);
    }
    const where: FindOptionsWhere<AuditLog> = { tenantId };
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

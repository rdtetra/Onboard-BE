import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../../common/entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import type { RequestContext } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import {
  parsePagination,
  toPaginatedResult,
} from '../../utils/pagination.util';
import { RoleName } from '../../common/enums/roles.enum';
import { InvoiceStatus } from '../../common/enums/invoice-status.enum';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async create(ctx: RequestContext, dto: CreateInvoiceDto): Promise<Invoice> {
    const invoice = this.invoiceRepository.create({
      organizationId: dto.orgId,
      subscriptionId: dto.subscriptionId ?? null,
      status: dto.status,
      amountDue: dto.amountDue,
      amountPaid: dto.amountPaid ?? 0,
      currency: dto.currency ?? 'usd',
      providerInvoiceId: dto.providerInvoiceId ?? null,
      invoicePdfUrl: dto.invoicePdfUrl ?? null,
      periodStart: dto.periodStart ? new Date(dto.periodStart) : null,
      periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : null,
    });
    return this.invoiceRepository.save(invoice);
  }

  async findAll(
    ctx: RequestContext,
    pagination?: { page?: string; limit?: string; status?: string },
    orgId?: string,
  ): Promise<PaginatedResult<Invoice>> {
    if (!ctx.user?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const resolvedOrgId =
      orgId ??
      ctx.user.organizationId ??
      (ctx.user.roleName === RoleName.SUPER_ADMIN ? undefined : null);
    if (resolvedOrgId === null) {
      throw new BadRequestException('Organization context required');
    }
    const { page, limit, skip } = parsePagination(pagination ?? {});
    const where: { organizationId?: string; status?: InvoiceStatus } = {};
    if (resolvedOrgId) {
      where.organizationId = resolvedOrgId;
    }
    if (
      pagination?.status &&
      Object.values(InvoiceStatus).includes(pagination.status as InvoiceStatus)
    ) {
      where.status = pagination.status as InvoiceStatus;
    }
    if (ctx.user.organizationId && orgId && orgId !== ctx.user.organizationId) {
      if (ctx.user.roleName !== RoleName.SUPER_ADMIN) {
        throw new UnauthorizedException(
          'Cannot list invoices for another organization',
        );
      }
    }
    const [data, total] = await this.invoiceRepository.findAndCount({
      where: Object.keys(where).length ? where : undefined,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
      relations: { subscription: { plan: true } },
    });
    return toPaginatedResult(data, total, page, limit);
  }

  async findForCurrentOrg(
    ctx: RequestContext,
    pagination?: { page?: string; limit?: string; status?: string },
  ): Promise<PaginatedResult<Invoice>> {
    return this.findAll(ctx, pagination);
  }

  async findOne(ctx: RequestContext, id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: { organization: true, subscription: { plan: true } },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice with id ${id} not found`);
    }
    if (
      ctx?.user?.organizationId &&
      invoice.organizationId !== ctx.user.organizationId
    ) {
      if (ctx.user.roleName !== RoleName.SUPER_ADMIN) {
        throw new NotFoundException(`Invoice with id ${id} not found`);
      }
    }
    return invoice;
  }

  async update(
    ctx: RequestContext,
    id: string,
    dto: UpdateInvoiceDto,
  ): Promise<Invoice> {
    const invoice = await this.findOne(ctx, id);
    if (dto.subscriptionId !== undefined)
      invoice.subscriptionId = dto.subscriptionId ?? null;
    if (dto.status !== undefined) invoice.status = dto.status;
    if (dto.amountDue !== undefined) invoice.amountDue = dto.amountDue;
    if (dto.amountPaid !== undefined) invoice.amountPaid = dto.amountPaid;
    if (dto.currency !== undefined) invoice.currency = dto.currency;
    if (dto.providerInvoiceId !== undefined)
      invoice.providerInvoiceId = dto.providerInvoiceId ?? null;
    if (dto.invoicePdfUrl !== undefined)
      invoice.invoicePdfUrl = dto.invoicePdfUrl ?? null;
    if (dto.periodStart !== undefined)
      invoice.periodStart = dto.periodStart ? new Date(dto.periodStart) : null;
    if (dto.periodEnd !== undefined)
      invoice.periodEnd = dto.periodEnd ? new Date(dto.periodEnd) : null;
    if (dto.dueDate !== undefined)
      invoice.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.paidAt !== undefined)
      invoice.paidAt = dto.paidAt ? new Date(dto.paidAt) : null;
    return this.invoiceRepository.save(invoice);
  }

  async remove(ctx: RequestContext, id: string): Promise<void> {
    const invoice = await this.findOne(ctx, id);
    await this.invoiceRepository.remove(invoice);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Invoice } from '../../common/entities/invoice.entity';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import { Allow } from '../../common/decorators/allow.decorator';
import { Permission } from '../../types/permissions';
import type { RequestContext as RequestContextType } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';

@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoicesService: InvoiceService) {}

  @Post()
  @Allow(Permission.READ_INVOICE)
  create(
    @RequestContext() ctx: RequestContextType,
    @Body() dto: CreateInvoiceDto,
  ): Promise<Invoice> {
    return this.invoicesService.create(ctx, dto);
  }

  @Get()
  @Allow(Permission.READ_INVOICE)
  findForCurrentOrg(
    @RequestContext() ctx: RequestContextType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ): Promise<PaginatedResult<Invoice>> {
    return this.invoicesService.findForCurrentOrg(ctx, { page, limit, status });
  }

  @Get(':id')
  @Allow(Permission.READ_INVOICE)
  findOne(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<Invoice> {
    return this.invoicesService.findOne(ctx, id);
  }

  @Patch(':id')
  @Allow(Permission.READ_INVOICE)
  update(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ): Promise<Invoice> {
    return this.invoicesService.update(ctx, id, dto);
  }

  @Delete(':id')
  @Allow(Permission.READ_INVOICE)
  remove(
    @RequestContext() ctx: RequestContextType,
    @Param('id') id: string,
  ): Promise<void> {
    return this.invoicesService.remove(ctx, id);
  }
}

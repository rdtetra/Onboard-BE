import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { PaymentMethod } from '../../common/entities/payment-method.entity';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { detectCardBrand } from '../../utils/card-brand.util';
import { parseExpiry } from '../../utils/expiry.util';
import { PaymentProvider } from '../../common/enums/payment-provider.enum';
import { PaymentMethodType } from '../../common/enums/payment-method-type.enum';
import type { RequestContext } from '../../types/request';
import { RoleName } from '../../common/enums/roles.enum';

@Injectable()
export class PaymentMethodService {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
  ) {}

  async create(
    ctx: RequestContext,
    dto: CreatePaymentMethodDto,
  ): Promise<PaymentMethod> {
    const orgId = ctx.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException('Organization context required');
    }
    let last4 = dto.last4 ?? null;
    let brand =
      dto.brand ?? (dto.cardPrefix ? detectCardBrand(dto.cardPrefix) : null);
    if (dto.cardNumber) {
      const digits = dto.cardNumber.replace(/\D/g, '');
      if (digits.length >= 4) last4 = digits.slice(-4);
      brand = detectCardBrand(digits) || brand;
    }
    let expMonth = dto.expMonth ?? null;
    let expYear = dto.expYear ?? null;
    if (dto.expiry) {
      const parsed = parseExpiry(dto.expiry);
      if (parsed) {
        expMonth = parsed.month;
        expYear = parsed.year;
      }
    }
    const existingCount = await this.paymentMethodRepository.count({
      where: { organizationId: orgId },
    });
    const isDefault = existingCount === 0 ? true : (dto.isDefault ?? false);
    const method = this.paymentMethodRepository.create({
      organizationId: orgId,
      provider: dto.provider ?? PaymentProvider.MANUAL,
      providerPaymentMethodId: dto.providerPaymentMethodId ?? null,
      type: dto.type ?? PaymentMethodType.CARD,
      last4,
      nameOnCard: dto.nameOnCard?.trim() ?? null,
      brand,
      expMonth,
      expYear,
      isDefault,
    });
    const saved = await this.paymentMethodRepository.save(method);
    if (isDefault) {
      await this.paymentMethodRepository.update(
        { organizationId: orgId, id: Not(saved.id) },
        { isDefault: false },
      );
    }
    return saved;
  }

  async findAllForOrganization(
    orgId: string,
    ctx?: RequestContext,
  ): Promise<PaymentMethod[]> {
    if (ctx?.user?.organizationId && ctx.user.organizationId !== orgId) {
      if (ctx.user.roleName !== RoleName.SUPER_ADMIN) {
        throw new UnauthorizedException(
          'Cannot list payment methods for another organization',
        );
      }
    }
    return this.paymentMethodRepository.find({
      where: { organizationId: orgId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async findForCurrentOrg(ctx: RequestContext): Promise<PaymentMethod[]> {
    if (!ctx.user?.organizationId) {
      throw new BadRequestException('Organization context required');
    }
    return this.findAllForOrganization(ctx.user.organizationId, ctx);
  }

  async findOne(id: string, ctx?: RequestContext): Promise<PaymentMethod> {
    const method = await this.paymentMethodRepository.findOne({
      where: { id },
      relations: ['organization'],
    });
    if (!method) {
      throw new NotFoundException(`Payment method with id ${id} not found`);
    }
    if (
      ctx?.user?.organizationId &&
      method.organizationId !== ctx.user.organizationId
    ) {
      if (ctx.user.roleName !== RoleName.SUPER_ADMIN) {
        throw new NotFoundException(`Payment method with id ${id} not found`);
      }
    }
    return method;
  }

  async update(
    id: string,
    dto: UpdatePaymentMethodDto,
    ctx?: RequestContext,
  ): Promise<PaymentMethod> {
    const method = await this.findOne(id, ctx);
    if (dto.providerPaymentMethodId !== undefined)
      method.providerPaymentMethodId = dto.providerPaymentMethodId ?? null;
    if (dto.type !== undefined) method.type = dto.type;
    if (dto.last4 !== undefined) method.last4 = dto.last4 ?? null;
    if (dto.nameOnCard !== undefined)
      method.nameOnCard = dto.nameOnCard?.trim() ?? null;
    if (dto.cardPrefix !== undefined)
      method.brand = dto.cardPrefix ? detectCardBrand(dto.cardPrefix) : null;
    else if (dto.brand !== undefined) method.brand = dto.brand ?? null;
    if (dto.expiry) {
      const parsed = parseExpiry(dto.expiry);
      if (parsed) {
        method.expMonth = parsed.month;
        method.expYear = parsed.year;
      }
    }
    if (dto.expMonth !== undefined) method.expMonth = dto.expMonth ?? null;
    if (dto.expYear !== undefined) method.expYear = dto.expYear ?? null;
    if (dto.isDefault !== undefined) method.isDefault = dto.isDefault;
    const saved = await this.paymentMethodRepository.save(method);
    if (saved.isDefault) {
      await this.paymentMethodRepository.update(
        { organizationId: method.organizationId, id: Not(saved.id) },
        { isDefault: false },
      );
    }
    return saved;
  }

  async setAsDefault(id: string, ctx?: RequestContext): Promise<PaymentMethod> {
    const method = await this.findOne(id, ctx);
    method.isDefault = true;
    const saved = await this.paymentMethodRepository.save(method);
    await this.paymentMethodRepository.update(
      { organizationId: method.organizationId, id: Not(saved.id) },
      { isDefault: false },
    );
    return saved;
  }

  async remove(id: string, ctx?: RequestContext): Promise<void> {
    const method = await this.findOne(id, ctx);
    await this.paymentMethodRepository.remove(method);
  }
}

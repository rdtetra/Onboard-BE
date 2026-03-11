import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Conversation } from '../../common/entities/conversation.entity';
import { BotsService } from '../bots/bots.service';
import type { RequestContext } from '../../types/request';
import type { PaginatedResult } from '../../types/pagination';
import { parsePagination, toPaginatedResult } from '../../utils/pagination.util';
import { ConversationStatus } from '../../types/conversation';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    private readonly botsService: BotsService,
  ) {}

  async create(
    ctx: RequestContext,
    botId: string,
    visitorId: string,
  ): Promise<Conversation> {
    await this.botsService.findOne(ctx, botId);
    const conversation = this.conversationRepository.create({
      botId,
      visitorId,
      status: ConversationStatus.OPEN,
      startedAt: new Date(),
      endedAt: null,
    });
    return this.conversationRepository.save(conversation);
  }

  /**
   * List conversations. If botId is provided, scope to that bot (and verify access).
   * If botId is omitted, return conversations from all bots the user can access (org-scoped).
   */
  async findAll(
    ctx: RequestContext,
    pagination?: { page?: string; limit?: string },
    filters?: {
      botId?: string;
      visitorId?: string;
      status?: ConversationStatus;
      search?: string;
      date?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ): Promise<PaginatedResult<Conversation>> {
    const f = filters ?? {};
    let botIds: string[];
    if (f.botId != null) {
      await this.botsService.findOne(ctx, f.botId);
      botIds = [f.botId];
    } else {
      const botOptions = await this.botsService.findOptions(ctx);
      botIds = botOptions.map((o) => o.id);
      if (botIds.length === 0) {
        const { page, limit } = parsePagination(pagination ?? {});
        return toPaginatedResult([], 0, page, limit);
      }
    }

    const { page, limit, skip } = parsePagination(pagination ?? {});
    const searchTerm = f.search?.trim() ?? '';
    const hasSearch = searchTerm !== '';

    const qb = this.conversationRepository
      .createQueryBuilder('conversation')
      .where('conversation.botId IN (:...botIds)', { botIds });

    if (hasSearch) {
      qb.innerJoin('conversation.messages', 'message')
        .andWhere('message.content ILIKE :search', {
          search: `%${searchTerm}%`,
        })
        .distinct(true);
    }

    this.applyListFilters(qb, f);

    const countFilters = { ...f, botIds };
    const total = hasSearch
      ? await this.getSearchCount(countFilters, searchTerm)
      : await qb.getCount();

    const data = await qb
      .orderBy('conversation.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return toPaginatedResult(data, total, page, limit);
  }

  private applyListFilters(
    qb: SelectQueryBuilder<Conversation>,
    filters: {
      visitorId?: string;
      status?: ConversationStatus;
      date?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ): void {
    if (filters.visitorId != null) {
      qb.andWhere('conversation.visitorId = :visitorId', {
        visitorId: filters.visitorId,
      });
    }

    if (filters.status != null) {
      qb.andWhere('conversation.status = :status', { status: filters.status });
    }

    // Explicit UTC range (timezone-safe): prefer over single date
    if (filters.dateFrom != null) {
      qb.andWhere('conversation.startedAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }
    if (filters.dateTo != null) {
      qb.andWhere('conversation.startedAt <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }
    // Single date: interpreted as that calendar day in UTC (can cause timezone confusion)
    else if (filters.date != null) {
      const datePart = filters.date.trim().slice(0, 10);
      const dayStart = `${datePart}T00:00:00.000Z`;
      const d = new Date(dayStart);
      d.setUTCDate(d.getUTCDate() + 1);
      const dayEnd = d.toISOString();
      qb.andWhere('conversation.startedAt >= :dateStart', {
        dateStart: dayStart,
      });
      qb.andWhere('conversation.startedAt < :dateEnd', { dateEnd: dayEnd });
    }
  }

  private async getSearchCount(
    filters: {
      botId?: string;
      botIds?: string[];
      visitorId?: string;
      status?: ConversationStatus;
      date?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    searchTerm: string,
  ): Promise<number> {
    const countQb = this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin('conversation.messages', 'message')
      .select('COUNT(DISTINCT conversation.id)', 'count')
      .andWhere('message.content ILIKE :search', {
        search: `%${searchTerm}%`,
      });

    if (filters.botIds != null && filters.botIds.length > 0) {
      countQb.andWhere('conversation.botId IN (:...botIds)', {
        botIds: filters.botIds,
      });
    } else if (filters.botId != null) {
      countQb.andWhere('conversation.botId = :botId', {
        botId: filters.botId,
      });
    }

    this.applyListFilters(countQb, filters);

    const raw = await countQb.getRawOne<{ count: string }>();
    return parseInt(raw?.count ?? '0', 10);
  }

  async findOne(
    ctx: RequestContext,
    id: string,
    options?: { relations?: string[] },
  ): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
      relations: options?.relations ?? ['messages', 'bot'],
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }
    await this.botsService.findOne(ctx, conversation.botId);
    return conversation;
  }

}

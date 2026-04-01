import { Controller, Get, Query } from '@nestjs/common';
import { OpenAiService } from './openai.service';
import { RequestContext } from '../../common/decorators/request-context.decorator';
import { Allow } from '../../common/decorators/allow.decorator';
import { Permission } from '../../types/permissions';
import type { RequestContext as RequestContextType } from '../../types/request';
import type {
  OpenAiCompletionsUsageResult,
  OpenAiEmbeddingsUsageResult,
  OpenAiUsagePage,
} from '../../types/openai-usage';

@Controller('openai')
export class OpenAiController {
  constructor(private readonly openAiService: OpenAiService) {}

  @Get('usage/completions')
  @Allow(Permission.READ_BOT)
  getCompletionsUsage(
    @RequestContext() ctx: RequestContextType,
    @Query('start_time') startTime?: string,
    @Query('end_time') endTime?: string,
    @Query('page') page?: string,
  ): Promise<OpenAiUsagePage<OpenAiCompletionsUsageResult>> {
    return this.openAiService.getCompletionsUsage(ctx, {
      startTime,
      endTime,
      page,
    });
  }

  @Get('usage/embeddings')
  @Allow(Permission.READ_BOT)
  getEmbeddingsUsage(
    @RequestContext() ctx: RequestContextType,
    @Query('start_time') startTime?: string,
    @Query('end_time') endTime?: string,
    @Query('page') page?: string,
  ): Promise<OpenAiUsagePage<OpenAiEmbeddingsUsageResult>> {
    return this.openAiService.getEmbeddingsUsage(ctx, {
      startTime,
      endTime,
      page,
    });
  }
}

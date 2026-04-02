import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import * as ejs from 'ejs';
import type { RenderOptions } from '../../types/email';

@Injectable()
export class EmailTemplatesService {
  private readonly basePath: string;

  constructor(private readonly configService: ConfigService) {
    const dir = this.configService.get<string>('TEMPLATES_DIR', 'templates');
    this.basePath = resolve(process.cwd(), dir);
  }

  /**
   * Render an EJS template string with the given data.
   */
  render(
    template: string,
    data: Record<string, unknown> = {},
    opts?: RenderOptions,
  ): string {
    return ejs.render(template, data, opts?.options);
  }

  /**
   * Render an EJS file under the templates directory. Path is relative to TEMPLATES_DIR (default: project root / templates).
   * Example: renderFile('emails/welcome.ejs', { name: 'Jane' })
   */
  async renderFile(
    relativePath: string,
    data: Record<string, unknown> = {},
    opts?: RenderOptions,
  ): Promise<string> {
    const filePath = resolve(this.basePath, relativePath);
    return ejs.renderFile(filePath, data, opts?.options);
  }
}

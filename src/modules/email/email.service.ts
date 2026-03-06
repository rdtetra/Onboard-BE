import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

@Injectable()
export class EmailService {
  private readonly apiBaseUrl: string;
  private readonly defaultDomain: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiBaseUrl = this.configService
      .get<string>('MAILGUN_API_BASE_URL', '')
      .replace(/\/$/, '');
    this.defaultDomain = this.configService.get<string>(
      'MAILGUN_DEFAULT_SENDING_DOMAIN',
      '',
    );
    this.apiKey = this.configService.get<string>('MAILGUN_PRIVATE_API_KEY', '');
  }

  /**
   * Send an email via Mailgun. At least one of `text` or `html` must be provided.
   */
  async sendMail(options: SendMailOptions): Promise<{ id: string }> {
    const { to, subject, text, html, from, cc, bcc } = options;

    if (!this.apiBaseUrl || !this.defaultDomain || !this.apiKey) {
      throw new Error(
        'Mailgun is not configured. Set MAILGUN_API_BASE_URL, MAILGUN_DEFAULT_SENDING_DOMAIN, and MAILGUN_PRIVATE_API_KEY.',
      );
    }

    if (!text && !html) {
      throw new Error('At least one of `text` or `html` is required.');
    }

    const toList = Array.isArray(to) ? to : [to];
    const fromAddr = from ?? `Onboard <noreply@${this.defaultDomain}>`;

    const form = new FormData();
    form.append('from', fromAddr);
    toList.forEach((addr) => form.append('to', addr));
    form.append('subject', subject);

    if (text) {
      form.append('text', text);
    }
    if (html) {
      form.append('html', html);
    }
    if (cc) {
      const ccList = Array.isArray(cc) ? cc : [cc];
      ccList.forEach((addr) => form.append('cc', addr));
    }
    if (bcc) {
      const bccList = Array.isArray(bcc) ? bcc : [bcc];
      bccList.forEach((addr) => form.append('bcc', addr));
    }

    const url = `${this.apiBaseUrl}/${this.defaultDomain}/messages`;
    const auth = Buffer.from(`api:${this.apiKey}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
      },
      body: form,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Mailgun API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as { id?: string };

    return { id: data.id ?? '' };
  }
}

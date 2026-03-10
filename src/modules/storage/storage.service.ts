import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const WIDGET_LOGO_MAX_BYTES = 1024 * 1024; // 1 MB
const ALLOWED_LOGO_MIME = ['image/png', 'image/jpeg', 'image/jpg'] as const;
const LOGO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
};

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.bucket =
      this.configService.get<string>('AWS_STORAGE_BUCKET_NAME') || '';

    this.s3 = new S3Client({
      region: this.region,
      forcePathStyle: this.bucket.includes('.'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  /**
   * Upload widget logo to S3. Key: widgets/{widgetId}/logo.{ext}.
   * Allowed: PNG, JPEG, max 1 MB. Returns the public object URL.
   */
  async uploadWidgetLogo(
    widgetId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    if (buffer.length > WIDGET_LOGO_MAX_BYTES) {
      throw new Error(`Logo must be at most 1 MB (got ${(buffer.length / 1024).toFixed(1)} KB)`);
    }
    const normalized = mimeType.toLowerCase();
    if (!ALLOWED_LOGO_MIME.includes(normalized as (typeof ALLOWED_LOGO_MIME)[number])) {
      throw new Error('Logo must be PNG or JPEG');
    }
    const ext = LOGO_EXT[normalized] ?? 'png';
    const key = `widgets/${widgetId}/logo.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    return this.getPublicUrl(key);
  }

  private getPublicUrl(key: string): string {
    const baseUrl = this.configService.get<string>('ASSETS_PUBLIC_BASE_URL');
    if (baseUrl) {
      return `${baseUrl.replace(/\/$/, '')}/${key}`;
    }
    if (this.bucket.includes('.')) {
      return `https://s3.${this.region}.amazonaws.com/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}

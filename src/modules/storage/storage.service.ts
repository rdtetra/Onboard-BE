import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const WIDGET_LOGO_MAX_BYTES = 1024 * 1024; // 1 MB
const PROFILE_PICTURE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const KB_SOURCE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_LOGO_MIME = ['image/png', 'image/jpeg', 'image/jpg'] as const;
const ALLOWED_KB_SOURCE_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;
const KB_SOURCE_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};
const LOGO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
};

export const KB_SOURCE_S3_PREFIX = 'kb-sources/';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    const defaultRegion = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.region =
      this.configService.get<string>('AWS_ASSETS_BUCKET_REGION') || defaultRegion;
    this.bucket =
      this.configService.get<string>('AWS_ASSETS_STORAGE_BUCKET_NAME') || '';

    this.s3 = new S3Client({
      region: this.region,
      forcePathStyle: this.bucket.includes('.'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
  }

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
        ACL: 'public-read',
      }),
    );

    return this.getPublicUrl(key);
  }

  async uploadUserProfilePicture(
    userId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    if (buffer.length > PROFILE_PICTURE_MAX_BYTES) {
      throw new Error(
        `Profile picture must be at most 5 MB (got ${(buffer.length / 1024 / 1024).toFixed(2)} MB)`,
      );
    }
    const normalized = mimeType.toLowerCase();
    if (
      !ALLOWED_LOGO_MIME.includes(normalized as (typeof ALLOWED_LOGO_MIME)[number])
    ) {
      throw new Error('Profile picture must be PNG or JPEG');
    }
    const ext = LOGO_EXT[normalized] ?? 'png';
    const key = `users/${userId}/profile.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ACL: 'public-read',
      }),
    );

    return this.getPublicUrl(key);
  }

  async uploadKbSourceFile(
    organizationId: string,
    fileId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    if (buffer.length > KB_SOURCE_MAX_BYTES) {
      throw new Error(
        `KB source file must be at most 5 MB (got ${(buffer.length / 1024 / 1024).toFixed(2)} MB)`,
      );
    }
    const normalized = mimeType.toLowerCase();
    if (
      !ALLOWED_KB_SOURCE_MIME.includes(
        normalized as (typeof ALLOWED_KB_SOURCE_MIME)[number],
      )
    ) {
      throw new Error('KB source file must be PDF or DOCX');
    }
    const ext = KB_SOURCE_EXT[normalized] ?? 'pdf';
    const key = `${KB_SOURCE_S3_PREFIX}${organizationId}/${fileId}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ACL: 'public-read',
      }),
    );

    return key;
  }

  async getKbSourceFileStream(
    key: string,
  ): Promise<{ stream: Readable; contentLength?: number }> {
    const response = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    const body = response.Body;
    if (!body) {
      throw new Error('Empty response body from S3');
    }
    return {
      stream: body as Readable,
      contentLength: response.ContentLength,
    };
  }

  isKbSourceS3Key(sourceValue: string): boolean {
    return sourceValue?.startsWith(KB_SOURCE_S3_PREFIX) === true;
  }

  getPublicUrl(key: string): string {
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

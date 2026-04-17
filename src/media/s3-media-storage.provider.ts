import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { basename, extname } from 'path';
import {
  MediaStorageProvider,
  StoredMediaFile,
  StorageFileInput,
} from './storage.provider';

type AwsS3Module = {
  S3Client: new (input: unknown) => {
    send(command: unknown): Promise<void>;
  };
  PutObjectCommand: new (input: unknown) => unknown;
  DeleteObjectCommand: new (input: unknown) => unknown;
};

@Injectable()
export class S3MediaStorageProvider implements MediaStorageProvider {
  constructor(private readonly configService: ConfigService) {}

  async storeFile(input: StorageFileInput): Promise<StoredMediaFile> {
    const bucket = this.readRequired('S3_BUCKET');
    const region = this.readRequired('S3_REGION');
    const prefix =
      (this.configService.get<string>('S3_MEDIA_PREFIX', 'media') || 'media')
        .replace(/^\/+|\/+$/g, '');
    const extension = this.inferExt(input.mimeType);
    const safeBaseName = this.toSafeBaseName(input.originalName);
    const key = `${prefix}/${randomUUID()}${extension}`;

    const client = this.createClient(region);
    const { PutObjectCommand } = this.loadAwsSdk();

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.mimeType,
      }),
    );

    return {
      provider: 's3',
      key,
      url: this.buildPublicUrl(bucket, region, key),
      fileName: `${safeBaseName}${extension}`,
      mimeType: input.mimeType,
      sizeBytes: String(input.buffer.byteLength),
    };
  }

  async deleteFile(key: string): Promise<void> {
    if (!key) {
      return;
    }

    const bucket = this.readRequired('S3_BUCKET');
    const region = this.readRequired('S3_REGION');
    const client = this.createClient(region);
    const { DeleteObjectCommand } = this.loadAwsSdk();

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  private loadAwsSdk(): AwsS3Module {
    try {
      const moduleName = '@aws-sdk/client-s3';
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const loaded: unknown = require(moduleName);
      return loaded as AwsS3Module;
    } catch {
      throw new Error(
        'S3 driver requires @aws-sdk/client-s3. Install dependencies before enabling MEDIA_STORAGE_DRIVER=s3.',
      );
    }
  }

  private createClient(region: string): {
    send(command: unknown): Promise<void>;
  } {
    const { S3Client } = this.loadAwsSdk();

    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID', '');
    const secretAccessKey =
      this.configService.get<string>('S3_SECRET_ACCESS_KEY', '');
    const sessionToken = this.configService.get<string>('S3_SESSION_TOKEN', '');

    const credentials =
      accessKeyId && secretAccessKey
        ? {
            accessKeyId,
            secretAccessKey,
            ...(sessionToken ? { sessionToken } : {}),
          }
        : undefined;

    return new S3Client({
      region,
      ...(credentials ? { credentials } : {}),
    });
  }

  private buildPublicUrl(bucket: string, region: string, key: string): string {
    const customBase = this.configService
      .get<string>('MEDIA_PUBLIC_BASE_URL', '')
      .trim();

    if (customBase) {
      return `${customBase.replace(/\/$/, '')}/${key}`;
    }

    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  private readRequired(name: string): string {
    const value = this.configService.get<string>(name, '').trim();
    if (!value) {
      throw new Error(`${name} is required when MEDIA_STORAGE_DRIVER=s3.`);
    }
    return value;
  }

  private inferExt(mimeType: string): string {
    if (mimeType === 'image/png') return '.png';
    if (mimeType === 'image/jpeg') return '.jpg';
    if (mimeType === 'image/gif') return '.gif';
    if (mimeType === 'image/webp') return '.webp';
    return '.bin';
  }

  private toSafeBaseName(originalName: string): string {
    const withoutExt = basename(originalName, extname(originalName));
    const normalized = withoutExt
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-_]+|[-_]+$/g, '');
    return (normalized || 'media-file').slice(0, 80);
  }
}


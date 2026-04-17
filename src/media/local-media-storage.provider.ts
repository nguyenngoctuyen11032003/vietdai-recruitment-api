import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, rm, writeFile } from 'fs/promises';
import { basename, extname, join } from 'path';
import {
  MediaStorageProvider,
  StoredMediaFile,
  StorageFileInput,
} from './storage.provider';

@Injectable()
export class LocalMediaStorageProvider implements MediaStorageProvider {
  constructor(private readonly configService: ConfigService) {}

  async storeFile(input: StorageFileInput): Promise<StoredMediaFile> {
    const uploadDir = this.configService.get<string>(
      'MEDIA_UPLOAD_DIR',
      'uploads',
    );
    const publicBaseUrl = this.configService.get<string>(
      'MEDIA_PUBLIC_BASE_URL',
      'http://localhost:3001/uploads',
    );

    await mkdir(uploadDir, { recursive: true });

    const extension = this.inferExt(input.mimeType);
    const safeBaseName = this.toSafeBaseName(input.originalName);
    const key = `${randomUUID()}${extension}`;
    const fileName = `${safeBaseName}${extension}`;

    await writeFile(join(uploadDir, key), input.buffer);

    return {
      provider: 'local',
      key,
      url: `${publicBaseUrl.replace(/\/$/, '')}/${key}`,
      fileName,
      mimeType: input.mimeType || 'application/octet-stream',
      sizeBytes: String(input.buffer.byteLength),
    };
  }

  async deleteFile(key: string): Promise<void> {
    if (!key) {
      return;
    }

    const uploadDir = this.configService.get<string>(
      'MEDIA_UPLOAD_DIR',
      'uploads',
    );
    const filePath = join(uploadDir, key);
    await rm(filePath, { force: true });
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

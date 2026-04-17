import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, rm, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import {
  MediaStorageProvider,
  StoredMediaFile,
  StorageFileInput,
} from './storage.provider';

@Injectable()
export class LocalMediaStorageProvider implements MediaStorageProvider {
  constructor(private readonly configService: ConfigService) {}

  async storeFile(input: StorageFileInput): Promise<StoredMediaFile> {
    const uploadDir = this.configService.get<string>('MEDIA_UPLOAD_DIR', 'uploads');
    const publicBaseUrl = this.configService.get<string>(
      'MEDIA_PUBLIC_BASE_URL',
      'http://localhost:3001/uploads',
    );

    await mkdir(uploadDir, { recursive: true });

    const safeFileName = input.originalName
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '-')
      .replace(/-+/g, '-');
    const extension = extname(safeFileName) || this.inferExt(input.mimeType);
    const key = `${Date.now()}-${randomUUID()}${extension}`;

    await writeFile(join(uploadDir, key), input.buffer);

    return {
      provider: 'local',
      key,
      url: `${publicBaseUrl.replace(/\/$/, '')}/${key}`,
      fileName: safeFileName || key,
      mimeType: input.mimeType || 'application/octet-stream',
      sizeBytes: String(input.buffer.byteLength),
    };
  }

  async deleteFile(key: string): Promise<void> {
    if (!key) {
      return;
    }

    const uploadDir = this.configService.get<string>('MEDIA_UPLOAD_DIR', 'uploads');
    const filePath = join(uploadDir, key);
    await rm(filePath, { force: true });
  }

  private inferExt(mimeType: string): string {
    if (!mimeType) {
      return '';
    }

    if (mimeType.includes('png')) return '.png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return '.jpg';
    if (mimeType.includes('gif')) return '.gif';
    if (mimeType.includes('webp')) return '.webp';
    if (mimeType.includes('svg')) return '.svg';
    return '';
  }
}


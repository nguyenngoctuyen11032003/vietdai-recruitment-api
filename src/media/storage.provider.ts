export const MEDIA_STORAGE_PROVIDER = 'MEDIA_STORAGE_PROVIDER';

export type StorageFileInput = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
};

export type StoredMediaFile = {
  provider: string;
  key: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: string;
};

export interface MediaStorageProvider {
  storeFile(input: StorageFileInput): Promise<StoredMediaFile>;
  deleteFile(key: string): Promise<void>;
}

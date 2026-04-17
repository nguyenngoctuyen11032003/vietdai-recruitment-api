import { BadRequestException } from '@nestjs/common';

export type UploadLimits = {
  maxBytes: number;
  maxWidth: number;
  maxHeight: number;
  maxMegapixels: number;
};

export type ValidatedImageMeta = {
  mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  extension: '.png' | '.jpg' | '.gif' | '.webp';
  width: number;
  height: number;
};

const MIME_TO_EXT: Record<ValidatedImageMeta['mimeType'], ValidatedImageMeta['extension']> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const ALLOWED_MIME_TYPES = new Set<ValidatedImageMeta['mimeType']>([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

export function validateImageUpload(
  file: {
    buffer: Buffer;
    mimetype: string;
    size: number;
  },
  limits: UploadLimits,
): ValidatedImageMeta {
  if (!file.buffer || file.buffer.length === 0) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Uploaded file is empty.',
    });
  }

  if (file.size > limits.maxBytes) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: `File exceeds maximum size (${Math.floor(limits.maxBytes / (1024 * 1024))}MB).`,
    });
  }

  const detected = detectMimeType(file.buffer);

  if (!detected || !ALLOWED_MIME_TYPES.has(detected)) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Unsupported file type.',
    });
  }

  if (file.mimetype !== detected) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'File content does not match reported MIME type.',
    });
  }

  const dimensions = readImageDimensions(file.buffer, detected);
  const megapixels = (dimensions.width * dimensions.height) / 1_000_000;

  if (dimensions.width > limits.maxWidth || dimensions.height > limits.maxHeight) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: `Image dimensions exceed limit ${limits.maxWidth}x${limits.maxHeight}.`,
    });
  }

  if (megapixels > limits.maxMegapixels) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: `Image exceeds ${limits.maxMegapixels} megapixels.`,
    });
  }

  return {
    mimeType: detected,
    extension: MIME_TO_EXT[detected],
    width: dimensions.width,
    height: dimensions.height,
  };
}

function detectMimeType(buffer: Buffer): ValidatedImageMeta['mimeType'] | null {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 6 &&
    buffer.toString('ascii', 0, 3) === 'GIF' &&
    (buffer.toString('ascii', 3, 6) === '87a' ||
      buffer.toString('ascii', 3, 6) === '89a')
  ) {
    return 'image/gif';
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

function readImageDimensions(
  buffer: Buffer,
  mimeType: ValidatedImageMeta['mimeType'],
): { width: number; height: number } {
  if (mimeType === 'image/png') {
    if (buffer.length < 24) {
      throw invalidDimensionError();
    }

    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if (mimeType === 'image/gif') {
    if (buffer.length < 10) {
      throw invalidDimensionError();
    }

    return {
      width: buffer.readUInt16LE(6),
      height: buffer.readUInt16LE(8),
    };
  }

  if (mimeType === 'image/jpeg') {
    let offset = 2;

    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = buffer[offset + 1];
      const isStartOfFrame =
        marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

      if (isStartOfFrame) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height };
      }

      const segmentLength = buffer.readUInt16BE(offset + 2);
      if (!segmentLength || Number.isNaN(segmentLength)) {
        break;
      }
      offset += 2 + segmentLength;
    }

    throw invalidDimensionError();
  }

  // WEBP dimension parsing (VP8X, VP8, VP8L)
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;

    if (chunkType === 'VP8X' && chunkDataStart + 10 <= buffer.length) {
      const width =
        1 +
        (buffer[chunkDataStart + 4] |
          (buffer[chunkDataStart + 5] << 8) |
          (buffer[chunkDataStart + 6] << 16));
      const height =
        1 +
        (buffer[chunkDataStart + 7] |
          (buffer[chunkDataStart + 8] << 8) |
          (buffer[chunkDataStart + 9] << 16));
      return { width, height };
    }

    if (chunkType === 'VP8 ' && chunkDataStart + 10 <= buffer.length) {
      const width = buffer.readUInt16LE(chunkDataStart + 6) & 0x3fff;
      const height = buffer.readUInt16LE(chunkDataStart + 8) & 0x3fff;
      return { width, height };
    }

    if (chunkType === 'VP8L' && chunkDataStart + 5 <= buffer.length) {
      const b0 = buffer[chunkDataStart + 1];
      const b1 = buffer[chunkDataStart + 2];
      const b2 = buffer[chunkDataStart + 3];
      const b3 = buffer[chunkDataStart + 4];
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      return { width, height };
    }

    offset = chunkDataStart + chunkSize + (chunkSize % 2);
  }

  throw invalidDimensionError();
}

function invalidDimensionError() {
  return new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'Could not determine image dimensions.',
  });
}


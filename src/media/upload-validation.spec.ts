import { validateImageUpload } from './upload-validation';

const limits = {
  maxBytes: 5 * 1024 * 1024,
  maxWidth: 4096,
  maxHeight: 4096,
  maxMegapixels: 16,
};

const makePng = (width: number, height: number) => {
  const buffer = Buffer.alloc(33);
  buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = 0x08;
  buffer[25] = 0x02;
  return buffer;
};

const makeJpeg = (width: number, height: number) => {
  const buffer = Buffer.alloc(43);
  let offset = 0;

  buffer[offset++] = 0xff;
  buffer[offset++] = 0xd8;
  buffer[offset++] = 0xff;
  buffer[offset++] = 0xe0;
  buffer.writeUInt16BE(16, offset);
  offset += 2;
  buffer.write('JFIF\0', offset, 'ascii');
  offset += 5;
  buffer[offset++] = 0x01;
  buffer[offset++] = 0x01;
  buffer[offset++] = 0x01;
  buffer.writeUInt16BE(96, offset);
  offset += 2;
  buffer.writeUInt16BE(96, offset);
  offset += 2;
  buffer[offset++] = 0x00;
  buffer[offset++] = 0x00;

  buffer[offset++] = 0xff;
  buffer[offset++] = 0xc0;
  buffer.writeUInt16BE(17, offset);
  offset += 2;
  buffer[offset++] = 0x08;
  buffer.writeUInt16BE(height, offset);
  offset += 2;
  buffer.writeUInt16BE(width, offset);
  offset += 2;
  buffer[offset++] = 0x03;
  buffer[offset++] = 0x01;
  buffer[offset++] = 0x11;
  buffer[offset++] = 0x00;
  buffer[offset++] = 0x02;
  buffer[offset++] = 0x11;
  buffer[offset++] = 0x01;
  buffer[offset++] = 0x03;
  buffer[offset++] = 0x11;
  buffer[offset++] = 0x01;

  buffer[offset++] = 0xff;
  buffer[offset] = 0xd9;

  return buffer;
};

describe('validateImageUpload', () => {
  it('accepts valid PNG when MIME and magic bytes match', () => {
    const buffer = makePng(1200, 800);

    const result = validateImageUpload(
      {
        buffer,
        mimetype: 'image/png',
        size: buffer.length,
      },
      limits,
    );

    expect(result.mimeType).toBe('image/png');
    expect(result.width).toBe(1200);
    expect(result.height).toBe(800);
  });

  it('rejects when reported MIME differs from magic bytes', () => {
    const buffer = makePng(400, 400);

    expect(() =>
      validateImageUpload(
        {
          buffer,
          mimetype: 'image/jpeg',
          size: buffer.length,
        },
        limits,
      ),
    ).toThrow(/does not match/i);
  });

  it('rejects oversized dimensions', () => {
    const buffer = makeJpeg(6000, 4000);

    expect(() =>
      validateImageUpload(
        {
          buffer,
          mimetype: 'image/jpeg',
          size: buffer.length,
        },
        limits,
      ),
    ).toThrow(/dimensions exceed/i);
  });

  it('rejects unsupported file signatures', () => {
    const buffer = Buffer.from('not-an-image', 'utf8');

    expect(() =>
      validateImageUpload(
        {
          buffer,
          mimetype: 'image/png',
          size: buffer.length,
        },
        limits,
      ),
    ).toThrow(/unsupported file type/i);
  });
});

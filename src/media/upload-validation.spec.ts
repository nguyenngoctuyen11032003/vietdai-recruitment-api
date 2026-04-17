import { validateImageUpload } from './upload-validation';

const limits = {
  maxBytes: 5 * 1024 * 1024,
  maxWidth: 4096,
  maxHeight: 4096,
  maxMegapixels: 16,
};

const makePng = (width: number, height: number) =>
  Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, (width >>> 24) & 0xff, (width >>> 16) & 0xff,
    (width >>> 8) & 0xff, width & 0xff, (height >>> 24) & 0xff,
    (height >>> 16) & 0xff, (height >>> 8) & 0xff, height & 0xff, 0x08, 0x02,
    0x00, 0x00, 0x00,
  ]);

const makeJpeg = (width: number, height: number) =>
  Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11,
    0x08, (height >>> 8) & 0xff, height & 0xff, (width >>> 8) & 0xff,
    width & 0xff, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xd9,
  ]);

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


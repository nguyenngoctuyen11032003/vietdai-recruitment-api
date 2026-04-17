import { sanitizeRichText } from './sanitize-rich-text';

describe('sanitizeRichText', () => {
  it('removes script tags and inline event handlers', () => {
    const input = '<p onclick="alert(1)">Hello</p><script>alert(1)</script>';
    const result = sanitizeRichText(input);

    expect(result).toBe('<p>Hello</p>alert(1)');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('<script');
  });

  it('blocks javascript protocol in links and images', () => {
    const input = '<a href="javascript:alert(1)">x</a><img src="javascript:alert(2)" alt="x" />';
    const result = sanitizeRichText(input);

    expect(result).toBe('<a>x</a><img alt="x" />');
    expect(result).not.toContain('javascript:');
  });

  it('keeps allowlisted tags and safe attributes', () => {
    const input = '<p><strong>OK</strong> <a href="https://xkld.vn" target="_blank" rel="noopener">Go</a></p>';
    const result = sanitizeRichText(input);

    expect(result).toBe('<p><strong>OK</strong> <a href="https://xkld.vn" target="_blank" rel="noopener">Go</a></p>');
  });

  it('drops disallowed tags but keeps text', () => {
    const input = '<div>wrap <iframe src="https://bad"></iframe><span>text</span></div>';
    const result = sanitizeRichText(input);

    expect(result).toBe('wrap text');
  });
});


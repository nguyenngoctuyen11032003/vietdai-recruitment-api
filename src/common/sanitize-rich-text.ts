const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'em',
  'u',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'h2',
  'h3',
  'blockquote',
  'code',
  'pre',
]);

const GLOBAL_ALLOWED_ATTRIBUTES = new Set(['class']);

const TAG_ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt']),
};

const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:'];

const stripUnsafeTags = (input: string): string =>
  input
    .replace(
      /<\/?(script|style|iframe|object|embed|link|meta|svg|math)[^>]*>/gi,
      '',
    )
    .replace(/<!--([\s\S]*?)-->/g, '');

const sanitizeUrl = (value: string): string => {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('#') || trimmed.startsWith('/')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed, 'https://safe.local');
    if (!SAFE_PROTOCOLS.includes(parsed.protocol)) {
      return '';
    }
    return trimmed;
  } catch {
    return '';
  }
};

export function sanitizeRichText(input: string | null): string | null {
  if (!input) {
    return input;
  }

  const cleaned = stripUnsafeTags(input);

  return cleaned.replace(/<([^>]+)>/g, (fullTag, rawContent: string) => {
    const content = rawContent.trim();

    if (!content) {
      return '';
    }

    if (content.startsWith('!')) {
      return '';
    }

    const closingMatch = content.match(/^\/\s*([a-zA-Z0-9-]+)/);
    if (closingMatch) {
      const tagName = closingMatch[1].toLowerCase();
      return ALLOWED_TAGS.has(tagName) ? `</${tagName}>` : '';
    }

    const openMatch = content.match(/^([a-zA-Z0-9-]+)/);
    if (!openMatch) {
      return '';
    }

    const tagName = openMatch[1].toLowerCase();
    if (!ALLOWED_TAGS.has(tagName)) {
      return '';
    }

    const allowAttrs = new Set([
      ...GLOBAL_ALLOWED_ATTRIBUTES,
      ...(TAG_ALLOWED_ATTRIBUTES[tagName] || []),
    ]);

    const attrs: string[] = [];
    const attrRegex =
      /([a-zA-Z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
    let match: RegExpExecArray | null;

    while ((match = attrRegex.exec(content)) !== null) {
      const attrName = match[1].toLowerCase();
      const rawValue = (match[3] ?? match[4] ?? match[5] ?? '').trim();

      if (attrName.startsWith('on')) {
        continue;
      }

      if (!allowAttrs.has(attrName)) {
        continue;
      }

      if (attrName === 'href' || attrName === 'src') {
        const safeUrl = sanitizeUrl(rawValue);
        if (!safeUrl) {
          continue;
        }
        attrs.push(`${attrName}="${safeUrl}"`);
        continue;
      }

      if (attrName === 'target') {
        attrs.push(`target="${rawValue === '_blank' ? '_blank' : '_self'}"`);
        continue;
      }

      if (attrName === 'rel') {
        attrs.push(`rel="${rawValue || 'noreferrer noopener'}"`);
        continue;
      }

      attrs.push(`${attrName}="${rawValue.replace(/"/g, '&quot;')}"`);
    }

    const suffix = /\/$/.test(content) ? ' /' : '';
    return attrs.length > 0
      ? `<${tagName} ${attrs.join(' ')}${suffix}>`
      : `<${tagName}${suffix}>`;
  });
}



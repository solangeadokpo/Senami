import createDOMPurify, { type DOMPurify } from 'dompurify';
import { JSDOM } from 'jsdom';
import {
  LogoInvalidError,
  LogoTypeNotAllowedError,
} from '@modules/establishments/establishments.errors.js';

/** The database refuses more (establishments_logo_size_check). */
export const MAX_LOGO_BYTES = 512 * 1024;

export type LogoMimeType = 'image/png' | 'image/svg+xml';

export function isLogoMimeType(value: string): value is LogoMimeType {
  return value === 'image/png' || value === 'image/svg+xml';
}

export interface CleanLogo {
  content: Buffer;
  mimeType: LogoMimeType;
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

let purifier: DOMPurify | undefined;

/**
 * The type comes from the content, never from the name nor the declared
 * type. A PNG is kept as is; an SVG is rebuilt without anything that runs or
 * loads: scripts, event attributes, foreignObject, styles, links other than
 * internal ones (#id).
 */
export function cleanLogo(content: Buffer): CleanLogo {
  if (content.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return { content, mimeType: 'image/png' };
  }

  const text = content.toString('utf8');
  if (!/<svg[\s>]/i.test(text)) throw new LogoTypeNotAllowedError();

  const cleaned = svgPurifier().sanitize(text, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['foreignObject', 'script', 'style', 'a'],
    FORBID_ATTR: ['style'],
  });
  if (!/^<svg[\s>]/i.test(cleaned.trim())) throw new LogoInvalidError();

  const cleanedContent = Buffer.from(cleaned, 'utf8');
  if (cleanedContent.length > MAX_LOGO_BYTES) throw new LogoInvalidError();
  return { content: cleanedContent, mimeType: 'image/svg+xml' };
}

function svgPurifier(): DOMPurify {
  if (purifier !== undefined) return purifier;
  const { window } = new JSDOM('');
  purifier = createDOMPurify(window);
  // Only internal references (#gradient): no remote image, no tracking.
  purifier.addHook('uponSanitizeAttribute', (_node, data) => {
    if (
      (data.attrName === 'href' || data.attrName === 'xlink:href') &&
      !data.attrValue.startsWith('#')
    ) {
      data.keepAttr = false;
    }
  });
  return purifier;
}

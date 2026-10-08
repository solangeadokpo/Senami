import {
  LogoInvalidError,
  LogoTypeNotAllowedError,
} from '@modules/establishments/establishments.errors.js';
import { cleanLogo } from './logo-file.js';

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('rest of the image'),
]);

describe('cleanLogo', () => {
  it('keeps a PNG recognised by its signature', () => {
    expect(cleanLogo(PNG)).toEqual({ content: PNG, mimeType: 'image/png' });
  });

  it('refuses anything else than PNG or SVG, whatever its name', () => {
    expect(() => cleanLogo(Buffer.from('GIF89a...'))).toThrow(
      LogoTypeNotAllowedError,
    );
  });

  it('keeps the drawing of an SVG', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#2E2A4D"/></svg>';

    const { content, mimeType } = cleanLogo(Buffer.from(svg));

    expect(mimeType).toBe('image/svg+xml');
    expect(content.toString()).toContain('<rect');
    expect(content.toString()).toContain('fill="#2E2A4D"');
  });

  it('removes what runs or loads from an SVG', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" onload="alert(1)">
      <script>alert(2)</script>
      <foreignObject><div>html</div></foreignObject>
      <image href="https://tracker.example/pixel.png"/>
      <linearGradient id="brand"><stop offset="0" stop-color="#D45F76"/></linearGradient>
      <rect onclick="steal()" width="1" height="1" fill="url(#brand)"/>
    </svg>`;

    const cleaned = cleanLogo(Buffer.from(svg)).content.toString();

    expect(cleaned).not.toMatch(
      /onload|onclick|<script|alert|foreignObject|tracker\.example/,
    );
    expect(cleaned).toContain('fill="url(#brand)"');
  });

  it('refuses an SVG that does not survive the cleaning', () => {
    expect(() => cleanLogo(Buffer.from('text before <svg ></svg>'))).toThrow(
      LogoInvalidError,
    );
  });
});

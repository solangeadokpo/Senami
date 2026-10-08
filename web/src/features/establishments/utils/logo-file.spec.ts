import { checkLogoFile } from './logo-file';

const file = (type: string, size: number) =>
  new File([new Uint8Array(size)], 'logo', { type });

describe('checkLogoFile', () => {
  it('accepts a PNG or an SVG up to 512 KB', () => {
    expect(checkLogoFile(file('image/png', 1024))).toBeNull();
    expect(checkLogoFile(file('image/svg+xml', 512 * 1024))).toBeNull();
  });

  it('names the problem: the type or the weight', () => {
    expect(checkLogoFile(file('image/gif', 10))).toMatch(/PNG ou SVG/);
    expect(checkLogoFile(file('image/png', 600 * 1024))).toBe(
      'Choisissez une image de 512 Ko au plus. Celle-ci pèse 600 Ko.',
    );
  });
});

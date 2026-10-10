/** Checked again by the API, which reads the content and cleans an SVG. */
export const MAX_LOGO_BYTES = 512 * 1024;
const TYPES = new Set(['image/png', 'image/svg+xml']);

export function checkLogoFile(file: File): string | null {
  if (!TYPES.has(file.type))
    return 'Choisissez une image PNG ou SVG. Ce fichier est d’un autre type.';
  if (file.size > MAX_LOGO_BYTES) {
    return `Choisissez une image de 512 Ko au plus. Celle-ci pèse ${Math.round(file.size / 1024)} Ko.`;
  }
  return null;
}

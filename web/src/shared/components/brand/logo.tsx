import Image from 'next/image';
import { cn } from '@shared/utils/cn';

/**
 * The validated files of the brand kit, in public/brand/: never recomposed
 * in a font (L-01), scaled homothetically only (L-02).
 */
const LOGOS = {
  /** Default, on white or a very light background (L-08). */
  primary: { src: '/brand/senami-principal.svg', ratio: 729.09 / 144 },
  /** On indigo 900 or 950 (L-08). */
  inverse: { src: '/brand/senami-inverse.svg', ratio: 729.09 / 144 },
  /** With the long name: sign-in page, first encounter. 200 px wide at least (L-05). */
  signature: { src: '/brand/senami-signature.svg', ratio: 729.09 / 184.87 },
  /** Alone under 88 px of width (L-13). */
  badge: { src: '/brand/senami-pastille.svg', ratio: 1 },
} as const;

export type LogoVariant = keyof typeof LOGOS;

export function Logo({
  variant = 'primary',
  width,
  priority = false,
  className,
}: {
  variant?: LogoVariant;
  /** In pixels: 88 at least for a lock-up, 16 at least for the badge. */
  width: number;
  priority?: boolean;
  className?: string;
}) {
  const logo = LOGOS[variant];
  return (
    <Image
      src={logo.src}
      alt="Sènami"
      width={width}
      height={Math.round(width / logo.ratio)}
      priority={priority}
      className={cn('select-none', className)}
    />
  );
}

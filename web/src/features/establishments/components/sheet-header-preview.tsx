import { ImageIcon } from 'lucide-react';
import Image from 'next/image';

/**
 * The top of the sheet as the PDF will print it (charter, chapter 07): the
 * Sènami signature, a rule, the establishment. Fictitious data below.
 */
export function SheetHeaderPreview({
  name,
  address,
  phone,
  logoUrl,
}: {
  name: string;
  address: string;
  phone: string;
  logoUrl: string | null;
}) {
  return (
    <div
      className="rounded-md overflow-hidden border bg-white shadow-[0_1px_2px_rgb(46_42_77/0.06)]"
      aria-label="Aperçu de l’en-tête de la fiche"
    >
      <div className="grid h-2.5 grid-cols-[42px_1fr]">
        <span className="bg-coral-500" />
        <span className="bg-indigo-900" />
      </div>
      <div className="grid grid-cols-[88px_1px_minmax(0,1fr)] items-center gap-3 p-4">
        <Image
          src="/brand/senami-signature.svg"
          alt="Sènami"
          width={88}
          height={22}
        />
        <span className="self-stretch bg-slate-300" />
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5">
          <span className="rounded-md grid size-8.5 place-items-center overflow-hidden bg-slate-50 text-slate-500">
            {logoUrl === null ? (
              <ImageIcon className="size-4" aria-hidden />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="size-full object-contain" />
            )}
          </span>
          <span className="min-w-0">
            <b className="block text-xs font-extrabold break-words">
              {name === '' ? 'Nom de l’établissement' : name}
            </b>
            <span className="block text-[0.625rem] leading-snug break-words text-muted-foreground">
              {address}
            </span>
            <span className="block text-[0.625rem] text-muted-foreground tabular-nums">
              {phone}
            </span>
          </span>
        </div>
      </div>
      <p className="px-4 pb-3 font-display text-xs font-bold text-indigo-900 tabular-nums">
        Fiche n° 2026-0000042
      </p>
      <div className="grid gap-2 px-4 pb-4">
        <i className="rounded block h-1.5 bg-slate-100" />
        <i className="rounded block h-1.5 w-[70%] bg-slate-100" />
        <i className="rounded block h-1.5 w-[84%] bg-slate-100" />
      </div>
    </div>
  );
}

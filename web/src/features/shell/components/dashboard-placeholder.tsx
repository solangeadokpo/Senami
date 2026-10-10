import { LayoutGrid } from 'lucide-react';
import { UserRole } from '@shared/enums/user-role.enum';
import { cn } from '@shared/utils/cn';

const TILES: Record<
  'establishment' | 'platform',
  { label: string; hint: string }[]
> = {
  establishment: [
    { label: 'Déclarations ce mois', hint: 'Compteur agrégé' },
    { label: 'Numéros attribués cette année', hint: 'Prochain numéro' },
    { label: 'Utilisateurs', hint: 'Par rôle' },
    { label: 'Abonnement', hint: 'Prochaine échéance' },
  ],
  platform: [
    { label: 'Établissements actifs', hint: 'Sur les comptes créés' },
    { label: 'Revenu mensuel', hint: 'Abonnements en cours' },
    { label: 'Déclarations ce mois', hint: 'Compteur agrégé, aucun contenu' },
    { label: 'Abonnements à renouveler', hint: 'Échéance sous 30 jours' },
  ],
};

/** Where the indicators will be, until their features exist. */
export function DashboardPlaceholder({ role }: { role: UserRole }) {
  const isPlatform = role === UserRole.SUPER_ADMIN;
  const tiles = TILES[isPlatform ? 'platform' : 'establishment'];

  return (
    <>
      <div className="grid [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {tiles.map((tile, index) => {
          const isFirst = index === 0;
          const isLast = index === tiles.length - 1;
          return (
            <div
              key={tile.label}
              className={cn(
                'grid gap-1 rounded-3xl border p-5 transition-[translate,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgb(46_42_77/0.28)]',
                isFirst && 'border-coral-100 bg-coral-100',
                isLast && 'border-indigo-900 bg-indigo-900',
                !isFirst && !isLast && 'bg-white',
              )}
            >
              <span
                className={cn(
                  'text-sm',
                  isFirst
                    ? 'text-coral-600'
                    : isLast
                      ? 'text-indigo-300'
                      : 'text-muted-foreground',
                )}
              >
                {tile.label}
              </span>
              <span
                className={cn(
                  'font-display text-3xl font-bold',
                  isFirst
                    ? 'text-coral-300'
                    : isLast
                      ? 'text-indigo-700'
                      : 'text-slate-300',
                )}
                aria-label="Indicateur à venir"
              >
                —
              </span>
              <span
                className={cn(
                  'text-[0.8125rem]',
                  isLast ? 'text-indigo-300' : 'text-slate-500',
                )}
              >
                {tile.hint}
              </span>
            </div>
          );
        })}
      </div>
      <section className="grid justify-items-start gap-3 rounded-3xl border bg-white p-7">
        <span className="grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
          <LayoutGrid className="size-6" aria-hidden />
        </span>
        <h2 className="text-lg font-bold text-indigo-900">
          Les indicateurs arrivent avec les prochaines fonctionnalités
        </h2>
        <p className="max-w-[60ch] text-muted-foreground">
          {isPlatform
            ? 'Établissements, revenus, déclarations et renouvellements s’afficheront ici.'
            : 'Déclarations du mois, numéros attribués, équipe et abonnement s’afficheront ici.'}
        </p>
      </section>
    </>
  );
}

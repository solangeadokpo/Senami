'use client';

import { ImageIcon, Trash2, Upload } from 'lucide-react';
import { type DragEvent, useId, useState } from 'react';
import { checkLogoFile } from '@features/establishments/utils/logo-file';
import { Button } from '@shared/components/ui/button';
import { ConfirmDialog } from '@shared/components/ui/confirm-dialog';
import { cn } from '@shared/utils/cn';

/** The chosen file is kept until the form is saved. */
export function LogoField({
  previewUrl,
  onChoose,
  onRemove,
}: {
  previewUrl: string | null;
  onChoose: (file: File) => void;
  onRemove: () => void;
}) {
  const inputId = useId();
  const [isOver, setIsOver] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  const take = (file: File | undefined) => {
    if (file === undefined) return;
    const problem = checkLogoFile(file);
    if (problem !== null) {
      setMessage({ text: problem, isError: true });
      return;
    }
    setMessage({
      text: `${file.name} · ${Math.max(1, Math.round(file.size / 1024))} Ko`,
      isError: false,
    });
    onChoose(file);
  };
  const onDrag = (event: DragEvent, over: boolean) => {
    event.preventDefault();
    setIsOver(over);
  };

  return (
    <div className="grid gap-2">
      <span className="text-label text-slate-700 uppercase">Logo</span>
      <div
        onDragEnter={(event) => onDrag(event, true)}
        onDragOver={(event) => onDrag(event, true)}
        onDragLeave={(event) => onDrag(event, false)}
        onDrop={(event) => {
          onDrag(event, false);
          take(event.dataTransfer.files[0]);
        }}
        className={cn(
          'grid grid-cols-[88px_minmax(0,1fr)] items-center gap-4 rounded-2xl border-[1.5px] border-dashed p-5 transition-colors',
          isOver
            ? 'border-indigo-600 bg-indigo-50'
            : 'border-slate-300 bg-slate-50',
        )}
      >
        <span className="grid size-22 place-items-center overflow-hidden rounded-2xl border bg-white text-slate-500">
          {previewUrl === null ? (
            <ImageIcon className="size-6" aria-hidden />
          ) : (
            // A local preview (blob:) or the authenticated logo of the API.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Logo de l’établissement"
              className="size-full object-contain"
            />
          )}
        </span>
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            {isOver
              ? 'Déposez le fichier pour l’utiliser.'
              : 'Glissez votre logo ici ou choisissez un fichier. PNG ou SVG, 512 Ko au plus.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-9 px-4">
              <label htmlFor={inputId} className="cursor-pointer">
                <Upload aria-hidden />
                {previewUrl === null ? 'Choisir un fichier' : 'Remplacer'}
              </label>
            </Button>
            <input
              id={inputId}
              type="file"
              accept="image/png,image/svg+xml"
              className="sr-only"
              onChange={(event) => {
                take(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            {previewUrl === null ? null : (
              <ConfirmDialog
                trigger={
                  <Button type="button" variant="ghost" className="h-9 px-4">
                    <Trash2 aria-hidden />
                    Retirer
                  </Button>
                }
                tone="error"
                icon={<Trash2 />}
                title="Retirer le logo ?"
                description="Les prochaines fiches n’auront plus de logo, seulement le nom de l’établissement. Le retrait est pris en compte à l’enregistrement."
                confirmLabel="Retirer le logo"
                isDestructive
                onConfirm={() => {
                  setMessage(null);
                  onRemove();
                  return Promise.resolve(null);
                }}
              />
            )}
          </div>
        </div>
      </div>
      <p
        aria-live="polite"
        className={cn(
          'min-h-5 text-sm',
          message?.isError === true ? 'text-error' : 'text-muted-foreground',
        )}
      >
        {message?.text}
      </p>
    </div>
  );
}

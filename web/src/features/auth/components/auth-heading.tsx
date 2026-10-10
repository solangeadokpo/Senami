import type { ReactNode } from 'react';

export function AuthHeading({
  overline,
  title,
  children,
}: {
  overline: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <p className="font-display text-overline text-coral-600 uppercase">
        {overline}
      </p>
      <h1 className="text-[1.625rem] leading-tight font-bold tracking-tight text-indigo-900">
        {title}
      </h1>
      {children === undefined ? null : (
        <p className="text-[0.9375rem] text-muted-foreground">{children}</p>
      )}
    </div>
  );
}

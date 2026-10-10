import { cn } from '@shared/utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'rounded-md block h-3.5 animate-pulse bg-slate-200 motion-reduce:animate-none',
        className,
      )}
    />
  );
}

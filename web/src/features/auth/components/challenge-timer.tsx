'use client';

import { Clock } from 'lucide-react';
import { useEffect } from 'react';
import {
  formatDuration,
  useCountdown,
} from '@features/auth/hooks/use-countdown';
import { cn } from '@shared/utils/cn';

const LOW_MS = 60_000;

/** The challenge token lives five minutes: say how long is left. */
export function ChallengeTimer({
  expiresAt,
  onExpire,
}: {
  expiresAt: Date;
  onExpire: () => void;
}) {
  const left = useCountdown(expiresAt);

  useEffect(() => {
    if (left === 0) onExpire();
  }, [left, onExpire]);

  return (
    <p
      className={cn(
        'inline-flex items-center gap-2 text-sm tabular-nums',
        left < LOW_MS ? 'text-warning' : 'text-muted-foreground',
      )}
    >
      <Clock className="size-4" aria-hidden />
      Étape valable encore {formatDuration(left)}
    </p>
  );
}

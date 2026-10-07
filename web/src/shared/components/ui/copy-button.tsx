'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@shared/components/ui/button';

/** Copies a text; the label confirms for two seconds. */
export function CopyButton({
  text,
  label,
  copiedLabel,
}: {
  text: string;
  label: string;
  copiedLabel: string;
}) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) return;
    const timer = setTimeout(() => setIsCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [isCopied]);

  return (
    <Button
      type="button"
      variant="outline"
      className="h-9 px-4 text-sm"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => setIsCopied(true));
      }}
    >
      {isCopied ? <Check aria-hidden /> : <Copy aria-hidden />}
      <span aria-live="polite">{isCopied ? copiedLabel : label}</span>
    </Button>
  );
}

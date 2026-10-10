'use client';

import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { type ComponentProps, useState } from 'react';
import { Input } from '@shared/components/ui/input';

/** A password field that can be shown, and that notices caps lock. */
export function PasswordInput({
  onCapsLockChange,
  onKeyUp,
  ...props
}: Omit<ComponentProps<'input'>, 'type'> & {
  onCapsLockChange?: (isOn: boolean) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <Input
      {...props}
      type={isVisible ? 'text' : 'password'}
      leadingIcon={<LockKeyhole />}
      onKeyUp={(event) => {
        onCapsLockChange?.(event.getModifierState('CapsLock'));
        onKeyUp?.(event);
      }}
      trailing={
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          aria-label={
            isVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
          }
          aria-pressed={isVisible}
          className="grid size-9 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-indigo-100 hover:text-indigo-900 [&_svg]:size-5"
        >
          {isVisible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </button>
      }
    />
  );
}

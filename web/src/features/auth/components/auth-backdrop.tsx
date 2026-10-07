'use client';

import { useEffect, useRef } from 'react';
import styles from './auth-backdrop.module.css';

export function AuthBackdrop() {
  const backdrop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = backdrop.current;
    if (element === null) return;
    const onMove = (event: PointerEvent) => {
      element.style.setProperty(
        '--px',
        (event.clientX / window.innerWidth - 0.5).toFixed(3),
      );
      element.style.setProperty(
        '--py',
        (event.clientY / window.innerHeight - 0.5).toFixed(3),
      );
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div ref={backdrop} className={styles.backdrop} aria-hidden>
      {Array.from({ length: 6 }, (_, index) => (
        <span key={index} className={styles.shape} />
      ))}
    </div>
  );
}

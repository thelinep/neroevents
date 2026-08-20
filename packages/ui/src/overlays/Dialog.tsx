import {
  useEffect,
  useId,
} from 'react';

import type {
  ReactNode,
} from 'react';

import { Portal } from '../primitives/Portal.js';

export interface DialogProps {
  open: boolean;
  onOpenChange: (
    open: boolean,
  ) => void;
  title: string;
  children: ReactNode;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
}: DialogProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === 'Escape'
      ) {
        onOpenChange(false);
      }
    };

    document.addEventListener(
      'keydown',
      onKeyDown,
    );

    return () => {
      document.removeEventListener(
        'keydown',
        onKeyDown,
      );
    };
  }, [
    open,
    onOpenChange,
  ]);

  if (!open) {
    return null;
  }

  return (
    <Portal>
      <div
   className={[
    'fixed inset-0',
    'z-[9999]',
    'flex min-h-screen',
    'items-center justify-center',
    'overflow-y-auto',
    'bg-black/60',
    'p-4',
    'pointer-events-auto',
  ].join(' ')}
  style={{
    pointerEvents: 'auto',
  }}
        role="presentation"
        onMouseDown={(event) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            onOpenChange(false);
          }
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={[
            'w-full max-w-md',
            'rounded-lg',
            'border border-[#1e293b]',
            'bg-[#0f172a]',
            'p-6 text-white',
            'shadow-2xl',
          ].join(' ')}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
        >
          <h2
            id={titleId}
            className="mb-4 text-xl font-bold"
          >
            {title}
          </h2>

          {children}
        </div>
      </div>
    </Portal>
  );
}
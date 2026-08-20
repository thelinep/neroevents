import {
  createPortal,
} from 'react-dom';

import type {
  ReactNode,
} from 'react';

export interface PortalProps {
  children: ReactNode;
}

function getPortalRoot(): HTMLDivElement {
  let root = document.getElementById(
    'nevo-portal-root',
  ) as HTMLDivElement | null;

  if (!root) {
    root = document.createElement('div');
    root.id = 'nevo-portal-root';

    Object.assign(root.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '9999',
    });

    document.body.appendChild(root);
  }

  return root;
}

export function Portal({
  children,
}: PortalProps) {
  if (
    typeof document === 'undefined'
  ) {
    return null;
  }

  return createPortal(
    children,
    getPortalRoot(),
  );
}

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "========================================"
echo "M26.1 — NEVO UI FOUNDATION"
echo "========================================"

# --------------------------------------------------
# Preconditions
# --------------------------------------------------

test -f package.json
test -f pnpm-workspace.yaml
test -d apps/web

echo "✓ Nevo workspace detected"

# --------------------------------------------------
# Baseline checks
# --------------------------------------------------

echo
echo "--- BASELINE ---"

git diff --check

pnpm --filter @nevo/auth build
pnpm --filter nevo-builder-backend build
pnpm --filter nevo-builder-frontend build

echo "✓ Baseline builds PASS"

# --------------------------------------------------
# Create package
# --------------------------------------------------

echo
echo "--- CREATE @nevo/ui ---"

mkdir -p packages/ui/src/{primitives,forms,overlays,theme}

cat > packages/ui/package.json <<'EOF'
{
  "name": "@nevo/ui",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  }
}
EOF

cat > packages/ui/tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
EOF

echo "✓ @nevo/ui package created"

# --------------------------------------------------
# Tokens
# --------------------------------------------------

cat > packages/ui/src/theme/tokens.ts <<'EOF'
export const tokens = {
  color: {
    background: {
      canvas: '#0b1120',
      surface: '#0f172a',
      elevated: '#1e293b',
    },

    border: {
      subtle: '#1e293b',
      default: '#334155',
    },

    accent: {
      primary: '#3b82f6',
      primaryHover: '#2563eb',
    },

    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
      muted: '#64748b',
    },
  },

  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
} as const;

export type NevoTokens = typeof tokens;
EOF

# --------------------------------------------------
# Global theme
# --------------------------------------------------

cat > packages/ui/src/theme/theme.css <<'EOF'
:root {
  --nevo-bg-canvas: #0b1120;
  --nevo-bg-surface: #0f172a;
  --nevo-bg-elevated: #1e293b;

  --nevo-border-subtle: #1e293b;
  --nevo-border-default: #334155;

  --nevo-accent-primary: #3b82f6;
  --nevo-accent-primary-hover: #2563eb;

  --nevo-text-primary: #f8fafc;
  --nevo-text-secondary: #94a3b8;
  --nevo-text-muted: #64748b;
}
EOF

# --------------------------------------------------
# Portal
# --------------------------------------------------

cat > packages/ui/src/primitives/Portal.tsx <<'EOF'
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

export interface PortalProps {
  children: ReactNode;
}

export function Portal({ children }: PortalProps) {
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(children, document.body);
}
EOF

# --------------------------------------------------
# Stack
# --------------------------------------------------

cat > packages/ui/src/primitives/Stack.tsx <<'EOF'
import type { CSSProperties, ReactNode } from 'react';

export interface StackProps {
  children: ReactNode;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const gapMap: Record<NonNullable<StackProps['gap']>, string> = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
};

export function Stack({
  children,
  gap = 'md',
  className = '',
}: StackProps) {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: gapMap[gap],
  };

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
EOF

# --------------------------------------------------
# Box
# --------------------------------------------------

cat > packages/ui/src/primitives/Box.tsx <<'EOF'
import type { CSSProperties, ReactNode } from 'react';

export interface BoxProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Box({
  children,
  className = '',
  style,
}: BoxProps) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
EOF

# --------------------------------------------------
# Button
# --------------------------------------------------

cat > packages/ui/src/forms/Button.tsx <<'EOF'
import type {
  ButtonHTMLAttributes,
  ReactNode,
} from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger';

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-500 hover:bg-blue-600 text-white',
  secondary:
    'bg-gray-600 hover:bg-gray-700 text-white',
  ghost:
    'bg-transparent hover:bg-slate-800 text-slate-200',
  danger:
    'bg-red-600 hover:bg-red-700 text-white',
};

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={[
        'inline-flex items-center justify-center',
        'rounded-lg px-4 py-2',
        'transition',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
EOF

# --------------------------------------------------
# Input
# --------------------------------------------------

cat > packages/ui/src/forms/Input.tsx <<'EOF'
import type {
  InputHTMLAttributes,
} from 'react';

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({
  className = '',
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      className={[
        'w-full rounded-lg',
        'border border-[#334155]',
        'bg-[#1e293b]',
        'p-2 text-white',
        'outline-none',
        'focus:border-blue-500',
        className,
      ].join(' ')}
    />
  );
}
EOF

# --------------------------------------------------
# Dialog
# --------------------------------------------------

cat > packages/ui/src/overlays/Dialog.tsx <<'EOF'
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
  onOpenChange: (open: boolean) => void;
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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) {
    return null;
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[9999] overflow-y-auto bg-black/60"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onOpenChange(false);
          }
        }}
      >
        <div className="flex min-h-screen items-center justify-center p-4">
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
      </div>
    </Portal>
  );
}
EOF

# --------------------------------------------------
# Package exports
# --------------------------------------------------

cat > packages/ui/src/index.ts <<'EOF'
export * from './theme/tokens.js';

export * from './primitives/Box.js';
export * from './primitives/Stack.js';
export * from './primitives/Portal.js';

export * from './forms/Button.js';
export * from './forms/Input.js';

export * from './overlays/Dialog.js';
EOF

echo "✓ UI foundation source created"

# --------------------------------------------------
# Workspace dependency
# --------------------------------------------------

echo
echo "--- ADD @nevo/ui TO FRONTEND ---"

pnpm --filter nevo-builder-frontend add @nevo/ui@workspace:*

# --------------------------------------------------
# Build UI
# --------------------------------------------------

echo
echo "--- BUILD @nevo/ui ---"

pnpm --filter @nevo/ui build

test -f packages/ui/dist/index.js
test -f packages/ui/dist/index.d.ts

echo "✓ @nevo/ui build PASS"

# --------------------------------------------------
# Build frontend
# --------------------------------------------------

echo
echo "--- BUILD FRONTEND ---"

pnpm --filter nevo-builder-frontend build

echo "✓ Frontend build PASS"

# --------------------------------------------------
# Validation
# --------------------------------------------------

echo
echo "--- VALIDATION ---"

git diff --check

echo
echo "========================================"
echo "M26.1 UI FOUNDATION: PASS"
echo "========================================"
echo
echo "@nevo/ui:       PASS"
echo "Portal:         PASS"
echo "Button:         PASS"
echo "Input:          PASS"
echo "Dialog:         PASS"
echo "Frontend:       PASS"
echo "Database:       UNTOUCHED"
echo
echo "NEXT:"
echo "Migrate Dashboard to @nevo/ui Dialog"
echo
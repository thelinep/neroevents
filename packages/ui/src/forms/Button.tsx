import type {
  ButtonHTMLAttributes,
  ReactNode,
} from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger';

export type ButtonSize =
  | 'sm'
  | 'md'
  | 'lg';

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variants: Record<
  ButtonVariant,
  string
> = {
  primary:
    'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700',
  secondary:
    'bg-[#1e293b] text-white hover:bg-[#334155]',
  ghost:
    'bg-transparent text-gray-300 hover:bg-[#1e293b] hover:text-white',
  danger:
    'bg-red-500 text-white hover:bg-red-600',
};

const sizes: Record<
  ButtonSize,
  string
> = {
  sm:
    'px-3 py-1.5 text-sm',
  md:
    'px-4 py-2 text-sm',
  lg:
    'px-6 py-3 text-base',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled =
    disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={
        loading
          ? 'true'
          : undefined
      }
      className={[
        'inline-flex items-center justify-center',
        'rounded-lg',
        'transition',
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-blue-500',
        'disabled:cursor-not-allowed',
        'disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
        />
      ) : null}

      {children}
    </button>
  );
}
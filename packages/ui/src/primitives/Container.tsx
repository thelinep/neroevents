import type {
  ComponentPropsWithoutRef,
  ReactNode,
} from 'react';

export interface ContainerProps
  extends ComponentPropsWithoutRef<'div'> {
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizes = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-none',
} as const;

export function Container({
  children,
  className = '',
  size = 'xl',
  ...props
}: ContainerProps) {
  return (
    <div
      className={[
        'mx-auto w-full',
        sizes[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
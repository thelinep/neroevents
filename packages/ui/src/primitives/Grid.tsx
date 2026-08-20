import type {
  ComponentPropsWithoutRef,
  ReactNode,
} from 'react';

export interface GridProps
  extends ComponentPropsWithoutRef<'div'> {
  children?: ReactNode;
  gap?: string;
}

export function Grid({
  children,
  className = '',
  gap,
  style,
  ...props
}: GridProps) {
  return (
    <div
      className={[
        'grid',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        gap,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
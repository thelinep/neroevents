import type {
  ComponentPropsWithoutRef,
  ReactNode,
} from 'react';

export interface StackProps
  extends ComponentPropsWithoutRef<'div'> {
  children?: ReactNode;
  gap?: string;
}

export function Stack({
  children,
  className = '',
  gap,
  style,
  ...props
}: StackProps) {
  return (
    <div
      className={[
        'flex flex-col',
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
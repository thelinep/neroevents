import type {
  ElementType,
  ComponentPropsWithoutRef,
  ReactNode,
} from 'react';

export interface BoxProps<
  T extends ElementType = 'div',
> {
  as?: T;
  children?: ReactNode;
  className?: string;
}

export function Box<
  T extends ElementType = 'div',
>({
  as,
  children,
  className = '',
  ...props
}: BoxProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof BoxProps<T>>) {
  const Component = as ?? 'div';

  return (
    <Component
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
}
import type {
  ComponentPropsWithoutRef,
} from 'react';

export interface DividerProps
  extends ComponentPropsWithoutRef<'div'> {
  orientation?: 'horizontal' | 'vertical';
}

export function Divider({
  orientation = 'horizontal',
  className = '',
  ...props
}: DividerProps) {
  const vertical =
    orientation === 'vertical';

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={[
        'shrink-0 bg-[#1e293b]',
        vertical
          ? 'h-full w-px'
          : 'h-px w-full',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}
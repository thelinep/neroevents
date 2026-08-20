import {
  forwardRef,
} from 'react';

export interface CheckboxProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type'
  > {
  label?: React.ReactNode;
}

export const Checkbox = forwardRef<
  HTMLInputElement,
  CheckboxProps
>(function Checkbox(
  {
    label,
    id,
    className = '',
    ...props
  },
  ref,
) {
  const input = (
    <input
      {...props}
      ref={ref}
      id={id}
      type="checkbox"
      className={[
        'h-4 w-4',
        'rounded',
        'border border-[#475569]',
        'bg-[#0f172a]',
        'text-blue-500',
        'accent-blue-500',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-blue-500',
        'disabled:cursor-not-allowed',
        'disabled:opacity-50',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );

  if (!label) {
    return input;
  }

  return (
    <label
      htmlFor={id}
      className="inline-flex items-center gap-2 text-sm text-white"
    >
      {input}
      <span>{label}</span>
    </label>
  );
});

Checkbox.displayName = 'Checkbox';
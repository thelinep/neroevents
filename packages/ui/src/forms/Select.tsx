import {
  forwardRef,
  type ChangeEvent,
  type SelectHTMLAttributes,
} from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    'children'
  > {
  options?: SelectOption[];
  error?: string;
  description?: string;
}

export const Select = forwardRef<
  HTMLSelectElement,
  SelectProps
>(function Select(
  {
    options = [],
    error,
    description,
    id,
    className = '',
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    ...props
  },
  ref,
) {
  const descriptionId = id
    ? `${id}-description`
    : undefined;

  const errorId = id
    ? `${id}-error`
    : undefined;

  const describedBy =
    [
      ariaDescribedBy,
      description
        ? descriptionId
        : undefined,
      error
        ? errorId
        : undefined,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className="w-full">
      <select
        {...props}
        ref={ref}
        id={id}
        className={[
          'w-full rounded-lg border',
          'border-[#334155]',
          'bg-[#1e293b]',
          'px-3 py-2',
          'text-sm text-white',
          'focus:outline-none',
          'focus:ring-2',
          'focus:ring-blue-500/30',
          'disabled:cursor-not-allowed',
          'disabled:opacity-50',
          error
            ? 'border-red-500'
            : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-invalid={
          ariaInvalid ??
          (error
            ? true
            : undefined)
        }
        aria-describedby={
          describedBy
        }
      >
        {options.map(
          (option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={
                option.disabled
              }
            >
              {option.label}
            </option>
          ),
        )}
      </select>

      {description && (
        <p
          id={descriptionId}
          className="mt-1 text-xs text-gray-400"
        >
          {description}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1 text-xs text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
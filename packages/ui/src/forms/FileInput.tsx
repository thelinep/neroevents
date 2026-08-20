import {
  forwardRef,
} from 'react';

export interface FileInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type'
  > {
  error?: string;
  description?: string;
}

export const FileInput = forwardRef<
  HTMLInputElement,
  FileInputProps
>(function FileInput(
  {
    error,
    description,
    className = '',
    'aria-invalid': ariaInvalid,
    ...props
  },
  ref,
) {
  return (
    <div className="w-full">
      <input
        {...props}
        ref={ref}
        type="file"
        aria-invalid={
          error
            ? true
            : ariaInvalid
        }
        className={[
          'block w-full',
          'cursor-pointer',
          'rounded-lg',
          'border',
          'border-[#334155]',
          'bg-[#1e293b]',
          'text-sm text-gray-300',
          'file:mr-4',
          'file:border-0',
          'file:bg-blue-500',
          'file:px-4',
          'file:py-2',
          'file:text-sm',
          'file:font-medium',
          'file:text-white',
          'hover:file:bg-blue-600',
          'disabled:cursor-not-allowed',
          'disabled:opacity-50',
          error
            ? 'border-red-500'
            : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      />

      {description && (
        <p className="mt-1 text-xs text-gray-400">
          {description}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-1 text-xs text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
});

FileInput.displayName =
  'FileInput';
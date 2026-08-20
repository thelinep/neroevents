import {
  forwardRef,
} from 'react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  description?: string;
}

export const Input = forwardRef<
  HTMLInputElement,
  InputProps
>(function Input(
  {
    error,
    description,
    id,
    ...props
  },
  ref,
) {
  return (
    <div>
      <input
        ref={ref}
        id={id}
        {...props}
          aria-invalid={
    error ? 'true' : props['aria-invalid']
  }
      />

      {description && (
        <p className="mt-1 text-xs text-gray-400">
          {description}
        </p>
      )}

      {error && (
        <p
          className="mt-1 text-xs text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
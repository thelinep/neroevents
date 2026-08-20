import {
  forwardRef,
} from 'react';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  description?: string;
}

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>(function Textarea(
  {
    error,
    description,
    ...props
  },
  ref,
) {
  return (
    <div>
      <textarea
        ref={ref}
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

Textarea.displayName = 'Textarea';
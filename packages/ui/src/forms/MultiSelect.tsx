import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
} from 'react';

export interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface MultiSelectProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'value' | 'onChange' | 'children'
  > {
  options: MultiSelectOption[];
  value: string[];
  onChange: (
    value: string[],
  ) => void;
  placeholder?: string;
  error?: string;
  description?: string;
}

export const MultiSelect =
  forwardRef<
    HTMLButtonElement,
    MultiSelectProps
  >(function MultiSelect(
    {
      options,
      value,
      onChange,
      placeholder = 'Select...',
      error,
      description,
      id,
      className = '',
      disabled = false,
      ...props
    },
    ref,
  ) {
    const [open, setOpen] =
      useState<boolean>(false);

    const containerRef =
      useRef<HTMLDivElement>(
        null,
      );

    useEffect(() => {
      const handlePointerDown = (
        event: PointerEvent,
      ): void => {
        if (
          containerRef.current &&
          !containerRef.current.contains(
            event.target as Node,
          )
        ) {
          setOpen(false);
        }
      };

      document.addEventListener(
        'pointerdown',
        handlePointerDown,
      );

      return () => {
        document.removeEventListener(
          'pointerdown',
          handlePointerDown,
        );
      };
    }, []);

    const selectedOptions =
      options.filter(
        (option) =>
          value.includes(
            option.value,
          ),
      );

    const toggleOption = (
      option: MultiSelectOption,
    ): void => {
      if (
        disabled ||
        option.disabled
      ) {
        return;
      }

      if (
        value.includes(
          option.value,
        )
      ) {
        onChange(
          value.filter(
            (item) =>
              item !==
              option.value,
          ),
        );
      } else {
        onChange([
          ...value,
          option.value,
        ]);
      }
    };

    const displayValue =
      selectedOptions.length > 0
        ? selectedOptions
            .map(
              (option) =>
                option.label,
            )
            .join(', ')
        : placeholder;

    const descriptionId = id
      ? `${id}-description`
      : undefined;

    const errorId = id
      ? `${id}-error`
      : undefined;

    return (
      <div
        ref={containerRef}
        className="relative w-full"
      >
        <button
          {...props}
          ref={ref}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={
            error
              ? true
              : undefined
          }
          aria-describedby={
            [
              description
                ? descriptionId
                : undefined,
              error
                ? errorId
                : undefined,
            ]
              .filter(Boolean)
              .join(' ') ||
            undefined
          }
          className={[
            'flex w-full items-center',
            'justify-between gap-2',
            'rounded-lg border',
            'border-[#334155]',
            'bg-[#1e293b]',
            'px-3 py-2',
            'text-left text-sm text-white',
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
          onClick={() =>
            setOpen(
              (current) =>
                !current,
            )
          }
        >
          <span className="truncate">
            {displayValue}
          </span>

          <span
            aria-hidden="true"
            className="text-gray-400"
          >
            ▾
          </span>
        </button>

        {open && !disabled && (
          <div
            role="listbox"
            aria-multiselectable="true"
            className={[
              'absolute left-0 right-0',
              'z-50 mt-1 max-h-60',
              'overflow-auto',
              'rounded-lg border',
              'border-[#334155]',
              'bg-[#0f172a]',
              'p-1 shadow-xl',
            ].join(' ')}
          >
            {options.map(
              (option) => {
                const selected =
                  value.includes(
                    option.value,
                  );

                return (
                  <button
                    key={
                      option.value
                    }
                    type="button"
                    role="option"
                    aria-selected={
                      selected
                    }
                    disabled={
                      option.disabled
                    }
                    className={[
                      'flex w-full',
                      'items-center gap-2',
                      'rounded px-2 py-2',
                      'text-left text-sm',
                      'text-white',
                      'hover:bg-[#1e293b]',
                      'disabled:cursor-not-allowed',
                      'disabled:opacity-50',
                    ].join(' ')}
                    onClick={() =>
                      toggleOption(
                        option,
                      )
                    }
                  >
                    <span
                      aria-hidden="true"
                      className={[
                        'flex h-4 w-4',
                        'items-center',
                        'justify-center',
                        'rounded border',
                        selected
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-[#475569]',
                      ].join(' ')}
                    >
                      {selected
                        ? '✓'
                        : ''}
                    </span>

                    <span>
                      {
                        option.label
                      }
                    </span>
                  </button>
                );
              },
            )}

            {options.length ===
              0 && (
              <div className="px-2 py-2 text-sm text-gray-500">
                No options available.
              </div>
            )}
          </div>
        )}

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

MultiSelect.displayName =
  'MultiSelect';
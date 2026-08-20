import {
  useEffect,
  useId,
  useState,
} from 'react';

import type {
  MapCoordinate,
  MapPin,
} from './types.js';

export interface PinInputProps {
  value?: MapPin | null;
  onChange: (pin: MapPin | null) => void;
  onRequestLocation?: () => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

function createPinId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `pin-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function PinInput({
  value = null,
  onChange,
  onRequestLocation,
  disabled = false,
  className = '',
  id,
  'aria-label': ariaLabel,
}: PinInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const [latDraft, setLatDraft] = useState(
    value?.lat?.toString() ?? '',
  );

  const [lngDraft, setLngDraft] = useState(
    value?.lng?.toString() ?? '',
  );

  useEffect(() => {
    setLatDraft(value?.lat?.toString() ?? '');
  }, [value?.lat]);

  useEffect(() => {
    setLngDraft(value?.lng?.toString() ?? '');
  }, [value?.lng]);

  const updateCoordinate = (
    key: keyof MapCoordinate,
    rawValue: string,
  ) => {
    if (key === 'lat') {
      setLatDraft(rawValue);
    } else {
      setLngDraft(rawValue);
    }

    /*
     * Allow the input to temporarily be empty while the user
     * clears/replaces the value. Do not convert "" to 0.
     */
    if (rawValue.trim() === '') {
      return;
    }

    const coordinate = Number(rawValue);

    if (!Number.isFinite(coordinate)) {
      return;
    }

    const next: MapPin = {
      id: value?.id ?? createPinId(),
      lat:
        key === 'lat'
          ? coordinate
          : value?.lat ?? 0,
      lng:
        key === 'lng'
          ? coordinate
          : value?.lng ?? 0,
    };

    /*
     * Preserve label only when it actually exists.
     * This prevents { label: undefined } from appearing
     * in the emitted object.
     */
    if (value?.label !== undefined) {
      next.label = value.label;
    }

    onChange(next);
  };

  const clear = () => {
    setLatDraft('');
    setLngDraft('');
    onChange(null);
  };

  return (
    <div
      id={inputId}
      className={[
        'w-full rounded-lg',
        'border border-[#334155]',
        'bg-[#0f172a]',
        'p-3',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={ariaLabel}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-white">
          Location Pin
        </span>

        {value && (
          <button
            type="button"
            disabled={disabled}
            onClick={clear}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-400">
          Latitude

          <input
            type="number"
            step="any"
            min="-90"
            max="90"
            disabled={disabled}
            value={latDraft}
            onChange={(event) =>
              updateCoordinate(
                'lat',
                event.target.value,
              )
            }
            className="mt-1 w-full rounded border border-[#334155] bg-[#1e293b] px-2 py-2 text-sm text-white"
          />
        </label>

        <label className="text-xs text-gray-400">
          Longitude

          <input
            type="number"
            step="any"
            min="-180"
            max="180"
            disabled={disabled}
            value={lngDraft}
            onChange={(event) =>
              updateCoordinate(
                'lng',
                event.target.value,
              )
            }
            className="mt-1 w-full rounded border border-[#334155] bg-[#1e293b] px-2 py-2 text-sm text-white"
          />
        </label>
      </div>

      {onRequestLocation && (
        <button
          type="button"
          disabled={disabled}
          onClick={onRequestLocation}
          className="mt-3 rounded bg-blue-500 px-3 py-2 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
        >
          Use current location
        </button>
      )}
    </div>
  );
}
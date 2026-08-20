import {
  useEffect,
  useId,
  useState,
} from 'react';

import type {
  MapPin,
} from './types.js';

export interface MultiPinInputProps {
  value: MapPin[];
  onChange: (pins: MapPin[]) => void;
  onRequestLocation?: () => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

interface PinDraft {
  label: string;
  lat: string;
  lng: string;
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

function createDraft(pin: MapPin): PinDraft {
  return {
    label: pin.label ?? '',
    lat: String(pin.lat),
    lng: String(pin.lng),
  };
}

export function MultiPinInput({
  value,
  onChange,
  onRequestLocation,
  disabled = false,
  className = '',
  id,
  'aria-label': ariaLabel,
}: MultiPinInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const [drafts, setDrafts] = useState<
    Record<string, PinDraft>
  >(() => {
    const initial: Record<string, PinDraft> = {};

    for (const pin of value) {
      initial[pin.id] = createDraft(pin);
    }

    return initial;
  });

  /*
   * Keep drafts synchronized with externally supplied values,
   * but only when the actual parent value changes.
   */
  useEffect(() => {
    setDrafts((current) => {
      const next: Record<string, PinDraft> = {};

      for (const pin of value) {
        next[pin.id] =
          current[pin.id] ?? createDraft(pin);
      }

      return next;
    });
  }, [value]);

  const addPin = () => {
    const pin: MapPin = {
      id: createPinId(),
      lat: 0,
      lng: 0,
    };

    setDrafts((current) => ({
      ...current,
      [pin.id]: createDraft(pin),
    }));

    onChange([
      ...value,
      pin,
    ]);
  };

  const updateDraft = (
    id: string,
    field: keyof PinDraft,
    rawValue: string,
  ) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? {
          label: '',
          lat: '',
          lng: '',
        }),
        [field]: rawValue,
      },
    }));
  };

  const updateLabel = (
    id: string,
    rawValue: string,
  ) => {
    updateDraft(id, 'label', rawValue);

    onChange(
      value.map((pin) =>
        pin.id === id
          ? {
              ...pin,
              label: rawValue,
            }
          : pin,
      ),
    );
  };

  const updateCoordinate = (
    id: string,
    field: 'lat' | 'lng',
    rawValue: string,
  ) => {
    updateDraft(id, field, rawValue);

    /*
     * Empty is a valid temporary editing state.
     */
    if (rawValue.trim() === '') {
      return;
    }

    const coordinate = Number(rawValue);

    if (!Number.isFinite(coordinate)) {
      return;
    }

    onChange(
      value.map((pin) =>
        pin.id === id
          ? {
              ...pin,
              [field]: coordinate,
            }
          : pin,
      ),
    );
  };

  const removePin = (id: string) => {
    setDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });

    onChange(
      value.filter(
        (pin) => pin.id !== id,
      ),
    );
  };

  return (
    <div
      id={inputId}
      aria-label={ariaLabel}
      className={[
        'w-full rounded-lg',
        'border border-[#334155]',
        'bg-[#0f172a]',
        'p-3',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-white">
          Locations
        </span>

        <button
          type="button"
          disabled={disabled}
          onClick={addPin}
          className="rounded bg-blue-500 px-3 py-1.5 text-xs text-white hover:bg-blue-600 disabled:opacity-50"
        >
          Add Pin
        </button>
      </div>

      <div className="space-y-3">
        {value.map((pin, index) => {
          const draft =
            drafts[pin.id] ?? createDraft(pin);

          return (
            <div
              key={pin.id}
              className="rounded border border-[#334155] bg-[#1e293b] p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-300">
                  Pin {index + 1}
                </span>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    removePin(pin.id)
                  }
                  className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>

              <input
                type="text"
                disabled={disabled}
                placeholder="Label"
                value={draft.label}
                onChange={(event) =>
                  updateLabel(
                    pin.id,
                    event.target.value,
                  )
                }
                className="mb-2 w-full rounded border border-[#334155] bg-[#0f172a] px-2 py-2 text-sm text-white"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  disabled={disabled}
                  value={draft.lat}
                  onChange={(event) =>
                    updateCoordinate(
                      pin.id,
                      'lat',
                      event.target.value,
                    )
                  }
                  placeholder="Latitude"
                  className="rounded border border-[#334155] bg-[#0f172a] px-2 py-2 text-sm text-white"
                />

                <input
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  disabled={disabled}
                  value={draft.lng}
                  onChange={(event) =>
                    updateCoordinate(
                      pin.id,
                      'lng',
                      event.target.value,
                    )
                  }
                  placeholder="Longitude"
                  className="rounded border border-[#334155] bg-[#0f172a] px-2 py-2 text-sm text-white"
                />
              </div>
            </div>
          );
        })}
      </div>

      {value.length === 0 && (
        <p className="text-xs text-gray-500">
          No locations added.
        </p>
      )}

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
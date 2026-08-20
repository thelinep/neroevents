import {
  useId,
} from 'react';

import type {
  MapArea,
  MapCoordinate,
} from './types.js';

export interface AreaInputProps {
  value?: MapArea | null;

  onChange: (
    area: MapArea | null,
  ) => void;

  disabled?: boolean;

  className?: string;

  id?: string;

  'aria-label'?: string;
}

function createAreaId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `area-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function createCoordinate(): MapCoordinate {
  return {
    lat: 0,
    lng: 0,
  };
}

export function AreaInput({
  value = null,
  onChange,
  disabled = false,
  className = '',
  id,
  'aria-label': ariaLabel,
}: AreaInputProps) {
  const generatedId = useId();

  const inputId =
    id ?? generatedId;

  const createArea = () => {
    onChange({
      id: createAreaId(),
      coordinates: [
        createCoordinate(),
        createCoordinate(),
        createCoordinate(),
      ],
    });
  };

  const updateCoordinate = (
    index: number,
    field: 'lat' | 'lng',
    rawValue: string,
  ) => {
    if (!value) {
      return;
    }

    const coordinate =
      Number(rawValue);

    if (
      !Number.isFinite(
        coordinate,
      )
    ) {
      return;
    }

    const coordinates =
      value.coordinates.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]:
                  coordinate,
              }
            : item,
      );

    onChange({
      ...value,
      coordinates,
    });
  };

  const addPoint = () => {
    if (!value) {
      return;
    }

    onChange({
      ...value,
      coordinates: [
        ...value.coordinates,
        createCoordinate(),
      ],
    });
  };

  const removePoint = (
    index: number,
  ) => {
    if (!value) {
      return;
    }

    if (
      value.coordinates.length <=
      3
    ) {
      return;
    }

    onChange({
      ...value,
      coordinates:
        value.coordinates.filter(
          (_, itemIndex) =>
            itemIndex !== index,
        ),
    });
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
          Area
        </span>

        {!value ? (
          <button
            type="button"
            disabled={disabled}
            onClick={createArea}
            className="rounded bg-blue-500 px-3 py-1.5 text-xs text-white hover:bg-blue-600 disabled:opacity-50"
          >
            Create Area
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange(null)
            }
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>

      {value && (
        <>
          <input
            type="text"
            disabled={disabled}
            placeholder="Area label"
            value={
              value.label ?? ''
            }
            onChange={(event) =>
              onChange({
                ...value,
                label:
                  event.target
                    .value,
              })
            }
            className="mb-3 w-full rounded border border-[#334155] bg-[#1e293b] px-2 py-2 text-sm text-white"
          />

          <div className="space-y-2">
            {value.coordinates.map(
              (
                coordinate,
                index,
              ) => (
                <div
                  key={`${value.id}-${index}`}
                  className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2"
                >
                  <span className="pb-2 text-xs text-gray-500">
                    {index + 1}
                  </span>

                  <input
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    disabled={disabled}
                    value={
                      coordinate.lat
                    }
                    onChange={(
                      event,
                    ) =>
                      updateCoordinate(
                        index,
                        'lat',
                        event.target
                          .value,
                      )
                    }
                    placeholder="Latitude"
                    className="rounded border border-[#334155] bg-[#1e293b] px-2 py-2 text-sm text-white"
                  />

                  <input
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    disabled={disabled}
                    value={
                      coordinate.lng
                    }
                    onChange={(
                      event,
                    ) =>
                      updateCoordinate(
                        index,
                        'lng',
                        event.target
                          .value,
                      )
                    }
                    placeholder="Longitude"
                    className="rounded border border-[#334155] bg-[#1e293b] px-2 py-2 text-sm text-white"
                  />

                  <button
                    type="button"
                    disabled={
                      disabled ||
                      value
                        .coordinates
                        .length <=
                        3
                    }
                    onClick={() =>
                      removePoint(
                        index,
                      )
                    }
                    className="pb-2 text-xs text-red-400 disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
              ),
            )}
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={addPoint}
            className="mt-3 rounded bg-[#1e293b] px-3 py-2 text-xs text-gray-200 hover:bg-[#334155] disabled:opacity-50"
          >
            Add Point
          </button>
        </>
      )}

      {!value && (
        <p className="text-xs text-gray-500">
          No area defined.
        </p>
      )}
    </div>
  );
}
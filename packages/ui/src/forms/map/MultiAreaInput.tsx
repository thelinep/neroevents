import {
  useEffect,
  useId,
  useState,
} from 'react';

import type {
  MapArea,
  MapCoordinate,
} from './types.js';

export interface MultiAreaInputProps {
  value: MapArea[];
  onChange: (areas: MapArea[]) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

interface AreaDraft {
  label: string;
  coordinates: Array<{
    lat: string;
    lng: string;
  }>;
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

function emptyCoordinate(): MapCoordinate {
  return {
    lat: 0,
    lng: 0,
  };
}

function createArea(): MapArea {
  return {
    id: createAreaId(),
    coordinates: [
      emptyCoordinate(),
      emptyCoordinate(),
      emptyCoordinate(),
    ],
  };
}

function createDraft(
  area: MapArea,
): AreaDraft {
  return {
    label: area.label ?? '',
    coordinates:
      area.coordinates.map(
        (coordinate) => ({
          lat: String(coordinate.lat),
          lng: String(coordinate.lng),
        }),
      ),
  };
}

export function MultiAreaInput({
  value,
  onChange,
  disabled = false,
  className = '',
  id,
  'aria-label': ariaLabel,
}: MultiAreaInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const [drafts, setDrafts] = useState<
    Record<string, AreaDraft>
  >(() => {
    const initial: Record<string, AreaDraft> = {};

    for (const area of value) {
      initial[area.id] = createDraft(area);
    }

    return initial;
  });

  useEffect(() => {
    setDrafts((current) => {
      const next: Record<string, AreaDraft> = {};

      for (const area of value) {
        next[area.id] =
          current[area.id] ??
          createDraft(area);
      }

      return next;
    });
  }, [value]);

  const addArea = () => {
    const area = createArea();

    setDrafts((current) => ({
      ...current,
      [area.id]: createDraft(area),
    }));

    onChange([
      ...value,
      area,
    ]);
  };

  const removeArea = (
    id: string,
  ) => {
    setDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });

    onChange(
      value.filter(
        (area) => area.id !== id,
      ),
    );
  };

  const updateDraftLabel = (
    id: string,
    label: string,
  ) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? {
          label: '',
          coordinates: [],
        }),
        label,
      },
    }));

    onChange(
      value.map((area) =>
        area.id === id
          ? {
              ...area,
              label,
            }
          : area,
      ),
    );
  };

  const updateDraftPoint = (
    areaId: string,
    index: number,
    field: 'lat' | 'lng',
    rawValue: string,
  ) => {
    setDrafts((current) => {
      const existing =
        current[areaId];

      if (!existing) {
        return current;
      }

      const coordinates = [
        ...existing.coordinates,
      ];

      coordinates[index] = {
        ...coordinates[index],
        [field]: rawValue,
      };

      return {
        ...current,
        [areaId]: {
          ...existing,
          coordinates,
        },
      };
    });

    if (rawValue.trim() === '') {
      return;
    }

    const coordinate = Number(rawValue);

    if (!Number.isFinite(coordinate)) {
      return;
    }

    onChange(
      value.map((area) => {
        if (area.id !== areaId) {
          return area;
        }

        return {
          ...area,
          coordinates:
            area.coordinates.map(
              (item, itemIndex) =>
                itemIndex === index
                  ? {
                      ...item,
                      [field]: coordinate,
                    }
                  : item,
            ),
        };
      }),
    );
  };

  const addPoint = (
    area: MapArea,
  ) => {
    const nextCoordinates = [
      ...area.coordinates,
      emptyCoordinate(),
    ];

    setDrafts((current) => {
      const existing =
        current[area.id] ??
        createDraft(area);

      return {
        ...current,
        [area.id]: {
          ...existing,
          coordinates:
            nextCoordinates.map(
              (coordinate) => ({
                lat: String(
                  coordinate.lat,
                ),
                lng: String(
                  coordinate.lng,
                ),
              }),
            ),
        },
      };
    });

    onChange(
      value.map((item) =>
        item.id === area.id
          ? {
              ...item,
              coordinates:
                nextCoordinates,
            }
          : item,
      ),
    );
  };

  const removePoint = (
    area: MapArea,
    index: number,
  ) => {
    if (
      area.coordinates.length <= 3
    ) {
      return;
    }

    const nextCoordinates =
      area.coordinates.filter(
        (_, itemIndex) =>
          itemIndex !== index,
      );

    setDrafts((current) => {
      const existing =
        current[area.id];

      if (!existing) {
        return current;
      }

      return {
        ...current,
        [area.id]: {
          ...existing,
          coordinates:
            nextCoordinates.map(
              (coordinate) => ({
                lat: String(
                  coordinate.lat,
                ),
                lng: String(
                  coordinate.lng,
                ),
              }),
            ),
        },
      };
    });

    onChange(
      value.map((item) =>
        item.id === area.id
          ? {
              ...item,
              coordinates:
                nextCoordinates,
            }
          : item,
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
          Areas
        </span>

        <button
          type="button"
          disabled={disabled}
          onClick={addArea}
          className="rounded bg-blue-500 px-3 py-1.5 text-xs text-white hover:bg-blue-600 disabled:opacity-50"
        >
          Add Area
        </button>
      </div>

      <div className="space-y-4">
        {value.map(
          (area, areaIndex) => {
            const draft =
              drafts[area.id] ??
              createDraft(area);

            return (
              <div
                key={area.id}
                className="rounded-lg border border-[#334155] bg-[#1e293b] p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-300">
                    Area {areaIndex + 1}
                  </span>

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      removeArea(
                        area.id,
                      )
                    }
                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>

                <input
                  type="text"
                  disabled={disabled}
                  placeholder="Area label"
                  value={draft.label}
                  onChange={(event) =>
                    updateDraftLabel(
                      area.id,
                      event.target.value,
                    )
                  }
                  className="mb-3 w-full rounded border border-[#334155] bg-[#0f172a] px-2 py-2 text-sm text-white"
                />

                <div className="space-y-2">
                  {area.coordinates.map(
                    (
                      coordinate,
                      pointIndex,
                    ) => {
                      const pointDraft =
                        draft.coordinates[
                          pointIndex
                        ] ?? {
                          lat: String(
                            coordinate.lat,
                          ),
                          lng: String(
                            coordinate.lng,
                          ),
                        };

                      return (
                        <div
                          key={`${area.id}-${pointIndex}`}
                          className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2"
                        >
                          <span className="pb-2 text-xs text-gray-500">
                            {pointIndex + 1}
                          </span>

                          <input
                            type="number"
                            step="any"
                            min="-90"
                            max="90"
                            disabled={disabled}
                            value={
                              pointDraft.lat
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDraftPoint(
                                area.id,
                                pointIndex,
                                'lat',
                                event.target
                                  .value,
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
                            value={
                              pointDraft.lng
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDraftPoint(
                                area.id,
                                pointIndex,
                                'lng',
                                event.target
                                  .value,
                              )
                            }
                            placeholder="Longitude"
                            className="rounded border border-[#334155] bg-[#0f172a] px-2 py-2 text-sm text-white"
                          />

                          <button
                            type="button"
                            disabled={
                              disabled ||
                              area
                                .coordinates
                                .length <= 3
                            }
                            onClick={() =>
                              removePoint(
                                area,
                                pointIndex,
                              )
                            }
                            className="pb-2 text-xs text-red-400 disabled:opacity-30"
                          >
                            ×
                          </button>
                        </div>
                      );
                    },
                  )}
                </div>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    addPoint(area)
                  }
                  className="mt-3 rounded bg-[#0f172a] px-3 py-2 text-xs text-gray-200 hover:bg-[#334155] disabled:opacity-50"
                >
                  Add Point
                </button>
              </div>
            );
          },
        )}
      </div>

      {value.length === 0 && (
        <p className="text-xs text-gray-500">
          No areas defined.
        </p>
      )}
    </div>
  );
}
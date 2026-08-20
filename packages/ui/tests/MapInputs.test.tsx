import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  render,
  screen,
} from '@testing-library/react';

import userEvent from '@testing-library/user-event';

import {
  PinInput,
  MultiPinInput,
  AreaInput,
  MultiAreaInput,
} from '../src/forms/map/index.js';

import type {
  MapArea,
  MapPin,
} from '../src/forms/map/types.js';

describe('PinInput', () => {
  it('renders latitude and longitude', () => {
    const value: MapPin = {
      id: 'pin-1',
      lat: 28.6139,
      lng: 77.209,
    };

    render(
      <PinInput
        value={value}
        onChange={() => undefined}
        aria-label="Project location"
      />,
    );

    expect(
      screen.getByDisplayValue('28.6139'),
    ).toBeVisible();

    expect(
      screen.getByDisplayValue('77.209'),
    ).toBeVisible();
  });

  it('updates latitude', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const value: MapPin = {
      id: 'pin-1',
      lat: 28,
      lng: 77,
    };

    render(
      <PinInput
        value={value}
        onChange={onChange}
      />,
    );

    const latitude =
      screen.getByDisplayValue('28');

    await user.clear(latitude);
    await user.type(latitude, '30');

    expect(onChange).toHaveBeenLastCalledWith({
      id: 'pin-1',
      lat: 30,
      lng: 77,
    });
  });

  it('clears the pin', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const value: MapPin = {
      id: 'pin-1',
      lat: 28,
      lng: 77,
    };

    render(
      <PinInput
        value={value}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Clear',
      }),
    );

    expect(onChange).toHaveBeenCalledWith(
      null,
    );
  });

  it('requests current location', async () => {
    const user = userEvent.setup();
    const onRequestLocation =
      vi.fn();

    render(
      <PinInput
        onChange={() => undefined}
        onRequestLocation={
          onRequestLocation
        }
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Use current location',
      }),
    );

    expect(
      onRequestLocation,
    ).toHaveBeenCalledTimes(1);
  });
});

describe('MultiPinInput', () => {
  it('renders existing pins', () => {
    const pins: MapPin[] = [
      {
        id: 'pin-1',
        label: 'Delhi',
        lat: 28.6139,
        lng: 77.209,
      },
      {
        id: 'pin-2',
        label: 'Mumbai',
        lat: 19.076,
        lng: 72.8777,
      },
    ];

    render(
      <MultiPinInput
        value={pins}
        onChange={() => undefined}
      />,
    );

    expect(
      screen.getByDisplayValue(
        'Delhi',
      ),
    ).toBeVisible();

    expect(
      screen.getByDisplayValue(
        'Mumbai',
      ),
    ).toBeVisible();

    expect(
      screen.getByDisplayValue(
        '28.6139',
      ),
    ).toBeVisible();
  });

  it('adds a pin', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <MultiPinInput
        value={[]}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Add Pin',
      }),
    );

    expect(onChange).toHaveBeenCalledTimes(
      1,
    );

    const [
      nextValue,
    ] = onChange.mock.calls[0];

    expect(nextValue).toHaveLength(1);
    expect(nextValue[0]).toMatchObject({
      lat: 0,
      lng: 0,
    });
    expect(nextValue[0].id).toEqual(
      expect.any(String),
    );
  });

  it('removes a pin', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const pins: MapPin[] = [
      {
        id: 'pin-1',
        label: 'Delhi',
        lat: 28,
        lng: 77,
      },
    ];

    render(
      <MultiPinInput
        value={pins}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Remove',
      }),
    );

    expect(onChange).toHaveBeenCalledWith(
      [],
    );
  });

  it('updates a pin label', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const pins: MapPin[] = [
      {
        id: 'pin-1',
        label: 'Old',
        lat: 28,
        lng: 77,
      },
    ];

    render(
      <MultiPinInput
        value={pins}
        onChange={onChange}
      />,
    );

    const label =
      screen.getByDisplayValue('Old');

    await user.clear(label);
    await user.type(label, 'New');

    expect(
      onChange,
    ).toHaveBeenCalled();

    expect(
      onChange.mock.calls.at(-1)?.[0],
    ).toEqual([
      {
        id: 'pin-1',
        label: 'New',
        lat: 28,
        lng: 77,
      },
    ]);
  });
});

describe('AreaInput', () => {
  it('renders an empty area state', () => {
    render(
      <AreaInput
        value={null}
        onChange={() => undefined}
      />,
    );

    expect(
      screen.getByText(
        'No area defined.',
      ),
    ).toBeVisible();

    expect(
      screen.getByRole('button', {
        name: 'Create Area',
      }),
    ).toBeVisible();
  });

  it('creates an area', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <AreaInput
        value={null}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Create Area',
      }),
    );

    expect(onChange).toHaveBeenCalledTimes(
      1,
    );

    const area =
      onChange.mock.calls[0][0];

    expect(area.id).toEqual(
      expect.any(String),
    );

    expect(
      area.coordinates,
    ).toHaveLength(3);

    expect(
      area.coordinates[0],
    ).toEqual({
      lat: 0,
      lng: 0,
    });
  });

  it('renders an existing area', () => {
    const area: MapArea = {
      id: 'area-1',
      label: 'Production Zone',
      coordinates: [
        {
          lat: 28,
          lng: 77,
        },
        {
          lat: 29,
          lng: 78,
        },
        {
          lat: 27,
          lng: 79,
        },
      ],
    };

    render(
      <AreaInput
        value={area}
        onChange={() => undefined}
      />,
    );

    expect(
      screen.getByDisplayValue(
        'Production Zone',
      ),
    ).toBeVisible();

    expect(
      screen.getAllByDisplayValue('28'),
    ).toHaveLength(1);

    expect(
      screen.getAllByDisplayValue('77'),
    ).toHaveLength(1);
  });

  it('adds an area point', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const area: MapArea = {
      id: 'area-1',
      coordinates: [
        { lat: 1, lng: 2 },
        { lat: 3, lng: 4 },
        { lat: 5, lng: 6 },
      ],
    };

    render(
      <AreaInput
        value={area}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Add Point',
      }),
    );

    expect(
      onChange,
    ).toHaveBeenCalledWith({
      ...area,
      coordinates: [
        ...area.coordinates,
        {
          lat: 0,
          lng: 0,
        },
      ],
    });
  });

  it('clears an existing area', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const area: MapArea = {
      id: 'area-1',
      coordinates: [
        { lat: 1, lng: 2 },
        { lat: 3, lng: 4 },
        { lat: 5, lng: 6 },
      ],
    };

    render(
      <AreaInput
        value={area}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Clear',
      }),
    );

    expect(onChange).toHaveBeenCalledWith(
      null,
    );
  });
});

describe('MultiAreaInput', () => {
  const areas: MapArea[] = [
    {
      id: 'area-1',
      label: 'North',
      coordinates: [
        { lat: 1, lng: 2 },
        { lat: 3, lng: 4 },
        { lat: 5, lng: 6 },
      ],
    },
  ];

  it('renders existing areas', () => {
    render(
      <MultiAreaInput
        value={areas}
        onChange={() => undefined}
      />,
    );

    expect(
      screen.getByDisplayValue('North'),
    ).toBeVisible();

    expect(
      screen.getByDisplayValue('1'),
    ).toBeVisible();
  });

  it('adds an area', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <MultiAreaInput
        value={[]}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Add Area',
      }),
    );

    expect(onChange).toHaveBeenCalledTimes(
      1,
    );

    const nextValue =
      onChange.mock.calls[0][0];

    expect(nextValue).toHaveLength(1);
    expect(nextValue[0]).toMatchObject({
      coordinates: [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 0 },
        { lat: 0, lng: 0 },
      ],
    });
  });

  it('removes an area', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <MultiAreaInput
        value={areas}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Remove',
      }),
    );

    expect(onChange).toHaveBeenCalledWith(
      [],
    );
  });

  it('updates an area label', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <MultiAreaInput
        value={areas}
        onChange={onChange}
      />,
    );

    const label =
      screen.getByDisplayValue('North');

    await user.clear(label);
    await user.type(label, 'South');

    expect(
      onChange.mock.calls.at(-1)?.[0],
    ).toEqual([
      {
        ...areas[0],
        label: 'South',
      },
    ]);
  });

  it('does not remove an area point below three points', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <MultiAreaInput
        value={areas}
        onChange={onChange}
      />,
    );

    const removeButtons =
      screen.getAllByRole('button', {
        name: '×',
      });

    expect(removeButtons).toHaveLength(3);

    for (const button of removeButtons) {
      expect(button).toBeDisabled();
    }

    await user.click(
      removeButtons[0],
    );

    expect(onChange).not.toHaveBeenCalled();
  });
});

//
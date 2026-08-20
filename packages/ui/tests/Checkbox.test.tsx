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
  Checkbox,
} from '../src/forms/Checkbox.js';

describe('Checkbox', () => {
  it('renders a checkbox', () => {
    render(
      <Checkbox
        aria-label="Enable feature"
      />,
    );

    expect(
      screen.getByRole('checkbox', {
        name: 'Enable feature',
      }),
    ).toBeVisible();
  });

  it('supports checked state', () => {
    render(
      <Checkbox
        aria-label="Enable feature"
        checked
        onChange={() => undefined}
      />,
    );

    expect(
      screen.getByRole('checkbox', {
        name: 'Enable feature',
      }),
    ).toBeChecked();
  });

  it('supports user interaction', async () => {
    const user = userEvent.setup();

    render(
      <Checkbox
        aria-label="Enable feature"
      />,
    );

    const checkbox =
      screen.getByRole('checkbox', {
        name: 'Enable feature',
      });

    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    expect(checkbox).toBeChecked();
  });

  it('forwards onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <Checkbox
        aria-label="Enable feature"
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Enable feature',
      }),
    );

    expect(onChange).toHaveBeenCalled();
  });

  it('supports disabled state', () => {
    render(
      <Checkbox
        aria-label="Enable feature"
        disabled
      />,
    );

    expect(
      screen.getByRole('checkbox', {
        name: 'Enable feature',
      }),
    ).toBeDisabled();
  });

  it('supports required state', () => {
    render(
      <Checkbox
        aria-label="Enable feature"
        required
      />,
    );

    expect(
      screen.getByRole('checkbox', {
        name: 'Enable feature',
      }),
    ).toBeRequired();
  });

//   it('supports error state', () => {
//     render(
//       <Checkbox
//         aria-label="Enable feature"
//         error="This field is required"
//       />,
//     );

//     const checkbox =
//       screen.getByRole('checkbox', {
//         name: 'Enable feature',
//       });

//     expect(checkbox).toHaveAttribute(
//       'aria-invalid',
//       'true',
//     );

//     expect(
//       screen.getByText(
//         'This field is required',
//       ),
//     ).toBeVisible();
//   });
});
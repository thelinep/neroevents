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
  Textarea,
} from '../src/forms/Textarea.js';

describe('Textarea', () => {
  it('renders a textarea', () => {
    render(
      <Textarea
        aria-label="Description"
      />,
    );

    expect(
      screen.getByRole('textbox', {
        name: 'Description',
      }),
    ).toBeVisible();
  });

  it('supports user input', async () => {
    const user = userEvent.setup();

    render(
      <Textarea
        aria-label="Description"
      />,
    );

    const textarea =
      screen.getByRole('textbox', {
        name: 'Description',
      });

    await user.type(
      textarea,
      'Build a Nevo project',
    );

    expect(textarea).toHaveValue(
      'Build a Nevo project',
    );
  });

  it('supports controlled value', () => {
    render(
      <Textarea
        aria-label="Description"
        value="Nevo"
        onChange={() => undefined}
      />,
    );

    expect(
      screen.getByRole('textbox', {
        name: 'Description',
      }),
    ).toHaveValue('Nevo');
  });

  it('forwards onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <Textarea
        aria-label="Description"
        onChange={onChange}
      />,
    );

    await user.type(
      screen.getByRole('textbox', {
        name: 'Description',
      }),
      'N',
    );

    expect(onChange).toHaveBeenCalled();
  });

  it('supports disabled state', () => {
    render(
      <Textarea
        aria-label="Description"
        disabled
      />,
    );

    expect(
      screen.getByRole('textbox', {
        name: 'Description',
      }),
    ).toBeDisabled();
  });

  it('supports required state', () => {
    render(
      <Textarea
        aria-label="Description"
        required
      />,
    );

    expect(
      screen.getByRole('textbox', {
        name: 'Description',
      }),
    ).toBeRequired();
  });

  it('supports error state', () => {
    render(
      <Textarea
        aria-label="Description"
        error="Description is required"
      />,
    );

    const textarea =
      screen.getByRole('textbox', {
        name: 'Description',
      });

    expect(textarea).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    expect(
      screen.getByText(
        'Description is required',
      ),
    ).toBeVisible();
  });

  it('supports description text', () => {
    render(
      <Textarea
        aria-label="Description"
        description="Describe the project."
      />,
    );

    expect(
      screen.getByText(
        'Describe the project.',
      ),
    ).toBeVisible();
  });
});
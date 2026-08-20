import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Input } from '../src/forms/Input.js';

describe('Input', () => {
  it('renders an input', () => {
    render(
      <Input
        aria-label="Project name"
      />,
    );

    expect(
      screen.getByRole('textbox', {
        name: 'Project name',
      }),
    ).toBeVisible();
  });

  it('supports user input', async () => {
    const user = userEvent.setup();

    render(
      <Input
        aria-label="Project name"
      />,
    );

    const input = screen.getByRole(
      'textbox',
      {
        name: 'Project name',
      },
    );

    await user.type(input, 'Nevo');

    expect(input).toHaveValue('Nevo');
  });

  it('supports controlled value', () => {
    render(
      <Input
        aria-label="Project name"
        value="Nevo"
        onChange={() => undefined}
      />,
    );

    expect(
      screen.getByRole('textbox', {
        name: 'Project name',
      }),
    ).toHaveValue('Nevo');
  });

  it('supports disabled state', () => {
    render(
      <Input
        aria-label="Project name"
        disabled
      />,
    );

    expect(
      screen.getByRole('textbox', {
        name: 'Project name',
      }),
    ).toBeDisabled();
  });

  it('supports required state', () => {
    render(
      <Input
        aria-label="Project name"
        required
      />,
    );

    expect(
      screen.getByRole('textbox', {
        name: 'Project name',
      }),
    ).toBeRequired();
  });

  it('supports error state', () => {
    render(
      <Input
        aria-label="Project name"
        error="Project name is required"
      />,
    );

    const input = screen.getByRole(
      'textbox',
      {
        name: 'Project name',
      },
    );

    expect(input).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    expect(
      screen.getByText(
        'Project name is required',
      ),
    ).toBeVisible();
  });

  it('supports description text', () => {
    render(
      <Input
        aria-label="Project name"
        description="Use a descriptive name."
      />,
    );

    expect(
      screen.getByText(
        'Use a descriptive name.',
      ),
    ).toBeVisible();
  });

  it('forwards onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <Input
        aria-label="Project name"
        onChange={onChange}
      />,
    );

    await user.type(
      screen.getByRole('textbox', {
        name: 'Project name',
      }),
      'N',
    );

    expect(onChange).toHaveBeenCalled();
  });
});
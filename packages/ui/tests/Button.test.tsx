import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Button } from '../src/forms/Button.js';

describe('Button', () => {
  it('renders an accessible button', () => {
    render(
      <Button>
        Create Project
      </Button>,
    );

    expect(
      screen.getByRole('button', {
        name: 'Create Project',
      }),
    ).toBeVisible();
  });

  it('supports click events', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button onClick={onClick}>
        Create
      </Button>,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Create',
      }),
    );

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('supports disabled state', () => {
    render(
      <Button disabled>
        Create
      </Button>,
    );

    expect(
      screen.getByRole('button', {
        name: 'Create',
      }),
    ).toBeDisabled();
  });

  it('supports loading state', () => {
    render(
      <Button loading>
        Create
      </Button>,
    );

    const button = screen.getByRole('button', {
      name: 'Create',
    });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('supports variants', () => {
    render(
      <Button variant="danger">
        Delete
      </Button>,
    );

    expect(
      screen.getByRole('button', {
        name: 'Delete',
      }),
    ).toHaveClass('bg-red-500');
  });

  it('supports sizes', () => {
    render(
      <Button size="lg">
        Continue
      </Button>,
    );

    expect(
      screen.getByRole('button', {
        name: 'Continue',
      }),
    ).toHaveClass('px-6');
  });

  it('supports keyboard activation', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button onClick={onClick}>
        Continue
      </Button>,
    );

    const button = screen.getByRole('button', {
      name: 'Continue',
    });

    button.focus();

    await user.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('forwards native button attributes', () => {
    render(
      <Button
        type="submit"
        name="project"
        value="create"
      >
        Create
      </Button>,
    );

    const button = screen.getByRole('button', {
      name: 'Create',
    });

    expect(button).toHaveAttribute(
      'type',
      'submit',
    );

    expect(button).toHaveAttribute(
      'name',
      'project',
    );

    expect(button).toHaveAttribute(
      'value',
      'create',
    );
  });
});
import { describe, expect, it, vi } from 'vitest';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  Select,
  type SelectOption,
} from '../src/forms/Select.js';

const options: SelectOption[] = [
  {
    value: 'ollama',
    label: 'Ollama',
  },
  {
    value: 'openai',
    label: 'OpenAI',
  },
  {
    value: 'gemini',
    label: 'Gemini',
  },
];

describe('Select', () => {
  it('renders a select', () => {
    render(
      <Select
        aria-label="Provider"
        options={options}
      />,
    );

    expect(
      screen.getByRole('combobox', {
        name: 'Provider',
      }),
    ).toBeVisible();
  });

  it('renders supplied options', () => {
    render(
      <Select
        aria-label="Provider"
        options={options}
      />,
    );

    expect(
      screen.getByRole('option', {
        name: 'Ollama',
      }),
    ).toBeVisible();

    expect(
      screen.getByRole('option', {
        name: 'OpenAI',
      }),
    ).toBeVisible();

    expect(
      screen.getByRole('option', {
        name: 'Gemini',
      }),
    ).toBeVisible();
  });

  it('supports controlled value', () => {
    render(
      <Select
        aria-label="Provider"
        options={options}
        value="openai"
        onChange={() => undefined}
      />,
    );

    expect(
      screen.getByRole('combobox', {
        name: 'Provider',
      }),
    ).toHaveValue('openai');
  });

  it('supports changing the selected option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <Select
        aria-label="Provider"
        options={options}
        value="ollama"
        onChange={onChange}
      />,
    );

    await user.selectOptions(
      screen.getByRole('combobox', {
        name: 'Provider',
      }),
      'openai',
    );

    expect(onChange).toHaveBeenCalled();
  });

  it('supports disabled options', () => {
    render(
      <Select
        aria-label="Provider"
        options={[
          ...options,
          {
            value: 'disabled',
            label: 'Disabled',
            disabled: true,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole('option', {
        name: 'Disabled',
      }),
    ).toBeDisabled();
  });

  it('supports disabled state', () => {
    render(
      <Select
        aria-label="Provider"
        options={options}
        disabled
      />,
    );

    expect(
      screen.getByRole('combobox', {
        name: 'Provider',
      }),
    ).toBeDisabled();
  });

  it('supports required state', () => {
    render(
      <Select
        aria-label="Provider"
        options={options}
        required
      />,
    );

    expect(
      screen.getByRole('combobox', {
        name: 'Provider',
      }),
    ).toBeRequired();
  });

  it('supports error state', () => {
    render(
      <Select
        aria-label="Provider"
        options={options}
        error="Provider is required"
      />,
    );

    const select =
      screen.getByRole('combobox', {
        name: 'Provider',
      });

    expect(select).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    expect(
      screen.getByText(
        'Provider is required',
      ),
    ).toBeVisible();
  });

  it('supports description text', () => {
    render(
      <Select
        aria-label="Provider"
        options={options}
        description="Choose the model provider."
      />,
    );

    expect(
      screen.getByText(
        'Choose the model provider.',
      ),
    ).toBeVisible();
  });

  it('supports custom className', () => {
    render(
      <Select
        aria-label="Provider"
        options={options}
        className="custom-select"
      />,
    );

    expect(
      screen.getByRole('combobox', {
        name: 'Provider',
      }),
    ).toHaveClass('custom-select');
  });
});
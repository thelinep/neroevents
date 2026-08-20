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
  Radio,
} from '../src/forms/Radio.js';

describe('Radio', () => {
  it('renders a radio', () => {
    render(
      <Radio
        name="provider"
        value="ollama"
        aria-label="Ollama"
      />,
    );

    expect(
      screen.getByRole('radio', {
        name: 'Ollama',
      }),
    ).toBeVisible();
  });

  it('supports checked state', () => {
    render(
      <Radio
        name="provider"
        value="ollama"
        aria-label="Ollama"
        checked
        onChange={() => undefined}
      />,
    );

    expect(
      screen.getByRole('radio', {
        name: 'Ollama',
      }),
    ).toBeChecked();
  });

  it('supports unchecked state', () => {
    render(
      <Radio
        name="provider"
        value="ollama"
        aria-label="Ollama"
      />,
    );

    expect(
      screen.getByRole('radio', {
        name: 'Ollama',
      }),
    ).not.toBeChecked();
  });

  it('supports user interaction', async () => {
    const user = userEvent.setup();

    render(
      <Radio
        name="provider"
        value="ollama"
        aria-label="Ollama"
      />,
    );

    const radio =
      screen.getByRole('radio', {
        name: 'Ollama',
      });

    await user.click(radio);

    expect(radio).toBeChecked();
  });

  it('forwards onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <Radio
        name="provider"
        value="ollama"
        aria-label="Ollama"
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('radio', {
        name: 'Ollama',
      }),
    );

    expect(
      onChange,
    ).toHaveBeenCalled();
  });

  it('supports disabled state', () => {
    render(
      <Radio
        name="provider"
        value="ollama"
        aria-label="Ollama"
        disabled
      />,
    );

    expect(
      screen.getByRole('radio', {
        name: 'Ollama',
      }),
    ).toBeDisabled();
  });

  it('supports required state', () => {
    render(
      <Radio
        name="provider"
        value="ollama"
        aria-label="Ollama"
        required
      />,
    );

    expect(
      screen.getByRole('radio', {
        name: 'Ollama',
      }),
    ).toBeRequired();
  });

  it('supports custom className', () => {
    render(
      <Radio
        name="provider"
        value="ollama"
        aria-label="Ollama"
        className="custom-radio"
      />,
    );

    expect(
      screen.getByRole('radio', {
        name: 'Ollama',
      }),
    ).toHaveClass(
      'custom-radio',
    );
  });
});
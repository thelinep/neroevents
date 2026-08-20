import { describe, expect, it, vi } from 'vitest';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  MultiSelect,
  type MultiSelectOption,
} from '../src/forms/MultiSelect.js';

const options: MultiSelectOption[] = [
  {
    value: 'frontend',
    label: 'Frontend',
  },
  {
    value: 'backend',
    label: 'Backend',
  },
  {
    value: 'database',
    label: 'Database',
  },
];

describe('MultiSelect', () => {
  it('renders the control', () => {
    render(
      <MultiSelect
        aria-label="Skills"
        options={options}
        value={[]}
        onChange={() => undefined}
      />,
    );

    expect(
      screen.getByRole('button', {
        name: 'Skills',
      }),
    ).toBeVisible();
  });

  it('renders the selected values', () => {
    render(
      <MultiSelect
        aria-label="Skills"
        options={options}
        value={[
          'frontend',
          'backend',
        ]}
        onChange={() => undefined}
      />,
    );

    expect(
      screen.getByRole('button', {
        name: 'Skills',
      }),
    ).toHaveTextContent(
      'Frontend, Backend',
    );
  });

  it('renders the placeholder when empty', () => {
    render(
      <MultiSelect
        aria-label="Skills"
        options={options}
        value={[]}
        onChange={() => undefined}
        placeholder="Select skills"
      />,
    );

    expect(
      screen.getByRole('button', {
        name: 'Skills',
      }),
    ).toHaveTextContent(
      'Select skills',
    );
  });

  it('opens the option list', async () => {
    const user = userEvent.setup();

    render(
      <MultiSelect
        aria-label="Skills"
        options={options}
        value={[]}
        onChange={() => undefined}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Skills',
      }),
    );

    expect(
      screen.getByRole('listbox'),
    ).toBeVisible();

    expect(
      screen.getByRole('option', {
        name: 'Frontend',
      }),
    ).toBeVisible();
  });

  it('calls onChange when an option is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <MultiSelect
        aria-label="Skills"
        options={options}
        value={[]}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Skills',
      }),
    );

    await user.click(
      screen.getByRole('option', {
        name: 'Frontend',
      }),
    );

    expect(onChange).toHaveBeenLastCalledWith([
      'frontend',
    ]);
  });

  it('adds to an existing selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <MultiSelect
        aria-label="Skills"
        options={options}
        value={['frontend']}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Skills',
      }),
    );

    await user.click(
      screen.getByRole('option', {
        name: 'Backend',
      }),
    );

    expect(onChange).toHaveBeenLastCalledWith([
      'frontend',
      'backend',
    ]);
  });

  it('removes an existing selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <MultiSelect
        aria-label="Skills"
        options={options}
        value={[
          'frontend',
          'backend',
        ]}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Skills',
      }),
    );

    await user.click(
      screen.getByRole('option', {
        name: 'Frontend',
      }),
    );

    expect(onChange).toHaveBeenLastCalledWith([
      'backend',
    ]);
  });

  it('supports disabled options', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <MultiSelect
        aria-label="Skills"
        options={[
          ...options,
          {
            value: 'disabled',
            label: 'Disabled',
            disabled: true,
          },
        ]}
        value={[]}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Skills',
      }),
    );

    expect(
      screen.getByRole('option', {
        name: 'Disabled',
      }),
    ).toBeDisabled();
  });

  it('supports disabled state', () => {
    render(
      <MultiSelect
        aria-label="Skills"
        options={options}
        value={[]}
        onChange={() => undefined}
        disabled
      />,
    );

    expect(
      screen.getByRole('button', {
        name: 'Skills',
      }),
    ).toBeDisabled();
  });

  it('supports custom className', () => {
    render(
      <MultiSelect
        aria-label="Skills"
        options={options}
        value={[]}
        onChange={() => undefined}
        className="custom-multiselect"
      />,
    );

    expect(
      screen.getByRole('button', {
        name: 'Skills',
      }),
    ).toHaveClass(
      'custom-multiselect',
    );
  });
});
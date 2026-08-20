import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Stack } from '../src/primitives/Stack.js';

describe('Stack', () => {
  it('renders children', () => {
    render(
      <Stack>
        <span>First</span>
        <span>Second</span>
      </Stack>,
    );

    expect(screen.getByText('First')).toBeVisible();
    expect(screen.getByText('Second')).toBeVisible();
  });

  it('renders as a div by default', () => {
    render(
      <Stack>
        Content
      </Stack>,
    );

    expect(
      screen.getByText('Content').parentElement?.tagName,
    ).toBe('DIV');
  });

  it('supports custom className', () => {
    render(
      <Stack className="custom-stack">
        Content
      </Stack>,
    );

   expect(
  screen.getByText('Content'),
).toHaveClass('custom-stack');
  });
});
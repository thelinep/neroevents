import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Box } from '../src/primitives/Box.js';

describe('Box', () => {
  it('renders children', () => {
    render(
      <Box>
        <span>Content</span>
      </Box>,
    );

    expect(screen.getByText('Content')).toBeVisible();
  });

  it('renders a custom element', () => {
    render(
      <Box as="section">
        Content
      </Box>,
    );

    expect(
      screen.getByText('Content').tagName,
    ).toBe('SECTION');
  });

  it('accepts className', () => {
    render(
      <Box className="test-class">
        Content
      </Box>,
    );

    expect(
      screen.getByText('Content'),
    ).toHaveClass('test-class');
  });
});
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Container } from '../src/primitives/Container.js';

describe('Container', () => {
  it('renders children', () => {
    render(
      <Container>
        Content
      </Container>,
    );

    expect(screen.getByText('Content')).toBeVisible();
  });

  it('provides container semantics', () => {
    render(
      <Container>
        Content
      </Container>,
    );

   const element = screen.getByText('Content');

expect(element).toHaveClass('mx-auto');
  });
});
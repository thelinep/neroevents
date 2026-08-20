import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Grid } from '../src/primitives/Grid.js';

describe('Grid', () => {
  it('renders children', () => {
    render(
      <Grid>
        <div>One</div>
        <div>Two</div>
      </Grid>,
    );

    expect(screen.getByText('One')).toBeVisible();
    expect(screen.getByText('Two')).toBeVisible();
  });

  it('renders grid layout', () => {
    render(
      <Grid>
        Content
      </Grid>,
    );

    const element = screen.getByText('Content');

expect(element).toHaveClass('grid');
  });
});
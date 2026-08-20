import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Label } from '../src/forms/Label.js';

describe('Label', () => {
  it('renders label text', () => {
    render(
      <Label htmlFor="project-name">
        Project name
      </Label>,
    );

    expect(
      screen.getByText('Project name'),
    ).toBeVisible();
  });

  it('associates with an input', () => {
    render(
      <>
        <Label htmlFor="project-name">
          Project name
        </Label>

        <input id="project-name" />
      </>,
    );

    expect(
      screen.getByLabelText('Project name'),
    ).toBeInTheDocument();
  });

  it('supports required indicator', () => {
    render(
      <Label
        htmlFor="project-name"
        required
      >
        Project name
      </Label>,
    );

    expect(
      screen.getByText('*'),
    ).toBeInTheDocument();
  });
});
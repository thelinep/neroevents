import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { Divider } from '../src/primitives/Divider.js';

describe('Divider', () => {
  it('renders a separator', () => {
    const { container } = render(<Divider />);

    expect(
      container.querySelector('[role="separator"]'),
    ).toBeInTheDocument();
  });

  it('supports aria orientation', () => {
    const { container } = render(
      <Divider orientation="vertical" />,
    );

    expect(
      container.querySelector('[role="separator"]'),
    ).toHaveAttribute(
      'aria-orientation',
      'vertical',
    );
  });
});
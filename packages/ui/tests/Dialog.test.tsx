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

import { Dialog } from '../src/overlays/Dialog.js';

describe('Dialog', () => {
  it('does not render when closed', () => {
    render(
      <Dialog
        open={false}
        onOpenChange={() => undefined}
        title="Create Project"
      >
        Content
      </Dialog>,
    );

    expect(
      screen.queryByRole('dialog'),
    ).not.toBeInTheDocument();
  });

  it('renders when open', () => {
    render(
      <Dialog
        open
        onOpenChange={() => undefined}
        title="Create Project"
      >
        Content
      </Dialog>,
    );

    expect(
      screen.getByRole('dialog'),
    ).toBeVisible();

    expect(
      screen.getByRole('heading', {
        name: 'Create Project',
      }),
    ).toBeVisible();
  });

  it('renders through the Nevo portal root', () => {
    render(
      <Dialog
        open
        onOpenChange={() => undefined}
        title="Create Project"
      >
        Content
      </Dialog>,
    );

    const portal = document.getElementById(
      'nevo-portal-root',
    );

    expect(portal).toBeInTheDocument();

    expect(
      portal?.querySelector(
        '[role="dialog"]',
      ),
    ).toBeInTheDocument();
  });

  it('sets aria-modal', () => {
    render(
      <Dialog
        open
        onOpenChange={() => undefined}
        title="Create Project"
      >
        Content
      </Dialog>,
    );

    expect(
      screen.getByRole('dialog'),
    ).toHaveAttribute(
      'aria-modal',
      'true',
    );
  });

  it('associates the dialog with its title', () => {
    render(
      <Dialog
        open
        onOpenChange={() => undefined}
        title="Create Project"
      >
        Content
      </Dialog>,
    );

    const dialog =
      screen.getByRole('dialog');

    const title =
      screen.getByRole('heading', {
        name: 'Create Project',
      });

    expect(
      dialog.getAttribute(
        'aria-labelledby',
      ),
    ).toBe(title.id);
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <Dialog
        open
        onOpenChange={onOpenChange}
        title="Create Project"
      >
        Content
      </Dialog>,
    );

    await user.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledWith(
      false,
    );
  });

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <Dialog
        open
        onOpenChange={onOpenChange}
        title="Create Project"
      >
        Content
      </Dialog>,
    );

    const dialog =
      screen.getByRole('dialog');

    const overlay =
      dialog.parentElement;

    expect(overlay).toBeTruthy();

    await user.click(
      overlay as HTMLElement,
    );

    expect(onOpenChange).toHaveBeenCalledWith(
      false,
    );
  });

  it('does not close when dialog content is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <Dialog
        open
        onOpenChange={onOpenChange}
        title="Create Project"
      >
        <button>Inside</button>
      </Dialog>,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Inside',
      }),
    );

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('renders children', () => {
    render(
      <Dialog
        open
        onOpenChange={() => undefined}
        title="Create Project"
      >
        <p>Dialog content</p>
      </Dialog>,
    );

    expect(
      screen.getByText(
        'Dialog content',
      ),
    ).toBeVisible();
  });
});
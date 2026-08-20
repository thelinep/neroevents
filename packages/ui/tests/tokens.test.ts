import { describe, expect, it } from 'vitest';

import {
  colors,
  spacing,
  radii,
  shadows,
  motion,
  tokens,
} from '../src/theme/tokens.js';

describe('Nevo design tokens', () => {
  it('exposes semantic colors', () => {
    expect(colors.background.canvas).toBe('#080c16');
    expect(colors.background.surface).toBe('#0f172a');

    expect(colors.text.primary).toBe('#f8fafc');
    expect(colors.text.secondary).toBe('#94a3b8');

    expect(colors.accent.primary).toBe('#3b82f6');

    expect(colors.status.success).toBe('#22c55e');
    expect(colors.status.warning).toBe('#f59e0b');
    expect(colors.status.danger).toBe('#ef4444');
    expect(colors.status.info).toBe('#38bdf8');
  });

  it('exposes spacing tokens', () => {
    expect(spacing[0]).toBe('0');
    expect(spacing[1]).toBe('0.25rem');
    expect(spacing[4]).toBe('1rem');
    expect(spacing[12]).toBe('3rem');
  });

  it('exposes radius tokens', () => {
    expect(radii.sm).toBe('0.375rem');
    expect(radii.md).toBe('0.5rem');
    expect(radii.lg).toBe('0.75rem');
    expect(radii.full).toBe('9999px');
  });

  it('exposes shadow tokens', () => {
    expect(shadows.sm).toContain('0 1px 2px');
    expect(shadows.md).toContain('0 4px 12px');
    expect(shadows.lg).toContain('0 12px 32px');
  });

  it('exposes motion tokens', () => {
    expect(motion.fast).toBe('120ms');
    expect(motion.normal).toBe('180ms');
    expect(motion.slow).toBe('260ms');
  });

  it('exports the complete token object', () => {
    expect(tokens).toEqual({
      colors,
      spacing,
      radii,
      shadows,
      motion,
    });
  });
});
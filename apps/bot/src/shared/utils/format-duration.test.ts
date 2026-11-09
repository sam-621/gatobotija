import { describe, expect, test } from 'vitest';

import { formatDuration } from './format-duration';

describe('formatDuration', () => {
  test('returns minutes and seconds', () => {
    expect(formatDuration(213)).toBe('3:33');
  });

  test('returns zero-padded seconds', () => {
    expect(formatDuration(65)).toBe('1:05');
  });

  test('returns 0:00 for zero seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  test('returns hours with zero-padded minutes and seconds', () => {
    expect(formatDuration(3723)).toBe('1:02:03');
  });
});

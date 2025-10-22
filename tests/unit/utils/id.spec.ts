import { describe, expect, it } from 'vitest';
import { makeSlug, newTaskId } from '../../../src/utils/index.js';

describe('id utilities', () => {
  it('generates task IDs with timestamp and random suffix', () => {
    const id = newTaskId();
    expect(id).toMatch(/^T-\d{14}-[0-9a-f]{6}$/);
  });

  it('creates URL-friendly slugs with fallback', () => {
    expect(makeSlug('Implement Feature XYZ')).toBe('implement-feature-xyz');
    expect(makeSlug('  ')).toBe('task');
    expect(makeSlug('LongTitle!@#$%^&*() with spaces')).toBe('longtitle-with-spaces');
  });
});

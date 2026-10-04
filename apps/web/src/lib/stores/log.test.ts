import { describe, expect, it, beforeEach } from 'vitest';
import { logStore } from './log.svelte';

beforeEach(() => {
  logStore.clear();
});

describe('logStore', () => {
  it('appends distinct lines', () => {
    logStore.info('one');
    logStore.warn('two');
    expect(logStore.entries.map((e) => e.text)).toEqual(['one', 'two']);
    expect(logStore.entries.every((e) => e.count === 1)).toBe(true);
  });

  it('collapses consecutive identical lines into one counted entry', () => {
    logStore.info('same');
    logStore.info('same');
    logStore.info('same');
    expect(logStore.entries).toHaveLength(1);
    expect(logStore.entries[0].count).toBe(3);
  });

  it('does not collapse when the level differs', () => {
    logStore.info('same');
    logStore.warn('same');
    expect(logStore.entries).toHaveLength(2);
  });

  it('does not collapse identical lines separated by another line', () => {
    logStore.info('a');
    logStore.info('b');
    logStore.info('a');
    expect(logStore.entries).toHaveLength(3);
  });
});

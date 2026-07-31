import { describe, it, expect } from 'vitest';
import { CHAT_PERSONALITIES, getPersonalityById } from '../chatPersonalities';

describe('chatPersonalities', () => {
  it('exposes a non-empty theme list with required fields', () => {
    expect(Array.isArray(CHAT_PERSONALITIES)).toBe(true);
    expect(CHAT_PERSONALITIES.length).toBeGreaterThan(0);
    for (const p of CHAT_PERSONALITIES) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.icon).toBeTruthy();
      expect(p.category).toBeTruthy();
      expect(p.theme).toBeTruthy();
    }
  });

  it('has unique personality ids', () => {
    const ids = CHAT_PERSONALITIES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getPersonalityById returns the matching theme', () => {
    const first = CHAT_PERSONALITIES[0];
    expect(getPersonalityById(first.id)).toEqual(first);
  });

  it('getPersonalityById falls back to the first theme for unknown ids', () => {
    expect(getPersonalityById('does-not-exist')).toBe(CHAT_PERSONALITIES[0]);
  });
});

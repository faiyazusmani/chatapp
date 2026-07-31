import { describe, it, expect } from 'vitest';
import { formatLastSeen } from '../dateFormatter';

describe('formatLastSeen', () => {
  it('returns Online/Away/Offline for status shortcuts', () => {
    expect(formatLastSeen(new Date(), 'online')).toBe('Online');
    expect(formatLastSeen(new Date(), 'away')).toBe('Away');
    expect(formatLastSeen(null, 'offline')).toBe('Offline');
    expect(formatLastSeen(undefined, 'offline')).toBe('Offline');
  });

  it('handles a date a few minutes ago', () => {
    const d = new Date(Date.now() - 2 * 60000);
    expect(formatLastSeen(d, 'offline')).toMatch(/^Last seen 2 minutes ago$/);
  });

  it('handles a date just now', () => {
    const d = new Date(Date.now() - 10 * 1000);
    expect(formatLastSeen(d, 'offline')).toBe('Last seen just now');
  });

  it('handles an invalid date gracefully', () => {
    // Invalid dates must not crash Intl formatting — fall back to Offline
    expect(formatLastSeen('not-a-date', 'offline')).toBe('Offline');
  });
});

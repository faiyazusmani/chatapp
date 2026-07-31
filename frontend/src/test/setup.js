import { vi, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock browser APIs
globalThis.matchMedia = vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock serviceWorker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: vi.fn().mockResolvedValue({}),
    addEventListener: vi.fn(),
    controller: null,
  },
  writable: true,
});

// Mock Notification API
globalThis.Notification = vi.fn().mockImplementation((title, options) => ({
  title,
  ...options,
  close: vi.fn(),
}));

Notification.permission = 'default';
Notification.requestPermission = vi.fn().mockResolvedValue('granted');

// Mock console.error to reduce noise in tests
const originalError = console.error;
console.error = (...args) => {
  if (
    args[0]?.includes?.('Warning: ReactDOM.render is no longer supported') ||
    args[0]?.includes?.('act(...)') ||
    args[0]?.includes?.('An update to')
  ) {
    return;
  }
  originalError.call(console, ...args);
};

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});
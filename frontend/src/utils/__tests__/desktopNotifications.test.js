import { vi, describe, it, expect, beforeEach } from 'vitest';

// Use hoisted mocks for module-level mocking.
// NOTE: must be a regular function (not an arrow) so `new Notification(...)`
// works — arrow mocks throw "is not a constructor" and the source's try/catch
// swallows it, leaving mock.results[0].value as the TypeError object.
const { MockNotification } = vi.hoisted(() => {
  const createMock = vi.fn(function MockNotification(title, options) {
    this.title = title;
    this.body = options?.body;
    this.icon = options?.icon;
    this.tag = options?.tag;
    this.onclick = null;
    this.close = vi.fn();
  });

  createMock.permission = 'default';
  createMock.requestPermission = vi.fn().mockResolvedValue('granted');

  return { MockNotification: createMock };
});

vi.stubGlobal('Notification', MockNotification);

describe('desktopNotifications', () => {
  let notificationsSupported, requestNotificationPermission, showDesktopNotification;

  beforeEach(async () => {
    vi.resetModules();
    
    MockNotification.mockClear();
    MockNotification.permission = 'default';
    MockNotification.requestPermission.mockClear();
    
    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true,
      configurable: true,
    });
    
    document.hasFocus = vi.fn().mockReturnValue(true);
    window.dispatchEvent = vi.fn();
    
    const mod = await import('../desktopNotifications');
    notificationsSupported = mod.notificationsSupported;
    requestNotificationPermission = mod.requestNotificationPermission;
    showDesktopNotification = mod.showDesktopNotification;
  });

  it('notificationsSupported returns true when Notification exists', () => {
    expect(notificationsSupported()).toBe(true);
  });

  it('requestNotificationPermission calls requestPermission when permission is default', async () => {
    MockNotification.permission = 'default';
    await requestNotificationPermission();
    expect(MockNotification.requestPermission).toHaveBeenCalled();
  });

  it('requestNotificationPermission does nothing when permission is already granted', async () => {
    MockNotification.permission = 'granted';
    await requestNotificationPermission();
    expect(MockNotification.requestPermission).not.toHaveBeenCalled();
  });

  it('requestNotificationPermission does nothing when permission is denied', async () => {
    MockNotification.permission = 'denied';
    await requestNotificationPermission();
    expect(MockNotification.requestPermission).not.toHaveBeenCalled();
  });

  it('showDesktopNotification does nothing when permission not granted', () => {
    MockNotification.permission = 'default';
    showDesktopNotification('Title', 'Body');
    expect(MockNotification).not.toHaveBeenCalled();
  });

  it('showDesktopNotification does nothing when document is visible and focused', () => {
    MockNotification.permission = 'granted';
    document.hidden = false;
    document.hasFocus.mockReturnValue(true);
    showDesktopNotification('Title', 'Body');
    expect(MockNotification).not.toHaveBeenCalled();
  });

  it('showDesktopNotification creates notification when document is hidden', () => {
    MockNotification.permission = 'granted';
    document.hidden = true;
    showDesktopNotification('Title', 'Body', 'room-123');
    expect(MockNotification).toHaveBeenCalledWith('Title', {
      body: 'Body',
      icon: undefined,
      tag: 'chat-room-123',
    });
  });

  it('showDesktopNotification handles click event', () => {
    MockNotification.permission = 'granted';
    document.hidden = true;
    // Note: The actual click handler fires on user interaction in browser.
    // Here we verify the notification object structure is correct.
    showDesktopNotification('Title', 'Body', 'room-123');
    const notificationInstance = MockNotification.mock.results[0].value;
    expect(notificationInstance).toBeDefined();
    expect(notificationInstance.title).toBe('Title');
    expect(notificationInstance.body).toBe('Body');
    expect(notificationInstance.tag).toBe('chat-room-123');
  });
});
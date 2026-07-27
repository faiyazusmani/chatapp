/**
 * Formats a Date object or string into a relative last seen format.
 * Examples:
 * - "Online"
 * - "Away"
 * - "Last seen 2 minutes ago"
 * - "Last seen today at 10:45 PM"
 * - "Last seen yesterday at 9:00 AM"
 * - "Last seen 10/12/2023"
 * 
 * @param {string|Date} date - The lastSeen date from DB
 * @param {string} status - 'online', 'offline', 'away'
 * @returns {string}
 */
export const formatLastSeen = (date, status) => {
  if (status === 'online') return 'Online';
  if (status === 'away') return 'Away';
  if (!date) return 'Offline';

  const lastSeenDate = new Date(date);
  const now = new Date();
  
  const diffInMs = now - lastSeenDate;
  const diffInMins = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMins / 60);

  // Less than an hour ago
  if (diffInMins < 1) return 'Last seen just now';
  if (diffInMins < 60) return `Last seen ${diffInMins} minute${diffInMins > 1 ? 's' : ''} ago`;

  // Check if it's today or yesterday
  const isToday = now.toDateString() === lastSeenDate.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = yesterday.toDateString() === lastSeenDate.toDateString();

  const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const timeString = timeFormatter.format(lastSeenDate);

  if (isToday) return `Last seen today at ${timeString}`;
  if (isYesterday) return `Last seen yesterday at ${timeString}`;

  // Older dates
  const dateFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  return `Last seen ${dateFormatter.format(lastSeenDate)}`;
};

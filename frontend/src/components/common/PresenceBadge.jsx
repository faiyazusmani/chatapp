import React from 'react';
import { usePresence } from '../../hooks/usePresence';
import { formatLastSeen } from '../../utils/dateFormatter';

export default function PresenceBadge({ userId, children }) {
  const presence = usePresence(userId);

  let color = '#9ca3af'; // gray (offline)
  if (presence.status === 'online') color = '#22c55e'; // green
  else if (presence.status === 'away') color = '#eab308'; // yellow

  const title = formatLastSeen(presence.lastSeen, presence.status);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} title={title}>
      {children}
      <span
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: color,
          border: '2px solid #181a20',
          transition: 'background-color 0.3s ease'
        }}
      />
    </div>
  );
}

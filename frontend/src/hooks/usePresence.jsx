import React, { useState, useEffect, createContext, useContext } from 'react';
import { socket } from '../services/socket';

const PresenceContext = createContext();

export const PresenceProvider = ({ children }) => {
  const [presenceMap, setPresenceMap] = useState({}); // { userId: { status, lastSeen } }

  useEffect(() => {
    // Listen for incoming status changes from backend
    const handleStatusChanged = ({ userId, status, lastSeen }) => {
      setPresenceMap((prev) => ({
        ...prev,
        [userId]: { status, lastSeen }
      }));
    };

    socket.on('user_status_changed', handleStatusChanged);

    return () => {
      socket.off('user_status_changed', handleStatusChanged);
    };
  }, []);

  // Idle detection logic
  useEffect(() => {
    let timeout;
    let isAway = false;
    
    const resetIdleTimer = () => {
      if (!socket.connected) return;
      
      if (isAway) {
        socket.emit('user_active');
        isAway = false;
      }
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (socket.connected) {
          isAway = true;
          socket.emit('user_away');
        }
      }, 5 * 60 * 1000); // 5 minutes
    };

    // Listeners for activity
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('touchstart', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);

    // Initial timer
    resetIdleTimer();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('touchstart', resetIdleTimer);
      window.removeEventListener('click', resetIdleTimer);
    };
  }, []);

  return (
    <PresenceContext.Provider value={{ presenceMap }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = (userId) => {
  const { presenceMap } = useContext(PresenceContext);
  return presenceMap[userId] || { status: 'offline', lastSeen: null };
};

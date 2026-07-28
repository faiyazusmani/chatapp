import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './useAuth';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const defaultTheme = {
  preset: 'default',
  primaryColor: '#7c3aed',
  msgIncomingBg: '#222530',
  msgOutgoingBg: '#7c3aed',
  chatBg: '#181a20',
  sidebarBg: '#1a1c23',
  borderRadius: '12px',
  fontFamily: 'Inter',
};

export const ThemeProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [theme, setThemeState] = useState(() => {
    // 1. Try to load from localStorage first for instant render
    const saved = localStorage.getItem('gajim_theme');
    if (saved) {
      try {
        return { ...defaultTheme, ...JSON.parse(saved) };
      } catch (e) {
        return defaultTheme;
      }
    }
    return defaultTheme;
  });

  // 2. Sync with User data from MongoDB on login
  useEffect(() => {
    if (isAuthenticated && user?.theme) {
      const mergedTheme = { ...defaultTheme, ...user.theme };
      setThemeState(mergedTheme);
      localStorage.setItem('gajim_theme', JSON.stringify(mergedTheme));
    }
  }, [user, isAuthenticated]);

  // 3. Inject CSS Variables dynamically whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', theme.primaryColor);
    root.style.setProperty('--theme-msg-in-bg', theme.msgIncomingBg);
    root.style.setProperty('--theme-msg-out-bg', theme.msgOutgoingBg);
    root.style.setProperty('--theme-chat-bg', theme.chatBg);
    root.style.setProperty('--theme-sidebar-bg', theme.sidebarBg);
    root.style.setProperty('--theme-radius', theme.borderRadius);
    root.style.setProperty('--theme-font', theme.fontFamily);

    // Apply special classes to body for complex themes
    document.body.className = ''; // reset
    if (theme.preset === 'glassmorphism') document.body.classList.add('theme-glass');
    if (theme.preset === 'amoled') document.body.classList.add('theme-amoled');
    
  }, [theme]);

  // Update theme locally and persist to MongoDB
  const updateTheme = useCallback(async (newThemeUpdates) => {
    const updatedTheme = { ...theme, ...newThemeUpdates };
    setThemeState(updatedTheme);
    localStorage.setItem('gajim_theme', JSON.stringify(updatedTheme));

    if (isAuthenticated) {
      try {
        await api.put('/users/theme', { theme: newThemeUpdates });
      } catch (err) {
        console.error('Failed to save theme to server:', err);
      }
    }
  }, [theme, isAuthenticated]);

  const resetTheme = useCallback(async () => {
    setThemeState(defaultTheme);
    localStorage.removeItem('gajim_theme');
    if (isAuthenticated) {
      try {
        await api.put('/users/theme', { theme: defaultTheme });
      } catch (err) {
        console.error('Failed to reset theme on server:', err);
      }
    }
  }, [isAuthenticated]);

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, resetTheme, defaultTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Palette, ThemeType, ThemeColors } from '../constants/theme';

const THEME_STORAGE_KEY = '@student_theme_mode';

interface ThemeContextType {
  theme: ThemeType;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Default theme is strictly 'light'
  const [theme, setTheme] = useState<ThemeType>('light');

  // 2. Load persisted theme on app boot
  useEffect(() => {
    const loadStoredTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme === 'dark' || storedTheme === 'light') {
          setTheme(storedTheme);
        }
      } catch (e) {
        console.warn('Failed to load persisted theme mode:', e);
      }
    };

    loadStoredTheme();
  }, []);

  // 3. Persist on toggle
  const toggleTheme = () => {
    setTheme((prev) => {
      const next: ThemeType = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch((e) => {
        console.warn('Failed to persist theme mode:', e);
      });
      return next;
    });
  };

  // 4. Persist on explicit mode change
  const setThemeMode = (mode: ThemeType) => {
    setTheme(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch((e) => {
      console.warn('Failed to persist theme mode:', e);
    });
  };

  const colors = Palette[theme];
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, isDark, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('titleops-theme') as Theme;
    return stored || 'light';
  });

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('titleops-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    // Add transitioning class for smooth color crossfade
    const root = document.documentElement;
    root.classList.add('theme-transitioning');

    setTheme(prev => prev === 'light' ? 'dark' : 'light');

    // Remove after transition completes
    const timeout = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 300);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
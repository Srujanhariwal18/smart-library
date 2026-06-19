import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('lib_theme');
    return saved ? saved === 'dark' : true; // Default to dark mode for premium look
  });

  useEffect(() => {
    const root = window.document.body;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('lib_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('lib_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
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

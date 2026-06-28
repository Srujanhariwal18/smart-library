import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase.js';

const ThemeContext = createContext(null);

const isSupabaseEnabled = !!import.meta.env.VITE_SUPABASE_URL &&
                          !import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// ─── Persistence helpers ─────────────────────────────────────────────────────
async function loadThemeFromSupabase(userId) {
  if (!isSupabaseEnabled || !userId) return null;
  try {
    const { data } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', userId)
      .single();
    return data?.preferences?.theme || null;
  } catch {
    return null;
  }
}

async function saveThemeToSupabase(userId, theme) {
  if (!isSupabaseEnabled || !userId) return;
  try {
    const { data } = await supabase.from('users').select('preferences').eq('id', userId).single();
    const existing = data?.preferences || {};
    await supabase.from('users').update({ preferences: { ...existing, theme } }).eq('id', userId);
  } catch {
    // Silent fail — localStorage is the fallback
  }
}
// ─────────────────────────────────────────────────────────────────────────────

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    // Read from localStorage immediately to avoid flash
    const saved = localStorage.getItem('lib_theme');
    return saved ? saved === 'dark' : true;
  });

  const [currentUserId, setCurrentUserId] = useState(null);

  // Apply dark class to body on change
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

  // When user ID becomes available, load their saved preference from Supabase
  const syncUserTheme = useCallback(async (userId) => {
    if (!userId || userId === currentUserId) return;
    setCurrentUserId(userId);
    const supabaseTheme = await loadThemeFromSupabase(userId);
    if (supabaseTheme) {
      const isDark = supabaseTheme === 'dark';
      setDarkMode(isDark);
    }
  }, [currentUserId]);

  const toggleDarkMode = useCallback(async () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    // Persist to Supabase if in live mode
    if (currentUserId) {
      await saveThemeToSupabase(currentUserId, newMode ? 'dark' : 'light');
    }
  }, [darkMode, currentUserId]);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, syncUserTheme }}>
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

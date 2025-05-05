import { useState, useEffect } from 'react';

// Define theme type
export type Theme = 'light' | 'dark' | 'system';

// Theme CSS variables
export const themeColors = {
  light: {
    '--primary': 'rgba(59, 130, 246, 1)',
    '--primary-light': 'rgba(59, 130, 246, 0.1)',
    '--primary-dark': 'rgba(29, 78, 216, 1)',
    
    '--surface': 'rgba(255, 255, 255, 1)',
    '--surface-hover': 'rgba(249, 250, 251, 1)',
    '--surface-elevated': 'rgba(255, 255, 255, 1)',
    
    '--border': 'rgba(229, 231, 235, 1)',
    '--border-hover': 'rgba(209, 213, 219, 1)',
    
    '--text-primary': 'rgba(17, 24, 39, 1)',
    '--text-secondary': 'rgba(107, 114, 128, 1)',
    '--text-tertiary': 'rgba(156, 163, 175, 1)',
    '--text-on-primary': 'rgba(255, 255, 255, 1)',
    
    '--accent-red': 'rgba(239, 68, 68, 1)',
    '--accent-amber': 'rgba(245, 158, 11, 1)',
    '--accent-green': 'rgba(34, 197, 94, 1)',
    '--accent-blue': 'rgba(59, 130, 246, 1)',
    '--accent-purple': 'rgba(139, 92, 246, 1)',
    
    '--accent-red-light': 'rgba(254, 226, 226, 1)',
    '--accent-amber-light': 'rgba(254, 243, 199, 1)',
    '--accent-green-light': 'rgba(220, 252, 231, 1)',
    '--accent-blue-light': 'rgba(219, 234, 254, 1)',
    '--accent-purple-light': 'rgba(237, 233, 254, 1)',
    
    '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '--shadow': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    
    '--background': 'rgba(249, 250, 251, 1)',
    '--background-opaque': 'rgba(255, 255, 255, 0.8)',
    
    '--focus-ring': '0 0 0 3px rgba(59, 130, 246, 0.3)',
  },
  dark: {
    '--primary': 'rgba(96, 165, 250, 1)',
    '--primary-light': 'rgba(96, 165, 250, 0.2)',
    '--primary-dark': 'rgba(37, 99, 235, 1)',
    
    '--surface': 'rgba(30, 41, 59, 1)',
    '--surface-hover': 'rgba(51, 65, 85, 1)',
    '--surface-elevated': 'rgba(51, 65, 85, 1)',
    
    '--border': 'rgba(71, 85, 105, 1)',
    '--border-hover': 'rgba(100, 116, 139, 1)',
    
    '--text-primary': 'rgba(241, 245, 249, 1)',
    '--text-secondary': 'rgba(203, 213, 225, 1)',
    '--text-tertiary': 'rgba(148, 163, 184, 1)',
    '--text-on-primary': 'rgba(255, 255, 255, 1)',
    
    '--accent-red': 'rgba(248, 113, 113, 1)',
    '--accent-amber': 'rgba(251, 191, 36, 1)',
    '--accent-green': 'rgba(74, 222, 128, 1)',
    '--accent-blue': 'rgba(96, 165, 250, 1)',
    '--accent-purple': 'rgba(167, 139, 250, 1)',
    
    '--accent-red-light': 'rgba(127, 29, 29, 0.4)',
    '--accent-amber-light': 'rgba(120, 53, 15, 0.4)',
    '--accent-green-light': 'rgba(20, 83, 45, 0.4)',
    '--accent-blue-light': 'rgba(30, 58, 138, 0.4)',
    '--accent-purple-light': 'rgba(76, 29, 149, 0.4)',
    
    '--shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    '--shadow': '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
    '--shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    '--shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
    
    '--background': 'rgba(15, 23, 42, 1)',
    '--background-opaque': 'rgba(15, 23, 42, 0.8)',
    
    '--focus-ring': '0 0 0 3px rgba(96, 165, 250, 0.3)',
  }
};

/**
 * Apply theme to document root
 */
export function applyTheme(theme: 'light' | 'dark'): void {
  const root = document.documentElement;
  const colors = themeColors[theme];
  
  Object.entries(colors).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  
  // Set data-theme attribute
  root.setAttribute('data-theme', theme);
  
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * Custom hook for managing theme
 */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      return savedTheme || 'system';
    }
    return 'system';
  });
  
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };
  
  useEffect(() => {
    const applySystemTheme = () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(isDark ? 'dark' : 'light');
    };
    
    if (theme === 'system') {
      applySystemTheme();
      
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applySystemTheme();
      
      // Add listener for theme changes
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      applyTheme(theme);
    }
  }, [theme]);
  
  return [theme, setTheme];
}

/**
 * CSS utility functions
 */
export const cx = (...classes: (string | boolean | undefined | null)[]) => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Elevation shadows with consistent design
 */
export const elevation = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow',
  lg: 'shadow-md',
  xl: 'shadow-lg',
  // Special glass effect with backdrop blur
  glass: 'shadow-lg backdrop-blur-md bg-background-opaque'
}; 
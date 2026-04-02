import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

/** App uses a fixed dark theme only (no light mode or toggle). */
export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark: true }}>
      {children}
    </ThemeContext.Provider>
  );
};

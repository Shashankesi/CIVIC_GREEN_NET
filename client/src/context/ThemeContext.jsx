import React, { createContext, useEffect, useState } from 'react'

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('cgn_dark') === 'true';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem('cgn_dark', dark ? 'true' : 'false');
    } catch (e) {}
  }, [dark]);

  return <ThemeContext.Provider value={{ dark, setDark }}>{children}</ThemeContext.Provider>;
}

export default ThemeContext;

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "gray";

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  switchable = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem("synapse-theme") as Theme | null;
      if (stored === "light" || stored === "dark" || stored === "gray") return stored;
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "gray");
    if (theme === "dark") root.classList.add("dark");
    if (theme === "gray") root.classList.add("gray");
    if (switchable) localStorage.setItem("synapse-theme", theme);
  }, [theme, switchable]);

  const setTheme = (t: Theme) => setThemeState(t);

  // legacy toggleTheme compat
  return (
    <ThemeContext.Provider value={{ theme, setTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";

type Theme = "blue" | "green" | "orange" | "black";

const themes: Theme[] = ["blue", "green", "orange", "black"];
const THEME_STORAGE_KEY = "app-theme";
const NEXT_THEME_CHANGE_STORAGE_KEY = "app-theme-next-change";
const THEME_CHANGE_INTERVAL = 60 * 60 * 1000;

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return themes.find((theme) => theme === stored) ?? "blue";
}

function getRandomTheme(currentTheme: Theme): Theme {
  const availableThemes = themes.filter((theme) => theme !== currentTheme);
  return availableThemes[Math.floor(Math.random() * availableThemes.length)];
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const currentThemeRef = useRef(theme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const changeTheme = () => {
      const nextTheme = getRandomTheme(currentThemeRef.current);
      currentThemeRef.current = nextTheme;
      setThemeState(nextTheme);
      localStorage.setItem(
        NEXT_THEME_CHANGE_STORAGE_KEY,
        String(Date.now() + THEME_CHANGE_INTERVAL),
      );
      scheduleNextChange();
    };

    const scheduleNextChange = () => {
      clearTimeout(timeoutId);
      const storedNextChange = localStorage.getItem(
        NEXT_THEME_CHANGE_STORAGE_KEY,
      );
      const nextChange = storedNextChange ? Number(storedNextChange) : NaN;

      if (!Number.isFinite(nextChange)) {
        localStorage.setItem(
          NEXT_THEME_CHANGE_STORAGE_KEY,
          String(Date.now() + THEME_CHANGE_INTERVAL),
        );
        scheduleNextChange();
        return;
      }

      const delay = nextChange - Date.now();
      if (delay <= 0) {
        changeTheme();
        return;
      }

      timeoutId = setTimeout(changeTheme, delay);
    };

    scheduleNextChange();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleNextChange();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const setTheme = (newTheme: Theme) => {
    currentThemeRef.current = newTheme;
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

// app/utils/theme.ts
export type ThemeMode = "light" | "dark" | "system";

export interface ThemeSettings {
  mode: ThemeMode;
  primaryColor: string;
  fontSize: "small" | "medium" | "large";
}

export const DEFAULT_THEME: ThemeSettings = {
  mode: "light",
  primaryColor: "#4CAF50",
  fontSize: "medium",
};

export class ThemeManager {
  private static THEME_KEY = "app_theme_settings";
  private static listeners: Array<(theme: ThemeSettings) => void> = [];

  static getTheme(): ThemeSettings {
    if (typeof window === "undefined") {
      return DEFAULT_THEME;
    }

    const stored = localStorage.getItem(this.THEME_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_THEME;
      }
    }
    return DEFAULT_THEME;
  }

  static setTheme(theme: Partial<ThemeSettings>): void {
    if (typeof window === "undefined") return;

    const current = this.getTheme();
    const newTheme = { ...current, ...theme };
    localStorage.setItem(this.THEME_KEY, JSON.stringify(newTheme));

    this.listeners.forEach((listener) => listener(newTheme));
    this.applyTheme(newTheme);
  }

  static subscribe(listener: (theme: ThemeSettings) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static applyTheme(theme: ThemeSettings): void {
    const root = document.documentElement;

    // Apply mode
    if (
      theme.mode === "dark" ||
      (theme.mode === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      root.classList.add("dark-theme");
    } else {
      root.classList.remove("dark-theme");
    }

    // Apply primary color
    root.style.setProperty("--primary-color", theme.primaryColor);

    // Apply font size
    const fontSizeMap = {
      small: "14px",
      medium: "16px",
      large: "18px",
    };
    root.style.setProperty("--base-font-size", fontSizeMap[theme.fontSize]);
  }

  static initialize(): void {
    if (typeof window === "undefined") return;

    this.applyTheme(this.getTheme());

    // Listen for system theme changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        const theme = this.getTheme();
        if (theme.mode === "system") {
          this.applyTheme(theme);
        }
      });
  }
}

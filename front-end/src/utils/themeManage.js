// utils/themeManager.js
export class ThemeManager {
  constructor() {
    this.themeListeners = new Set();
    this.systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    this.init();
  }

  init() {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem("app_theme");
    const prefersDark = this.systemThemeQuery.matches;

    if (savedTheme) {
      this.applyTheme(savedTheme);
    } else {
      // Auto-detect system preference
      this.applyTheme(prefersDark ? "dark" : "light");
    }

    // Listen for system theme changes
    this.systemThemeQuery.addEventListener("change", (e) => {
      const theme = localStorage.getItem("app_theme");
      if (!theme || theme === "auto" || theme === "system") {
        this.applyTheme(e.matches ? "dark" : "light");
      }
    });
  }

  getAvailableThemes() {
    return ["light", "dark", "auto"];
  }

  getCurrentTheme() {
    return localStorage.getItem("app_theme") || "auto";
  }

  applyTheme(theme) {
    // Save preference
    localStorage.setItem("app_theme", theme);

    let actualTheme = theme;
    if (theme === "auto" || theme === "system") {
      actualTheme = this.systemThemeQuery.matches ? "dark" : "light";
    }

    // Apply to document
    document.documentElement.setAttribute("data-theme", actualTheme);
    document.documentElement.classList.add("theme-transition");

    // Notify listeners
    this.themeListeners.forEach((listener) => listener(actualTheme));

    // Remove transition class after animation
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 300);
  }

  subscribe(listener) {
    this.themeListeners.add(listener);
    return () => this.themeListeners.delete(listener);
  }

  isDarkMode() {
    const theme = this.getCurrentTheme();
    if (theme === "auto" || theme === "system") {
      return this.systemThemeQuery.matches;
    }
    return theme === "dark";
  }
}

// Singleton instance
export const themeManager = new ThemeManager();

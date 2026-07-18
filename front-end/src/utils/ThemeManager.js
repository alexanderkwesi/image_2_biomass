// utils/ThemeManager.js
import BrowserStorage from "./BrowserStorage";

export default class ThemeManager {
  static THEMES = {
    LIGHT: "light",
    DARK: "dark",
    GREEN: "green",
    BLUE: "blue",
  };

  // Get current theme
  static getTheme() {
    const theme = BrowserStorage.getItem("theme");
    return theme || this.THEMES.LIGHT;
  }

  // Set theme
  static setTheme(theme) {
    if (Object.values(this.THEMES).includes(theme)) {
      BrowserStorage.setItem("theme", theme);

      // Update CSS custom properties for web
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", theme);
      }

      // Dispatch custom event for same-tab listeners
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("themeChanged"));
      }

      return true;
    }
    return false;
  }

  // Get theme colors
  static getThemeColors() {
    const theme = this.getTheme();

    const themes = {
      light: {
        primary: "#4CAF50",
        secondary: "#FF9800",
        background: "#ffffff",
        card: "#f8f9fa",
        text: "#333333",
        textSecondary: "#666666",
        header: "#4CAF50",
        border: "#e0e0e0",
      },
      dark: {
        primary: "#66BB6A",
        secondary: "#FFB74D",
        background: "#121212",
        card: "#1e1e1e",
        text: "#ffffff",
        textSecondary: "#b0b0b0",
        header: "#1e1e1e",
        border: "#333333",
      },
      green: {
        primary: "#2E7D32",
        secondary: "#8BC34A",
        background: "#f1f8e9",
        card: "#ffffff",
        text: "#1B5E20",
        textSecondary: "#4CAF50",
        header: "#2E7D32",
        border: "#C8E6C9",
      },
      blue: {
        primary: "#2196F3",
        secondary: "#03A9F4",
        background: "#E3F2FD",
        card: "#ffffff",
        text: "#0D47A1",
        textSecondary: "#2196F3",
        header: "#2196F3",
        border: "#BBDEFB",
      },
    };

    return themes[theme] || themes.light;
  }
}

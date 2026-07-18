// hooks/useTheme.ts
import { useState, useEffect, useCallback } from "react";
import { Storage, StorageKeys } from "../utils/storage";

// Type definitions
export type ThemeType = "light" | "dark" | "system";

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  divider: string;
  overlay: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  shadow: string;
  hover: string;
  active: string;
}

export interface UseThemeReturn {
  theme: ThemeType;
  appliedTheme: "light" | "dark";
  systemTheme: "light" | "dark";
  themeColors: ThemeColors;
  changeTheme: (newTheme: ThemeType) => void;
  toggleTheme: () => void;
  resetToSystem: () => void;
  isSystemTheme: boolean;
  getColor: (colorName: keyof ThemeColors) => string;
}

// Predefined color palettes
const LIGHT_COLORS: ThemeColors = {
  primary: "#4CAF50",
  primaryLight: "rgba(76, 175, 80, 0.1)",
  primaryDark: "#388E3C",
  secondary: "#FF9800",
  background: "#f8f9fa",
  surface: "#FFFFFF",
  textPrimary: "#212529",
  textSecondary: "#6c757d",
  border: "#dee2e6",
  divider: "#e9ecef",
  overlay: "rgba(0, 0, 0, 0.5)",
  success: "#28a745",
  warning: "#ffc107",
  error: "#dc3545",
  info: "#17a2b8",
  shadow: "rgba(0, 0, 0, 0.15)",
  hover: "rgba(0, 0, 0, 0.04)",
  active: "rgba(0, 0, 0, 0.08)",
};

const DARK_COLORS: ThemeColors = {
  primary: "#66BB6A",
  primaryLight: "rgba(102, 187, 106, 0.2)",
  primaryDark: "#388E3C",
  secondary: "#FFB74D",
  background: "#121212",
  surface: "#1e1e1e",
  textPrimary: "#f8f9fa",
  textSecondary: "#adb5bd",
  border: "#495057",
  divider: "#343a40",
  overlay: "rgba(0, 0, 0, 0.7)",
  success: "#28a745",
  warning: "#ffc107",
  error: "#dc3545",
  info: "#17a2b8",
  shadow: "rgba(0, 0, 0, 0.3)",
  hover: "rgba(255, 255, 255, 0.05)",
  active: "rgba(255, 255, 255, 0.1)",
};

// Get theme colors based on applied theme
const getThemeColors = (appliedTheme: "light" | "dark"): ThemeColors => {
  return appliedTheme === "light" ? LIGHT_COLORS : DARK_COLORS;
};

// Apply theme to CSS custom properties
const applyThemeToCSS = (appliedTheme: "light" | "dark"): void => {
  if (typeof document === "undefined") return;
  
  const colors = getThemeColors(appliedTheme);
  const root = document.documentElement;
  
  // Set CSS custom properties
  Object.entries(colors).forEach(([key, value]) => {
    const cssVarName = `--color-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
    root.style.setProperty(cssVarName, value);
  });
  
  // Set theme attribute for CSS selectors
  root.setAttribute("data-theme", appliedTheme);
  
  // Update meta theme-color for mobile browsers
  updateMetaThemeColor(colors.primary);
};

// Update meta theme-color tag
const updateMetaThemeColor = (color: string): void => {
  if (typeof document === "undefined") return;
  
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }
  
  metaThemeColor.setAttribute('content', color);
};

// Detect system theme preference
const useSystemTheme = (): "light" | "dark" => {
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light");
    };

    // Initial check
    updateSystemTheme();

    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } 
    // Legacy browsers
    else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return systemTheme;
};

export const useTheme = (): UseThemeReturn => {
  const [theme, setThemeState] = useState<ThemeType>("light");
  const [appliedTheme, setAppliedTheme] = useState<"light" | "dark">("light");
  const systemTheme = useSystemTheme();

  // Load initial theme from storage
  useEffect(() => {
    try {
      const savedTheme = Storage.getItem(StorageKeys.THEME, "system");
      
      // Validate saved theme
      if (["light", "dark", "system"].includes(savedTheme)) {
        setThemeState(savedTheme as ThemeType);
      } else {
        setThemeState("system");
        Storage.setItem(StorageKeys.THEME, "system");
      }
    } catch (error) {
      console.error("Error loading theme from storage:", error);
      setThemeState("system");
    }
  }, []);

  // Determine applied theme based on theme preference and system theme
  useEffect(() => {
    let newAppliedTheme: "light" | "dark";
    
    if (theme === "system") {
      newAppliedTheme = systemTheme;
    } else {
      newAppliedTheme = theme;
    }
    
    if (newAppliedTheme !== appliedTheme) {
      setAppliedTheme(newAppliedTheme);
      applyThemeToCSS(newAppliedTheme);
    }
  }, [theme, systemTheme, appliedTheme]);

  // Listen for theme changes from other tabs/components
  useEffect(() => {
    const handleThemeChange = (event: CustomEvent) => {
      if (event.detail?.theme && ["light", "dark", "system"].includes(event.detail.theme)) {
        const newTheme = event.detail.theme as ThemeType;
        setThemeState(newTheme);
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === StorageKeys.THEME && event.newValue) {
        const newTheme = event.newValue.replace(/"/g, '') as ThemeType;
        if (["light", "dark", "system"].includes(newTheme)) {
          setThemeState(newTheme);
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("themeChanged", handleThemeChange as EventListener);
      window.addEventListener("storage", handleStorageChange);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("themeChanged", handleThemeChange as EventListener);
        window.removeEventListener("storage", handleStorageChange);
      }
    };
  }, []);

  // Change theme function
  const changeTheme = useCallback((newTheme: ThemeType) => {
    if (!["light", "dark", "system"].includes(newTheme)) {
      console.error(`Invalid theme: ${newTheme}`);
      return;
    }

    try {
      setThemeState(newTheme);
      Storage.setItem(StorageKeys.THEME, newTheme);

      // Apply theme to document immediately
      const themeToApply = newTheme === "system" ? systemTheme : newTheme;
      setAppliedTheme(themeToApply);
      applyThemeToCSS(themeToApply);

      // Dispatch event for other components
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("themeChanged", { 
            detail: { 
              theme: newTheme,
              appliedTheme: themeToApply,
              systemTheme 
            } 
          })
        );
      }

      // Dispatch storage event for other tabs
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: StorageKeys.THEME,
          newValue: JSON.stringify(newTheme),
          oldValue: JSON.stringify(theme),
          storageArea: localStorage
        })
      );
    } catch (error) {
      console.error("Error changing theme:", error);
    }
  }, [theme, systemTheme]);

  // Toggle between light and dark themes
  const toggleTheme = useCallback(() => {
    if (theme === "system") {
      // If using system theme, switch to opposite of current applied theme
      changeTheme(appliedTheme === "light" ? "dark" : "light");
    } else if (theme === "light") {
      changeTheme("dark");
    } else if (theme === "dark") {
      changeTheme("light");
    }
  }, [theme, appliedTheme, changeTheme]);

  // Reset to system theme
  const resetToSystem = useCallback(() => {
    changeTheme("system");
  }, [changeTheme]);

  // Get specific color value
  const getColor = useCallback((colorName: keyof ThemeColors): string => {
    return getThemeColors(appliedTheme)[colorName];
  }, [appliedTheme]);

  return {
    theme,
    appliedTheme,
    systemTheme,
    themeColors: getThemeColors(appliedTheme),
    changeTheme,
    toggleTheme,
    resetToSystem,
    isSystemTheme: theme === "system",
    getColor,
  };
};

// Hook for theme-aware styling
export const useThemeStyles = () => {
  const { themeColors } = useTheme();
  
  return {
    colors: themeColors,
    
    // Common style helpers
    text: {
      primary: { color: themeColors.textPrimary },
      secondary: { color: themeColors.textSecondary },
      light: { color: "#ffffff" },
      dark: { color: "#212529" },
    },
    
    background: {
      primary: { backgroundColor: themeColors.primary },
      surface: { backgroundColor: themeColors.surface },
      background: { backgroundColor: themeColors.background },
    },
    
    border: {
      default: { borderColor: themeColors.border, borderWidth: 1 },
      primary: { borderColor: themeColors.primary, borderWidth: 1 },
      error: { borderColor: themeColors.error, borderWidth: 1 },
    },
    
    shadow: {
      small: {
        shadowColor: themeColors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
      },
      medium: {
        shadowColor: themeColors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
      large: {
        shadowColor: themeColors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
      },
    },
    
    // Component-specific styles
    button: {
      primary: {
        backgroundColor: themeColors.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 6,
        alignItems: "center",
      },
      outline: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: themeColors.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 6,
        alignItems: "center",
      },
    },
    
    card: {
      default: {
        backgroundColor: themeColors.surface,
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: themeColors.border,
      },
      elevated: {
        backgroundColor: themeColors.surface,
        borderRadius: 8,
        padding: 16,
        ...(typeof window !== "undefined" ? {
          boxShadow: `0 2px 4px ${themeColors.shadow}`,
        } : {}),
      },
    },
    
    input: {
      default: {
        backgroundColor: themeColors.surface,
        borderWidth: 1,
        borderColor: themeColors.border,
        borderRadius: 6,
        padding: 12,
        color: themeColors.textPrimary,
        fontSize: 16,
      },
      focused: {
        borderColor: themeColors.primary,
        borderWidth: 2,
      },
      error: {
        borderColor: themeColors.error,
      },
    },
  };
};

// JavaScript version (without TypeScript)
export const useThemeJS = () => {
  const [theme, setTheme] = useState("light");
  const [appliedTheme, setAppliedTheme] = useState("light");

  useEffect(() => {
    const savedTheme = Storage.getItem(StorageKeys.THEME, "light");
    setTheme(savedTheme);
    setAppliedTheme(savedTheme);
    applyThemeToCSS(savedTheme);
  }, []);

  const changeTheme = (newTheme) => {
    if (["light", "dark", "system"].includes(newTheme)) {
      setTheme(newTheme);
      const themeToApply = newTheme === "system" ? "light" : newTheme; // Simplified
      setAppliedTheme(themeToApply);
      Storage.setItem(StorageKeys.THEME, newTheme);
      applyThemeToCSS(themeToApply);
      
      window.dispatchEvent(
        new CustomEvent("themeChanged", { detail: { theme: newTheme } })
      );
    }
  };

  const toggleTheme = () => {
    changeTheme(theme === "light" ? "dark" : "light");
  };

  return {
    theme,
    appliedTheme,
    changeTheme,
    toggleTheme,
    themeColors: getThemeColors(appliedTheme),
  };
};
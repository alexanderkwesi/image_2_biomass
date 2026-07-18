// types/settings.ts - Enhanced for React Web
export interface SettingItem {
  id: string;
  title: string;
  description?: string;
  type:
    | "toggle"
    | "select"
    | "slider"
    | "button"
    | "link"
    | "info"
    | "text"
    | "number"
    | "color"
    | "file";
  value?: any;
  options?: Array<{
    label: string;
    value: any;
    icon?: string;
    disabled?: boolean;
  }>;
  min?: number;
  max?: number;
  step?: number;
  action?: () => void | Promise<void>;
  href?: string;
  target?: "_blank" | "_self" | "_parent" | "_top";
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    custom?: (value: any) => boolean;
  };
  icon?: string;
  trailingIcon?: string;
  category?: string;
  group?: string;
  order?: number;
  dependencies?: string[]; // IDs of settings this depends on
  hidden?: boolean;
  advanced?: boolean;
}

export interface SettingsCategory {
  id: string;
  title: string;
  icon: string;
  description: string;
  features: SettingItem[];
  order?: number;
  badge?: {
    text: string;
    variant: "info" | "warning" | "success" | "error" | "default";
  };
  requiresAuth?: boolean;
  requiresFeature?: string; // Feature flag required to show this category
  permissions?: string[]; // User permissions required to access this category
}

export interface SettingsGroup {
  id: string;
  title: string;
  description?: string;
  settings: SettingItem[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface AppSettings {
  // Theme & Appearance
  theme: "light" | "dark" | "auto" | "system";
  colorScheme?: string;
  accentColor?: string;
  fontSize: "small" | "medium" | "large" | "x-large";
  fontFamily?: string;
  density: "compact" | "comfortable" | "spacious";
  animations: boolean;
  reduceMotion: boolean;
  highContrast: boolean;

  // Notifications
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  predictionAlerts: boolean;
  farmAlerts: boolean;
  marketAlerts: boolean;
  weatherAlerts: boolean;
  notificationSound: boolean;
  notificationVibration: boolean;
  notificationSchedule: {
    start: string; // "09:00"
    end: string; // "18:00"
  };

  // Privacy & Security
  privacyMode: boolean;
  dataCollection: boolean;
  analyticsOptIn: boolean;
  locationSharing: boolean;
  autoLogout: boolean;
  autoLogoutMinutes: number;
  twoFactorAuth: boolean;
  biometricAuth: boolean;
  sessionTimeout: number;

  // Data & Storage
  autoSync: boolean;
  syncInterval: number; // minutes
  dataRetention: "7days" | "30days" | "90days" | "1year" | "forever";
  cacheSize: number; // MB
  clearCacheOnExit: boolean;
  backupFrequency: "daily" | "weekly" | "monthly";
  exportFormat: "json" | "csv" | "pdf";

  // Language & Region
  language: string;
  region: string;
  timezone: string;
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  timeFormat: "12h" | "24h";
  temperatureUnit: "celsius" | "fahrenheit";
  measurementUnit: "metric" | "imperial";
  currency: string;

  // Accessibility
  screenReader: boolean;
  keyboardNavigation: boolean;
  focusHighlight: boolean;
  textToSpeech: boolean;
  captions: boolean;
  zoomLevel: number;

  // Performance
  imageQuality: "low" | "medium" | "high" | "original";
  imageCompression: number; // 0-100
  offlineMode: boolean;
  lazyLoading: boolean;
  prefetchData: boolean;
  backgroundSync: boolean;

  // Network
  autoDownloadUpdates: boolean;
  wifiOnlyDownloads: boolean;
  cellularDataWarning: boolean;
  requestTimeout: number; // seconds

  // Features & Preferences
  autoSave: boolean;
  saveInterval: number; // seconds
  defaultView: "list" | "grid" | "map";
  defaultFarm?: string;
  defaultCamera: "back" | "front" | "auto";
  defaultUploadQuality: "balanced" | "quality" | "size";
  quickActions: boolean;
  tutorialCompleted: boolean;
  showTips: boolean;

  // Developer (hidden by default)
  developerMode?: boolean;
  debugLogging?: boolean;
  apiEndpoint?: string;
  mockResponses?: boolean;
  performanceMonitoring?: boolean;
}

export interface SettingsState {
  currentSettings: AppSettings;
  defaultSettings: AppSettings;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error?: string;
  lastSaved?: Date;
  categories: SettingsCategory[];
  groups: SettingsGroup[];
  validationErrors: Record<string, string>;
}

export interface SettingsUpdate {
  key: keyof AppSettings;
  value: any;
  category?: string;
  group?: string;
}

export interface SettingsValidationRule {
  key: keyof AppSettings;
  validator: (value: any) => boolean;
  message: string;
}

export interface SettingsPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  settings: Partial<AppSettings>;
  category: string;
}

// Export settings presets for quick apply
export const SETTINGS_PRESETS: SettingsPreset[] = [
  {
    id: "default",
    name: "Default",
    description: "Recommended settings for most users",
    icon: "⭐",
    settings: {
      theme: "auto",
      fontSize: "medium",
      density: "comfortable",
      animations: true,
      autoSave: true,
      autoSync: true,
    },
    category: "general",
  },
  {
    id: "performance",
    name: "Performance",
    description: "Optimized for speed and battery life",
    icon: "⚡",
    settings: {
      theme: "light",
      animations: false,
      imageQuality: "medium",
      lazyLoading: true,
      offlineMode: true,
      reduceMotion: true,
    },
    category: "performance",
  },
  {
    id: "accessibility",
    name: "Accessibility",
    description: "Enhanced accessibility features",
    icon: "♿",
    settings: {
      fontSize: "large",
      highContrast: true,
      screenReader: true,
      keyboardNavigation: true,
      focusHighlight: true,
      reduceMotion: true,
    },
    category: "accessibility",
  },
  {
    id: "privacy",
    name: "Privacy Focused",
    description: "Maximum privacy and data control",
    icon: "🔒",
    settings: {
      privacyMode: true,
      dataCollection: false,
      analyticsOptIn: false,
      locationSharing: false,
      autoLogout: true,
      autoLogoutMinutes: 5,
      clearCacheOnExit: true,
    },
    category: "privacy",
  },
];

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  theme: "auto",
  fontSize: "medium",
  density: "comfortable",
  animations: true,
  reduceMotion: false,
  highContrast: false,
  pushNotifications: true,
  emailNotifications: true,
  smsNotifications: false,
  predictionAlerts: true,
  farmAlerts: true,
  marketAlerts: false,
  weatherAlerts: true,
  notificationSound: true,
  notificationVibration: true,
  notificationSchedule: {
    start: "09:00",
    end: "18:00",
  },
  privacyMode: false,
  dataCollection: true,
  analyticsOptIn: true,
  locationSharing: true,
  autoLogout: true,
  autoLogoutMinutes: 30,
  twoFactorAuth: false,
  biometricAuth: false,
  sessionTimeout: 30,
  autoSync: true,
  syncInterval: 15,
  dataRetention: "90days",
  cacheSize: 100,
  clearCacheOnExit: false,
  backupFrequency: "weekly",
  exportFormat: "pdf",
  language: "en",
  region: "US",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
  temperatureUnit: "celsius",
  measurementUnit: "metric",
  currency: "USD",
  screenReader: false,
  keyboardNavigation: true,
  focusHighlight: true,
  textToSpeech: false,
  captions: false,
  zoomLevel: 100,
  imageQuality: "medium",
  imageCompression: 80,
  offlineMode: false,
  lazyLoading: true,
  prefetchData: true,
  backgroundSync: true,
  autoDownloadUpdates: true,
  wifiOnlyDownloads: false,
  cellularDataWarning: true,
  requestTimeout: 30,
  autoSave: true,
  saveInterval: 30,
  defaultView: "grid",
  defaultCamera: "auto",
  defaultUploadQuality: "balanced",
  quickActions: true,
  tutorialCompleted: false,
  showTips: true,
};

// Settings categories for UI organization
export const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    id: "general",
    title: "General",
    icon: "⚙️",
    description: "General application settings",
    order: 1,
    features: [],
  },
  {
    id: "appearance",
    title: "Appearance",
    icon: "🎨",
    description: "Customize look and feel",
    order: 2,
    features: [],
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: "🔔",
    description: "Manage alerts and notifications",
    order: 3,
    features: [],
  },
  {
    id: "privacy",
    title: "Privacy & Security",
    icon: "🔒",
    description: "Privacy and security settings",
    order: 4,
    features: [],
  },
  {
    id: "data",
    title: "Data & Storage",
    icon: "💾",
    description: "Data management and storage",
    order: 5,
    features: [],
  },
  {
    id: "accessibility",
    title: "Accessibility",
    icon: "♿",
    description: "Accessibility features",
    order: 6,
    features: [],
  },
  {
    id: "performance",
    title: "Performance",
    icon: "⚡",
    description: "Performance optimization",
    order: 7,
    features: [],
  },
  {
    id: "network",
    title: "Network",
    icon: "🌐",
    description: "Network and connection settings",
    order: 8,
    features: [],
  },
  {
    id: "advanced",
    title: "Advanced",
    icon: "🔧",
    description: "Advanced settings for power users",
    order: 9,
    advanced: true,
    features: [],
  },
  {
    id: "about",
    title: "About",
    icon: "ℹ️",
    description: "About this application",
    order: 10,
    features: [],
  },
];

// Helper types for settings operations
export type SettingsKey = keyof AppSettings;
export type SettingsValue<T extends SettingsKey> = AppSettings[T];

// Utility function type for settings validation
export type SettingsValidator = (
  key: SettingsKey,
  value: any
) => {
  valid: boolean;
  message?: string;
};

// Event types for settings changes
export interface SettingsChangeEvent {
  key: SettingsKey;
  oldValue: any;
  newValue: any;
  source: "user" | "system" | "preset";
  timestamp: Date;
}

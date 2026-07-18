// config.js - Application configuration for React Web
export const CONFIG = {
  // API Configuration
  API: {
    BASE_URL: process.env.REACT_APP_API_URL || "http://localhost:8000",
    TIMEOUT: 30000,
    UPLOAD_TIMEOUT: 60000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
  },

  // Image Configuration
  IMAGE: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    QUALITY: 0.8,
    MAX_WIDTH: 1920,
    MAX_HEIGHT: 1080,
    THUMBNAIL_WIDTH: 320,
    THUMBNAIL_HEIGHT: 240,
    SUPPORTED_FORMATS: [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ],
    SUPPORTED_MIME_TYPES: [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ],
  },

  // File Upload Configuration
  UPLOAD: {
    CHUNK_SIZE: 1024 * 1024, // 1MB chunks for large files
    MAX_CONCURRENT_UPLOADS: 3,
    ALLOW_MULTIPLE: true,
    ACCEPT: ".jpg,.jpeg,.png,.webp,.gif",
  },

  // Camera/Webcam Configuration
  WEBCAM: {
    FACING_MODE: "environment", // 'user' for front camera, 'environment' for back camera
    ASPECT_RATIO: 16 / 9,
    RESOLUTION: {
      width: 1280,
      height: 720,
    },
    CONSTRAINTS: {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: { ideal: "environment" },
      },
    },
  },

  // Screen Capture Configuration
  SCREEN_CAPTURE: {
    VIDEO_CONSTRAINTS: {
      video: {
        cursor: "always",
        displaySurface: "window",
      },
    },
    AUDIO_CONSTRAINTS: false,
  },

  // Validation Configuration
  VALIDATION: {
    MIN_RESOLUTION: {
      width: 640,
      height: 480,
    },
    MAX_BLUR_THRESHOLD: 100,
    MIN_LIGHTING: 0.3,
    MAX_LIGHTING: 0.7,
    FILE_TYPES: /(\.jpg|\.jpeg|\.png|\.webp|\.gif)$/i,
  },

  // App Features
  FEATURES: {
    OFFLINE_MODE: process.env.REACT_APP_FEATURE_OFFLINE_MODE === "true",
    ANALYTICS: process.env.REACT_APP_FEATURE_ANALYTICS === "true",
    FARM_MANAGEMENT: process.env.REACT_APP_FEATURE_FARMS === "true",
    MULTI_LANGUAGE: process.env.REACT_APP_FEATURE_MULTI_LANGUAGE === "true",
    PWA: process.env.REACT_APP_FEATURE_PWA === "true",
    SERVICE_WORKER: process.env.REACT_APP_FEATURE_SERVICE_WORKER === "true",
    NOTIFICATIONS: process.env.REACT_APP_FEATURE_NOTIFICATIONS === "true",
    GEOLOCATION: process.env.REACT_APP_FEATURE_GEOLOCATION === "true",
  },

  // Analytics
  ANALYTICS: {
    ENABLED: process.env.REACT_APP_ANALYTICS_ENABLED === "true",
    ID: process.env.REACT_APP_ANALYTICS_ID,
    PROVIDER: process.env.REACT_APP_ANALYTICS_PROVIDER || "google", // 'google', 'mixpanel', 'amplitude'
  },

  // Map Configuration
  MAP: {
    API_KEY: process.env.REACT_APP_MAP_API_KEY,
    PROVIDER: process.env.REACT_APP_MAP_PROVIDER || "google", // 'google', 'mapbox', 'leaflet'
    DEFAULT_ZOOM: 14,
    MAX_ZOOM: 18,
    MIN_ZOOM: 8,
    DEFAULT_CENTER: {
      lat: 0,
      lng: 0,
    },
  },

  // Storage Configuration (Web-specific)
  STORAGE: {
    LOCAL_STORAGE_KEY: "farm_assistant_app",
    SESSION_STORAGE_KEY: "farm_session",
    INDEXED_DB_NAME: "FarmAssistantDB",
    INDEXED_DB_VERSION: 1,
    MAX_STORAGE_SIZE: 50 * 1024 * 1024, // 50MB
  },

  // Cache Configuration
  CACHE: {
    PREDICTION_TTL: 3600, // 1 hour in seconds
    IMAGE_TTL: 86400, // 24 hours in seconds
    USER_DATA_TTL: 1800, // 30 minutes in seconds
    API_RESPONSE_TTL: 300, // 5 minutes in seconds
    MAX_CACHE_SIZE: 100, // Max number of cached items
  },

  // Performance
  PERFORMANCE: {
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 1000,
    LAZY_LOAD_THRESHOLD: 0.8,
    VIRTUAL_SCROLL_THRESHOLD: 50,
    IMAGE_LAZY_LOADING: true,
    CODE_SPLITTING: true,
  },

  // UI/UX Configuration
  UI: {
    THEME_TRANSITION_DURATION: 300,
    TOAST_DURATION: 5000,
    MODAL_ANIMATION_DURATION: 300,
    SIDEBAR_WIDTH: 280,
    HEADER_HEIGHT: 64,
    MOBILE_BREAKPOINT: 768,
    TABLET_BREAKPOINT: 1024,
  },

  // Security
  SECURITY: {
    JWT_STORAGE_KEY: "auth_token",
    REFRESH_TOKEN_STORAGE_KEY: "refresh_token",
    TOKEN_REFRESH_THRESHOLD: 300, // Refresh token 5 minutes before expiry
    XSS_PROTECTION: true,
    CSP_ENABLED: process.env.REACT_APP_CSP_ENABLED === "true",
  },

  // Error Handling
  ERROR: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    SHOW_USER_FRIENDLY: true,
    LOG_TO_SERVER: process.env.REACT_APP_LOG_ERRORS === "true",
  },
};

// Environment detection
export const ENV = {
  IS_DEV: process.env.NODE_ENV === "development",
  IS_PROD: process.env.NODE_ENV === "production",
  IS_TEST: process.env.NODE_ENV === "test",
  IS_LOCAL:
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1",
  IS_HTTPS: window.location.protocol === "https:",
};

// API Endpoints configuration
export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    REFRESH: "/api/auth/refresh",
    LOGOUT: "/api/auth/logout",
    ME: "/api/auth/me",
    FORGOT_PASSWORD: "/api/auth/forgot-password",
    RESET_PASSWORD: "/api/auth/reset-password",
  },
  IMAGES: {
    UPLOAD: "/api/images/upload",
    VALIDATE: "/api/images/validate",
    PROCESS: "/api/images/process",
    DELETE: "/api/images/{id}",
    LIST: "/api/images",
  },
  PREDICTIONS: {
    CREATE: "/api/predictions",
    GET: "/api/predictions/{id}",
    LIST: "/api/predictions",
    HISTORY: "/api/predictions/history",
    DELETE: "/api/predictions/{id}",
    BATCH: "/api/predictions/batch",
  },
  USER: {
    PROFILE: "/api/users/profile",
    UPDATE_PROFILE: "/api/users/profile",
    PREFERENCES: "/api/users/preferences",
    STATS: "/api/users/stats",
    UPLOAD_AVATAR: "/api/users/avatar",
  },
  FARMS: {
    BASE: "/api/farms",
    LIST: "/api/farms",
    GET: "/api/farms/{id}",
    CREATE: "/api/farms",
    UPDATE: "/api/farms/{id}",
    DELETE: "/api/farms/{id}",
    STATS: "/api/farms/stats",
    PREDICTIONS: "/api/farms/{id}/predictions",
    ACTIVITY: "/api/farms/{id}/activity",
  },
  REPORTS: {
    GENERATE: "/api/reports/generate",
    DOWNLOAD: "/api/reports/{id}/download",
    LIST: "/api/reports",
  },
  ANALYTICS: {
    USAGE: "/api/analytics/usage",
    PERFORMANCE: "/api/analytics/performance",
    ERRORS: "/api/analytics/errors",
  },
};

// Helper function to build endpoint URLs
export const buildEndpoint = (endpoint, params = {}) => {
  let url = endpoint;

  // Replace path parameters
  Object.keys(params).forEach((key) => {
    url = url.replace(`{${key}}`, encodeURIComponent(params[key]));
  });

  return url;
};

// Default values
export const DEFAULTS = {
  USER: {
    FIRST_NAME: "Farmer",
    LAST_NAME: "User",
    MEASUREMENT_UNIT: "metric", // 'metric' or 'imperial'
    LANGUAGE: "en",
    THEME: "light", // 'light', 'dark', 'auto'
    TIMEZONE: Intl.DateTimeFormat().resolvedOptions().timeZone,
    CURRENCY: "USD",
  },
  FARM: {
    NAME: "My Farm",
    AREA_HECTARES: 10,
    AREA_UNIT: "hectares", // 'hectares', 'acres'
    SOIL_TYPE: "Loam",
    PASTURE_TYPE: "Mixed",
    IS_ACTIVE: true,
    LOCATION: {
      lat: 0,
      lng: 0,
    },
  },
  PREDICTION: {
    CONFIDENCE_THRESHOLD: 0.7,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    AUTO_SAVE: true,
    SAVE_DRAFT_INTERVAL: 30000, // 30 seconds
  },
  UI: {
    SIDEBAR_COLLAPSED: false,
    DENSITY: "comfortable", // 'compact', 'comfortable', 'spacious'
    ANIMATIONS_ENABLED: true,
    REDUCE_MOTION: false,
  },
};

// Feature flags for A/B testing or gradual rollouts
export const FEATURE_FLAGS = {
  NEW_UPLOAD_UI: process.env.REACT_APP_FEATURE_NEW_UPLOAD_UI === "true",
  ADVANCED_ANALYTICS:
    process.env.REACT_APP_FEATURE_ADVANCED_ANALYTICS === "true",
  AI_SUGGESTIONS: process.env.REACT_APP_FEATURE_AI_SUGGESTIONS === "true",
  REAL_TIME_UPDATES: process.env.REACT_APP_FEATURE_REAL_TIME_UPDATES === "true",
  EXPORT_PDF: process.env.REACT_APP_FEATURE_EXPORT_PDF === "true",
};

// Localization configuration
export const LOCALIZATION = {
  DEFAULT_LANGUAGE: "en",
  SUPPORTED_LANGUAGES: ["en", "es", "fr", "de", "pt", "zh"],
  FALLBACK_LANGUAGE: "en",
  DETECT_BROWSER_LANGUAGE: true,
};

// Export configuration checker for development
export const validateConfig = () => {
  const warnings = [];
  const errors = [];

  // Check required environment variables
  if (!process.env.REACT_APP_API_URL && ENV.IS_PROD) {
    warnings.push("REACT_APP_API_URL is not set. Using default localhost.");
  }

  if (CONFIG.FEATURES.ANALYTICS && !CONFIG.ANALYTICS.ID) {
    warnings.push("Analytics is enabled but no analytics ID is configured.");
  }

  if (CONFIG.FEATURES.GEOLOCATION && !ENV.IS_HTTPS) {
    warnings.push("Geolocation requires HTTPS for best results.");
  }

  // Log warnings and errors in development
  if (ENV.IS_DEV) {
    if (warnings.length > 0) {
      console.warn("Configuration warnings:", warnings);
    }
    if (errors.length > 0) {
      console.error("Configuration errors:", errors);
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
};

// Initialize config validation in development
if (ENV.IS_DEV) {
  validateConfig();
}

export default CONFIG;

// Determine the base URL based on environment
const getBaseUrl = () => {
  // In development, use localhost
  if (process.env.NODE_ENV === "development") {
    return process.env.REACT_APP_API_URL || "http://localhost:8000";
  }

  // In production, use the deployed API URL
  // You can set this via environment variable REACT_APP_API_URL
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Fallback: try to determine from current host
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;

    // If we're on localhost, use local API
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8000";
    }

    // For web deployment, use same host with API path
    // Assuming API is on same domain but different port or path
    // You can customize this based on your deployment setup
    return `${protocol}//${hostname}:8000`; // or `${protocol}//${hostname}/api`
  }

  // Default fallback
  return "http://localhost:8000";
};

const BASE_URL = getBaseUrl();

// WebSocket configuration (if needed for real-time features)
export const WEBSOCKET_CONFIG = {
  BASE_WS_URL: BASE_URL.replace("http", "ws"),
  RECONNECT_INTERVAL: 5000,
  MAX_RECONNECT_ATTEMPTS: 10,
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${BASE_URL}/auth/login`,
    REGISTER: `${BASE_URL}/auth/register`,
    REFRESH: `${BASE_URL}/auth/refresh`,
    ME: `${BASE_URL}/auth/me`,
    LOGOUT: `${BASE_URL}/auth/logout`,
    RESET_PASSWORD: `${BASE_URL}/auth/reset-password`,
    VERIFY_EMAIL: `${BASE_URL}/auth/verify-email`,
  },
  IMAGES: {
    UPLOAD: `${BASE_URL}/images/upload`,
    VALIDATE: `${BASE_URL}/images/validate`,
    PROCESS: `${BASE_URL}/images/process`,
    // Additional image endpoints for web
    GET_UPLOADS: `${BASE_URL}/images/uploads`,
    DELETE: `${BASE_URL}/images/delete`,
    BATCH_UPLOAD: `${BASE_URL}/images/batch-upload`,
  },
  PREDICTIONS: {
    CREATE: `${BASE_URL}/predictions/create`,
    GET: `${BASE_URL}/predictions`,
    HISTORY: `${BASE_URL}/predictions/history`,
    // Additional prediction endpoints for web
    BATCH_PREDICT: `${BASE_URL}/predictions/batch`,
    GET_BY_ID: (id) => `${BASE_URL}/predictions/${id}`,
    DELETE: (id) => `${BASE_URL}/predictions/${id}`,
    EXPORT: `${BASE_URL}/predictions/export`,
    STATS: `${BASE_URL}/predictions/stats`,
  },
  USER: {
    PROFILE: `${BASE_URL}/user/profile`,
    PREFERENCES: `${BASE_URL}/user/preferences`,
    // Additional user endpoints for web
    UPDATE_PROFILE: `${BASE_URL}/user/profile`,
    CHANGE_PASSWORD: `${BASE_URL}/user/change-password`,
    UPLOAD_AVATAR: `${BASE_URL}/user/avatar`,
    GET_ACTIVITY: `${BASE_URL}/user/activity`,
    DELETE_ACCOUNT: `${BASE_URL}/user/delete`,
  },
  FARMS: {
    BASE: `${BASE_URL}/farms`,
    LIST: `${BASE_URL}/farms`,
    CREATE: `${BASE_URL}/farms`,
    STATS: `${BASE_URL}/farms/stats`,
    // Additional farm endpoints for web
    GET_BY_ID: (id) => `${BASE_URL}/farms/${id}`,
    UPDATE: (id) => `${BASE_URL}/farms/${id}`,
    DELETE: (id) => `${BASE_URL}/farms/${id}`,
    ADD_PLANT: (farmId) => `${BASE_URL}/farms/${farmId}/plants`,
    GET_PLANTS: (farmId) => `${BASE_URL}/farms/${farmId}/plants`,
    FARM_ANALYTICS: (farmId) => `${BASE_URL}/farms/${farmId}/analytics`,
    EXPORT_DATA: (farmId) => `${BASE_URL}/farms/${farmId}/export`,
  },
  ANALYTICS: {
    DASHBOARD: `${BASE_URL}/analytics/dashboard`,
    USER_STATS: `${BASE_URL}/analytics/user-stats`,
    SYSTEM_STATS: `${BASE_URL}/analytics/system-stats`,
    EXPORT_REPORT: `${BASE_URL}/analytics/export-report`,
  },
  SETTINGS: {
    APP_SETTINGS: `${BASE_URL}/settings/app`,
    USER_SETTINGS: `${BASE_URL}/settings/user`,
    NOTIFICATIONS: `${BASE_URL}/settings/notifications`,
    THEMES: `${BASE_URL}/settings/themes`,
  },
  // Web-specific endpoints
  WEBSOCKET: {
    CONNECT: `${WEBSOCKET_CONFIG.BASE_WS_URL}/ws`,
    NOTIFICATIONS: `${WEBSOCKET_CONFIG.BASE_WS_URL}/ws/notifications`,
    REAL_TIME_UPDATES: `${WEBSOCKET_CONFIG.BASE_WS_URL}/ws/updates`,
  },
  UPLOAD: {
    PRESIGNED_URL: `${BASE_URL}/upload/presigned-url`, // For direct S3 uploads
    CHUNKED_UPLOAD: `${BASE_URL}/upload/chunked`, // For large file uploads
    PROGRESS: `${BASE_URL}/upload/progress`, // For upload progress tracking
  },
};

// Helper function to build URL with query parameters
export const buildUrl = (baseUrl, params = {}) => {
  const url = new URL(baseUrl);
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key]);
    }
  });
  return url.toString();
};

// Common API headers for web
export const API_HEADERS = {
  DEFAULT: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  AUTH: (token) => ({
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  }),
  MULTIPART: (token) => ({
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    // Note: Don't set Content-Type for multipart, browser will set it automatically
  }),
  FILE_DOWNLOAD: (token) => ({
    Authorization: `Bearer ${token}`,
  }),
};

// API timeout configuration for web
export const API_TIMEOUT = {
  SHORT: 10000, // 10 seconds for simple requests
  MEDIUM: 30000, // 30 seconds for uploads
  LONG: 60000, // 60 seconds for large operations
};

// Default API configuration
export const API_CONFIG = {
  BASE_URL,
  TIMEOUT: API_TIMEOUT.MEDIUM,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

export default API_ENDPOINTS;

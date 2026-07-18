// utils/storage.js

// Storage service class
class StorageService {
  constructor() {
    this.prefix = "app_";
  }

  set(key, value) {
    try {
      const storageKey = `${this.prefix}${key}`;
      localStorage.setItem(storageKey, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Storage set error:", error);
      return false;
    }
  }

  get(key) {
    try {
      const storageKey = `${this.prefix}${key}`;
      const item = localStorage.getItem(storageKey);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error("Storage get error:", error);
      return null;
    }
  }

  remove(key) {
    try {
      const storageKey = `${this.prefix}${key}`;
      localStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      console.error("Storage remove error:", error);
      return false;
    }
  }

  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error("Storage clear error:", error);
      return false;
    }
  }

  setSecure(key, value) {
    return this.set(`secure_${key}`, value);
  }

  getSecure(key) {
    return this.get(`secure_${key}`);
  }
}

// Storage keys enumeration
export const StorageKeys = {
  AUTH_TOKEN: "auth_token",
  USER_DATA: "user_data",
  REFRESH_TOKEN: "refresh_token",
  THEME: "theme",
  LANGUAGE: "language",
  LAST_VISITED: "last_visited",
  FARM_DATA: "farm_data",
  SETTINGS: "settings",
};

// Storage utility functions
export const Storage = {
  setItem: (key, value) => {
    const storage = new StorageService();
    return storage.set(key, value);
  },

  getItem: (key) => {
    const storage = new StorageService();
    return storage.get(key);
  },

  removeItem: (key) => {
    const storage = new StorageService();
    return storage.remove(key);
  },

  clearAll: () => {
    const storage = new StorageService();
    return storage.clear();
  },

  setSecure: (key, value) => {
    const storage = new StorageService();
    return storage.setSecure(key, value);
  },

  getSecure: (key) => {
    const storage = new StorageService();
    return storage.getSecure(key);
  },
};

// Legacy export for backward compatibility
export const storage = new StorageService();

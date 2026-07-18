// utils/BrowserStorage.js
export default class BrowserStorage {
  static PREFIX = "plantapp_";

  // Get item with prefix
  static getItem(key) {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`${this.PREFIX}${key}`);
    }
    return null;
  }

  // Set item with prefix
  static setItem(key, value) {
    if (typeof window !== "undefined") {
      localStorage.setItem(`${this.PREFIX}${key}`, value);
      return true;
    }
    return false;
  }

  // Remove item
  static removeItem(key) {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`${this.PREFIX}${key}`);
      return true;
    }
    return false;
  }

  // Clear all app items
  static clearAll() {
    if (typeof window !== "undefined") {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    }
    return false;
  }
}

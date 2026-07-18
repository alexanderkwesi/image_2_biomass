// utils/storageManager.js
export class StorageManager {
  constructor() {
    this.indexedDB = null;
    this.initIndexedDB();
  }

  async initIndexedDB() {
    if (!window.indexedDB) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open("FarmAssistantDB", 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.indexedDB = request.result;
        resolve(this.indexedDB);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains("predictions")) {
          db.createObjectStore("predictions", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("images")) {
          db.createObjectStore("images", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("farms")) {
          db.createObjectStore("farms", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      };
    });
  }

  // LocalStorage methods
  setLocal(key, value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error("LocalStorage set error:", error);
      return false;
    }
  }

  getLocal(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error("LocalStorage get error:", error);
      return defaultValue;
    }
  }

  removeLocal(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error("LocalStorage remove error:", error);
      return false;
    }
  }

  // SessionStorage methods
  setSession(key, value) {
    try {
      const serialized = JSON.stringify(value);
      sessionStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error("SessionStorage set error:", error);
      return false;
    }
  }

  getSession(key, defaultValue = null) {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error("SessionStorage get error:", error);
      return defaultValue;
    }
  }

  // IndexedDB methods
  async setIndexed(storeName, key, value) {
    if (!this.indexedDB) return false;

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put({ ...value, key });

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async getIndexed(storeName, key) {
    if (!this.indexedDB) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllIndexed(storeName) {
    if (!this.indexedDB) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteIndexed(storeName, key) {
    if (!this.indexedDB) return false;

    return new Promise((resolve, reject) => {
      const transaction = this.indexedDB.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Cache management
  async cacheImage(url, blob) {
    if ("caches" in window) {
      try {
        const cache = await caches.open("images-cache");
        await cache.put(url, new Response(blob));
        return true;
      } catch (error) {
        console.error("Image cache error:", error);
        return false;
      }
    }
    return false;
  }

  async getCachedImage(url) {
    if ("caches" in window) {
      try {
        const cache = await caches.open("images-cache");
        const response = await cache.match(url);
        if (response) {
          return await response.blob();
        }
      } catch (error) {
        console.error("Get cached image error:", error);
      }
    }
    return null;
  }

  // Clear all storage
  clearAll() {
    try {
      localStorage.clear();
      sessionStorage.clear();

      // Clear IndexedDB
      if (this.indexedDB) {
        indexedDB.deleteDatabase("FarmAssistantDB");
        this.indexedDB = null;
        this.initIndexedDB();
      }

      // Clear service worker caches
      if ("caches" in window) {
        caches.keys().then((cacheNames) => {
          cacheNames.forEach((cacheName) => {
            caches.delete(cacheName);
          });
        });
      }

      return true;
    } catch (error) {
      console.error("Clear all storage error:", error);
      return false;
    }
  }

  // Storage size monitoring
  getStorageUsage() {
    let total = 0;

    // Calculate localStorage size
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      total += key.length + value.length;
    }

    // Calculate sessionStorage size
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      const value = sessionStorage.getItem(key);
      total += key.length + value.length;
    }

    return {
      totalBytes: total,
      totalMB: total / (1024 * 1024),
      localStorageItems: localStorage.length,
      sessionStorageItems: sessionStorage.length,
    };
  }
}

// Singleton instance
export const storageManager = new StorageManager();

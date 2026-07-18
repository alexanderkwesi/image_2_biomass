// services/apiService.js
import { CONFIG, ENDPOINTS, buildEndpoint } from "../config";
import { storageManager } from "../utils/storageManager";

export class ApiService {
  constructor() {
    this.baseURL = CONFIG.API.BASE_URL;
    this.token = null;
    this.refreshToken = null;
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Load tokens from storage
    this.token = storageManager.getLocal("auth_token");
    this.refreshToken = storageManager.getLocal("refresh_token");
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseURL}${endpoint}`;

    const defaultOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      timeout: CONFIG.API.TIMEOUT,
      ...options,
    };

    // Add body if present
    if (options.body && typeof options.body !== "string") {
      defaultOptions.body = JSON.stringify(options.body);
    }

    try {
      const response = await this.fetchWithTimeout(url, defaultOptions);

      // Handle different response types
      const contentType = response.headers.get("content-type");
      let data;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else if (contentType && contentType.includes("text/")) {
        data = await response.text();
      } else {
        data = await response.blob();
      }

      if (!response.ok) {
        // Handle token expiration
        if (response.status === 401 && this.refreshToken) {
          const refreshed = await this.refreshAuthToken();
          if (refreshed) {
            // Retry request with new token
            return this.request(endpoint, options);
          }
        }

        throw new ApiError(
          data?.message || `HTTP ${response.status}`,
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      if (error.name === "TimeoutError") {
        throw new ApiError("Request timeout", 408);
      }

      // Handle network errors
      if (!navigator.onLine) {
        throw new ApiError("No internet connection", 0);
      }

      throw error;
    }
  }

  async fetchWithTimeout(url, options) {
    const { timeout = CONFIG.API.TIMEOUT } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      if (error.name === "AbortError") {
        error.name = "TimeoutError";
      }
      throw error;
    }
  }

  async uploadFile(file, onProgress = null) {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.open("POST", `${this.baseURL}${ENDPOINTS.IMAGES.UPLOAD}`);
      xhr.setRequestHeader("Authorization", `Bearer ${this.token}`);

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            onProgress(percentComplete);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error("Invalid JSON response"));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error"));
      xhr.ontimeout = () => reject(new Error("Upload timeout"));

      xhr.timeout = CONFIG.API.UPLOAD_TIMEOUT;
      xhr.send(formData);
    });
  }

  async refreshAuthToken() {
    try {
      const response = await fetch(`${this.baseURL}${ENDPOINTS.AUTH.REFRESH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setTokens(data.token, data.refreshToken);
        return true;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
    }

    // Clear tokens if refresh failed
    this.clearTokens();
    return false;
  }

  setTokens(token, refreshToken) {
    this.token = token;
    this.refreshToken = refreshToken;

    storageManager.setLocal("auth_token", token);
    storageManager.setLocal("refresh_token", refreshToken);
  }

  clearTokens() {
    this.token = null;
    this.refreshToken = null;

    storageManager.removeLocal("auth_token");
    storageManager.removeLocal("refresh_token");
  }

  // CRUD operations
  async get(endpoint, params = {}) {
    const url = buildEndpoint(endpoint, params);
    return this.request(url);
  }

  async post(endpoint, data, params = {}) {
    const url = buildEndpoint(endpoint, params);
    return this.request(url, {
      method: "POST",
      body: data,
    });
  }

  async put(endpoint, data, params = {}) {
    const url = buildEndpoint(endpoint, params);
    return this.request(url, {
      method: "PUT",
      body: data,
    });
  }

  async delete(endpoint, params = {}) {
    const url = buildEndpoint(endpoint, params);
    return this.request(url, { method: "DELETE" });
  }

  // Image operations
  async uploadImage(file, farmId = null) {
    const formData = new FormData();
    formData.append("image", file);

    if (farmId) {
      formData.append("farmId", farmId);
    }

    return this.request(ENDPOINTS.IMAGES.UPLOAD, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });
  }

  async getPredictionHistory(params = {}) {
    return this.get(ENDPOINTS.PREDICTIONS.HISTORY, params);
  }

  async getUserProfile() {
    return this.get(ENDPOINTS.USER.PROFILE);
  }

  async updateUserProfile(data) {
    return this.put(ENDPOINTS.USER.PROFILE, data);
  }

  async getFarms() {
    return this.get(ENDPOINTS.FARMS.LIST);
  }

  async createFarm(data) {
    return this.post(ENDPOINTS.FARMS.CREATE, data);
  }
}

export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.timestamp = new Date();
  }
}

// Singleton instance
export const apiService = new ApiService();

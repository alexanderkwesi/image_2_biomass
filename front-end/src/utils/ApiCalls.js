// utils/ApiCalls.js (or services/ApiCalls.js)
import { API_ENDPOINTS } from "./EndUrls";

class ApiClient {
  constructor() {
    this.baseURL = API_ENDPOINTS.BASE;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  getToken() {
    return this.token;
  }

  clearAuthToken() {
    this.token = null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    // Add authorization header if token exists
    if (this.token) {
      config.headers["Authorization"] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      return await this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async uploadImage(imageFile, metadata = {}, onProgress = null) {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("metadata", JSON.stringify(metadata));

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener("progress", (event) => {
        if (onProgress && event.lengthComputable) {
          const progress = event.loaded / event.total;
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error("Invalid response format"));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload was cancelled"));
      });

      xhr.open("POST", `${this.baseURL}${API_ENDPOINTS.IMAGES.UPLOAD}`);
      if (this.token) {
        xhr.setRequestHeader("Authorization", `Bearer ${this.token}`);
      }
      xhr.send(formData);
    });
  }

  // Alternative upload using fetch with progress (modern approach)
  async uploadImageWithFetch(imageFile, metadata = {}, onProgress = null) {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("metadata", JSON.stringify(metadata));

    const headers = {
      Authorization: this.token ? `Bearer ${this.token}` : "",
    };

    try {
      const response = await fetch(
        `${this.baseURL}${API_ENDPOINTS.IMAGES.UPLOAD}`,
        {
          method: "POST",
          headers,
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  }

  async getPrediction(imageId) {
    return this.request(`${API_ENDPOINTS.PREDICTIONS.GET}/${imageId}`);
  }

  async getUserProfile() {
    return this.request(API_ENDPOINTS.USER.PROFILE);
  }

  async updateUserProfile(profileData) {
    return this.request(API_ENDPOINTS.USER.PROFILE, {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  }

  async getFarms() {
    return this.request(API_ENDPOINTS.FARMS.LIST);
  }

  async createFarm(farmData) {
    return this.request(API_ENDPOINTS.FARMS.CREATE, {
      method: "POST",
      body: JSON.stringify(farmData),
    });
  }

  async updateFarm(farmId, farmData) {
    return this.request(`${API_ENDPOINTS.FARMS.BASE}/${farmId}`, {
      method: "PUT",
      body: JSON.stringify(farmData),
    });
  }

  async deleteFarm(farmId) {
    return this.request(`${API_ENDPOINTS.FARMS.BASE}/${farmId}`, {
      method: "DELETE",
    });
  }

  async getFarmPredictions(farmId, timeRange = "30d") {
    return this.request(
      `${API_ENDPOINTS.FARMS.BASE}/${farmId}/predictions?time_range=${timeRange}`
    );
  }

  async getFarmStats(farmId) {
    return this.request(`${API_ENDPOINTS.FARMS.BASE}/${farmId}/stats`);
  }

  // Additional common API methods for web
  async login(credentials) {
    return this.request(API_ENDPOINTS.AUTH.LOGIN, {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  async register(userData) {
    return this.request(API_ENDPOINTS.AUTH.REGISTER, {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async logout() {
    return this.request(API_ENDPOINTS.AUTH.LOGOUT, {
      method: "POST",
    });
  }

  async refreshToken(refreshToken) {
    return this.request(API_ENDPOINTS.AUTH.REFRESH, {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async resetPassword(email) {
    return this.request(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async verifyResetToken(token, newPassword) {
    return this.request(API_ENDPOINTS.AUTH.VERIFY_RESET, {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }

  // File download method
  async downloadFile(endpoint, filename = "download") {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      Authorization: this.token ? `Bearer ${this.token}` : "",
    };

    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download error:", error);
      throw error;
    }
  }

  // Get with query parameters
  async getWithParams(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url);
  }

  // Patch method (partial update)
  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  handleResponse(response) {
    if (!response.ok) {
      // Try to parse error message from response
      return response
        .json()
        .then((errorData) => {
          const error = new Error(
            errorData.message || `HTTP error! status: ${response.status}`
          );
          error.status = response.status;
          error.data = errorData;
          throw error;
        })
        .catch(() => {
          throw new Error(`HTTP error! status: ${response.status}`);
        });
    }

    // Handle empty responses
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }

    // For non-JSON responses
    return response.text();
  }

  handleError(error) {
    console.error("API call failed:", error);

    // Enhanced error handling for web
    if (error.name === "TypeError" && error.message === "Failed to fetch") {
      return new Error("Network error. Please check your internet connection.");
    }

    if (error.status === 401) {
      // Clear token on unauthorized
      this.clearAuthToken();
      // Dispatch event for auth listeners
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth-expired"));
      }
    }

    return error;
  }

  // Retry mechanism for failed requests
  async requestWithRetry(
    endpoint,
    options = {},
    maxRetries = 3,
    retryDelay = 1000
  ) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.request(endpoint, options);
      } catch (error) {
        lastError = error;

        // Don't retry on 4xx errors (except 429 - Too Many Requests)
        if (
          error.status &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 429
        ) {
          break;
        }

        // Wait before retrying
        if (i < maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * Math.pow(2, i))
          );
        }
      }
    }

    throw lastError;
  }
}

// Create singleton instance
const apiClient = new ApiClient();

// Optional: Interceptors for request/response handling
const setupInterceptors = () => {
  const originalRequest = apiClient.request;

  apiClient.request = async function (endpoint, options = {}) {
    // Request interceptor - add timestamp, etc.
    const timestamp = new Date().toISOString();

    // You could add CSRF token, etc.
    if (typeof window !== "undefined") {
      const csrfToken = document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute("content");
      if (csrfToken) {
        options.headers = {
          ...options.headers,
          "X-CSRF-Token": csrfToken,
        };
      }
    }

    try {
      const response = await originalRequest.call(this, endpoint, options);

      // Response interceptor
      console.log(
        `API call to ${endpoint} completed in ${
          Date.now() - new Date(timestamp)
        }ms`
      );

      return response;
    } catch (error) {
      // Error interceptor
      console.error(`API call to ${endpoint} failed:`, error);
      throw error;
    }
  };
};

// Setup interceptors if needed
setupInterceptors();

export default apiClient;

// Alternative: Hook-based API client for React components
export const useApiClient = () => {
  // This could be used in React components with useContext
  return apiClient;
};

// Helper function to create API hooks (for React Query, SWR, etc.)
export const createApiHooks = () => {
  return {
    useFarms: () => {
      // Implementation for React Query or SWR
      return {
        data: null,
        isLoading: false,
        error: null,
        refetch: () => {},
      };
    },
    // Add more hooks as needed
  };
};

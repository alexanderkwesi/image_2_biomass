// services/api.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl || "http://localhost:5000/api/v1";

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_verified: boolean;
  created_at: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  access_token?: string;
  token_type?: string;
  user?: User;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseData?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const authAPI = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
      console.log("Login API call:", `${API_BASE_URL}/db/login`);

      const response = await fetch(`${API_BASE_URL}/db/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(credentials),
      });

      const responseText = await response.text();
      let responseData;

      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        throw new ApiError(
          "Invalid server response format",
          response.status,
          responseText
        );
      }

      if (!response.ok) {
        throw new ApiError(
          responseData.detail || `Login failed (${response.status})`,
          response.status,
          responseData
        );
      }

      return responseData;
    } catch (error) {
      console.error("Login API error:", error);

      if (error instanceof ApiError) {
        throw error;
      }

      if (
        error instanceof TypeError &&
        error.message.includes("Network request failed")
      ) {
        throw new ApiError(
          "Network error. Please check your internet connection."
        );
      }

      throw new ApiError("An unexpected error occurred during login.");
    }
  },

  register: async (userData: RegisterRequest): Promise<LoginResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/db/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(
          errorData.detail || "Registration failed",
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Registration API error:", error);
      throw error;
    }
  },

  verifyToken: async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.success && data.valid === true;
    } catch (error) {
      console.error("Token verification error:", error);
      return false;
    }
  },

  getUserProfile: async (token: string): Promise<User> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }

      return await response.json();
    } catch (error) {
      console.error("Get profile error:", error);
      throw error;
    }
  },
};

export const storage = {
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error("Error storing data:", error);
      throw error;
    }
  },

  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error("Error retrieving data:", error);
      throw error;
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error("Error removing data:", error);
      throw error;
    }
  },

  clear: async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error("Error clearing storage:", error);
      throw error;
    }
  },
};

export const authStorage = {
  storeAuthData: async (token: string, user: User): Promise<void> => {
    try {
      await storage.setItem("access_token", token);
      await storage.setItem("user", JSON.stringify(user));

      // Set token expiration (30 minutes)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);
      await storage.setItem("token_expires_at", expiresAt.toISOString());
    } catch (error) {
      console.error("Error storing auth data:", error);
      throw error;
    }
  },

  getAuthData: async (): Promise<{
    token: string | null;
    user: User | null;
  }> => {
    try {
      const [token, userString] = await Promise.all([
        storage.getItem("access_token"),
        storage.getItem("user"),
      ]);

      let user: User | null = null;
      if (userString) {
        try {
          user = JSON.parse(userString);
        } catch (e) {
          console.error("Error parsing user data:", e);
        }
      }

      return { token, user };
    } catch (error) {
      console.error("Error getting auth data:", error);
      return { token: null, user: null };
    }
  },

  clearAuthData: async (): Promise<void> => {
    try {
      await Promise.all([
        storage.removeItem("access_token"),
        storage.removeItem("user"),
        storage.removeItem("token_expires_at"),
      ]);
    } catch (error) {
      console.error("Error clearing auth data:", error);
      throw error;
    }
  },

  isTokenExpired: async (): Promise<boolean> => {
    try {
      const expiresAtString = await storage.getItem("token_expires_at");
      if (!expiresAtString) return true;

      const expiresAt = new Date(expiresAtString);
      return new Date() > expiresAt;
    } catch (error) {
      console.error("Error checking token expiration:", error);
      return true;
    }
  },
};

export const checkServerHealth = async (): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      timeout: 5000,
    });

    if (!response.ok) {
      throw new Error(`Server health check failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Server health check error:", error);
    throw error;
  }
};

// LoginScreen.jsx - React Web Version
import React, { useState, useEffect } from "react";
import "./LoginScreen.css";

// Using environment variable or hardcoded value
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api/v1";

// Custom Icon Component using Unicode/Emoji
const Icon = ({ name, size, color, className = "" }) => {
  const iconMap = {
    leaf: "🌿",
    "mail-outline": "📧",
    mail: "📧",
    "lock-closed-outline": "🔒",
    "lock-open-outline": "🔓",
    lock: "🔒",
    "eye-outline": "👁️",
    "eye-off-outline": "🚫",
    eye: "👁️",
    "alert-circle-outline": "⚠️",
    alert: "⚠️",
    "logo-google": "G",
    "logo-apple": "🍎",
    "arrow-forward": "→",
    "arrow-back": "←",
    default: "□",
  };

  const iconChar = iconMap[name] || iconMap["default"];
  const isLogo = ["logo-google", "logo-apple"].includes(name);

  return (
    <span 
      className={`icon ${isLogo ? 'icon-logo' : ''} ${className}`}
      style={{
        fontSize: size,
        color,
        fontWeight: isLogo ? 'bold' : 'normal'
      }}
    >
      {iconChar}
    </span>
  );
};

// Browser Storage Manager
class BrowserStorageManager {
  constructor() {
    this.initializeStorage();
  }

  initializeStorage() {
    if (!this.getStorage()) {
      this.setStorage({
        user_data: null,
        access_token: null,
        token_expires_at: null,
        is_logged_in: false,
        user: null
      });
    }
  }

  getStorage() {
    try {
      const data = localStorage.getItem('pasturescan_storage');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Failed to get storage:", error);
      return null;
    }
  }

  setStorage(data) {
    try {
      localStorage.setItem('pasturescan_storage', JSON.stringify(data));
    } catch (error) {
      console.error("Failed to set storage:", error);
    }
  }

  updateStorage(updates) {
    const current = this.getStorage() || {};
    this.setStorage({ ...current, ...updates });
  }

  saveUserData(userData) {
    try {
      this.updateStorage({ user_data: userData });
      console.log("User data saved to browser storage");
    } catch (error) {
      console.error("Failed to save user data:", error);
      throw error;
    }
  }

  saveAuthToken(token, expiresInMinutes = 30) {
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
      
      this.updateStorage({
        access_token: token,
        token_expires_at: expiresAt.toISOString()
      });
      
      console.log("Auth token saved to browser storage");
    } catch (error) {
      console.error("Failed to save auth token:", error);
      throw error;
    }
  }

  setLoggedIn(status) {
    try {
      this.updateStorage({ is_logged_in: status });
      console.log("Login status set to:", status);
    } catch (error) {
      console.error("Failed to set login status:", error);
    }
  }

  saveUser(user) {
    try {
      this.updateStorage({ user });
      console.log("User info saved to browser storage");
    } catch (error) {
      console.error("Failed to save user:", error);
      throw error;
    }
  }

  getUser() {
    try {
      const storage = this.getStorage();
      return storage?.user || null;
    } catch (error) {
      console.error("Failed to get user:", error);
      return null;
    }
  }

  getAccessToken() {
    try {
      const storage = this.getStorage();
      return storage?.access_token || null;
    } catch (error) {
      console.error("Failed to get access token:", error);
      return null;
    }
  }

  isTokenExpired() {
    try {
      const storage = this.getStorage();
      if (!storage?.token_expires_at) return true;

      return new Date() >= new Date(storage.token_expires_at);
    } catch (error) {
      console.error("Failed to check token expiration:", error);
      return true;
    }
  }

  isLoggedIn() {
    try {
      const storage = this.getStorage();
      if (!storage) return false;

      const isLoggedIn = storage.is_logged_in;
      const token = storage.access_token;
      const isExpired = this.isTokenExpired();

      return isLoggedIn === true && !!token && !isExpired;
    } catch (error) {
      console.error("Failed to check login status:", error);
      return false;
    }
  }

  clearAuthData() {
    try {
      localStorage.removeItem('pasturescan_storage');
      console.log("Auth data cleared from browser storage");
    } catch (error) {
      console.error("Failed to clear auth data:", error);
    }
  }

  getAllData() {
    try {
      const storage = this.getStorage();
      console.log("=== BrowserStorage Contents ===");
      console.log(JSON.stringify(storage, null, 2));
      console.log("==============================");
      return storage;
    } catch (error) {
      console.error("Failed to get all data:", error);
      return null;
    }
  }
}

// Create storage instance
const storageManager = new BrowserStorageManager();

export default function LoginScreen({ onNavigate, onLoginSuccess }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const validateForm = () => {
    if (!form.email.trim() || !form.password.trim()) {
      alert("Error: Please fill in all fields");
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(form.email)) {
      alert("Error: Please enter a valid email address");
      return false;
    }

    if (form.password.length < 6) {
      alert("Error: Password must be at least 6 characters long");
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    setApiError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      console.log("Attempting login for:", form.email);
      console.log("API URL:", `${API_BASE_URL}/db/login`);

      storageManager.getAllData();

      const requestBody = {
        email: form.email.trim(),
        password: form.password,
      };

      console.log("Request body:", JSON.stringify(requestBody));

      const response = await fetch(`${API_BASE_URL}/db/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);

      const responseText = await response.text();
      console.log("Response text:", responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse JSON response:", e);
        throw new Error("Invalid server response");
      }

      console.log("Parsed response:", responseData);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid email or password");
        } else if (response.status === 400) {
          throw new Error(responseData.detail || "Invalid request");
        } else if (response.status === 422) {
          throw new Error("Validation error. Please check your inputs.");
        } else if (response.status === 500) {
          throw new Error("Server error. Please try again later.");
        } else {
          throw new Error(
            responseData.detail || `Login failed (${response.status})`
          );
        }
      }

      if ("success" in responseData && !responseData.success) {
        throw new Error(responseData.message || "Login failed");
      }

      if (!responseData.success) {
        throw new Error(responseData.message || "Login failed");
      }

      if (!responseData.access_token) {
        throw new Error("No access token received");
      }

      storageManager.saveAuthToken(responseData.access_token, 30);

      if (responseData.user) {
        storageManager.saveUser(responseData.user);
        storageManager.saveUserData(responseData.user);
      }

      storageManager.setLoggedIn(true);
      storageManager.getAllData();

      console.log("Login successful, user:", responseData.user?.email);

      setForm({ email: "", password: "" });

      if (onLoginSuccess) {
        onLoginSuccess(responseData.user);
      } else {
        alert("Success: Login successful!");
        if (onNavigate) {
          onNavigate('dashboard');
        }
      }
    } catch (error) {
      console.error("Login error details:", error);

      let errorMessage = "An error occurred during login.";

      if (error.message) {
        errorMessage = error.message;
      } else if (
        error instanceof TypeError &&
        error.message.includes("Network request failed")
      ) {
        errorMessage =
          "Network error. Please check your connection and make sure the server is running.";
      }

      setApiError(errorMessage);
      alert(`Login Failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin();
    }
  };

  const navigateToRegister = () => {
    if (onNavigate) {
      onNavigate('register');
    }
  };

  const navigateToForgotPassword = () => {
    if (onNavigate) {
      onNavigate('forgot-password');
    }
  };

  const handleTestLogin = () => {
    setForm({
      email: "test@example.com",
      password: "password123",
    });

    setTimeout(() => {
      handleLogin();
    }, 500);
  };

  const handleTestServer = async () => {
    try {
      alert("Testing Server: Checking server connection...");

      const response = await fetch(`${API_BASE_URL}/health`, {
        method: "GET",
      });

      const data = await response.json();

      alert(
        `Server Status:\n` +
        `Gateway: ${data.gateway?.status}\n` +
        `Database: ${data.database?.status}\n` +
        `Auth Service: ${data.auth?.status || "not checked"}`
      );
    } catch (error) {
      alert(
        "Server Test Failed: Could not connect to server. Make sure it is running."
      );
    }
  };

  const handleClearStorage = () => {
    if (window.confirm("Are you sure you want to clear all stored data?")) {
      storageManager.clearAuthData();
      alert("Success: Storage cleared successfully");
      console.log("Storage cleared by user");
    }
  };

  const handleDebugStorage = () => {
    storageManager.getAllData();
    const isLoggedIn = storageManager.isLoggedIn();
    const tokenExpired = storageManager.isTokenExpired();

    alert(
      `Debug Info:\n` +
      `Login Status: ${isLoggedIn}\n` +
      `Token Expired: ${tokenExpired}\n` +
      `Check console for full storage dump.`
    );
  };

  const toggleDebugInfo = () => {
    setShowDebugInfo(!showDebugInfo);
  };

  // Development mode check
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="login-container" onKeyDown={handleKeyPress}>
      <div className="login-content">
        {/* Header */}
        <div className="login-header">
          <Icon name="leaf" size={80} color="#4CAF50" />
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Sign in to your PastureScan account</p>
        </div>

        {/* Error Message */}
        {apiError && (
          <div className="login-error-container">
            <Icon name="alert-circle-outline" size={20} color="#f44336" />
            <span className="login-error-text">{apiError}</span>
          </div>
        )}

        {/* Form */}
        <div className="login-form">
          {/* Email Input */}
          <div className="login-input-container">
            <Icon name="mail-outline" size={20} color="#666" className="login-input-icon" />
            <input
              type="email"
              className="login-input"
              placeholder="Email Address"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                setApiError(null);
              }}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          {/* Password Input */}
          <div className="login-input-container">
            <Icon name="lock-closed-outline" size={20} color="#666" className="login-input-icon" />
            <input
              type={showPassword ? "text" : "password"}
              className="login-input"
              placeholder="Password"
              value={form.password}
              onChange={(e) => {
                setForm({ ...form, password: e.target.value });
                setApiError(null);
              }}
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="login-eye-button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <Icon
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#666"
              />
            </button>
          </div>

          {/* Forgot Password */}
          <button
            type="button"
            className="login-forgot-password"
            onClick={navigateToForgotPassword}
            disabled={loading}
          >
            Forgot Password?
          </button>

          {/* Login Button */}
          <button
            type="button"
            className={`login-button ${loading ? 'login-button-disabled' : ''}`}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <div className="login-button-content">
                <div className="login-spinner"></div>
                <span>Signing In...</span>
              </div>
            ) : (
              "Sign In"
            )}
          </button>

          {/* Test Buttons (Development only) */}
          {isDevelopment && (
            <div className="login-test-buttons">
              <button
                type="button"
                className="login-test-button login-test-server"
                onClick={handleTestServer}
                disabled={loading}
              >
                Test Server
              </button>
              <button
                type="button"
                className="login-test-button"
                onClick={handleTestLogin}
                disabled={loading}
              >
                Test Login
              </button>
              <button
                type="button"
                className="login-test-button login-test-debug"
                onClick={handleDebugStorage}
                disabled={loading}
              >
                Debug Storage
              </button>
              <button
                type="button"
                className="login-test-button login-test-clear"
                onClick={handleClearStorage}
                disabled={loading}
              >
                Clear Storage
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="login-divider">
            <div className="login-divider-line"></div>
            <span className="login-divider-text">or</span>
            <div className="login-divider-line"></div>
          </div>

          {/* Social Login */}
          <div className="login-social-buttons">
            <button
              type="button"
              className="login-social-button"
              disabled={loading}
            >
              <Icon name="logo-google" size={20} color="#DB4437" />
              <span>Google</span>
            </button>
            <button
              type="button"
              className="login-social-button"
              disabled={loading}
            >
              <Icon name="logo-apple" size={20} color="#000" />
              <span>Apple</span>
            </button>
          </div>

          {/* Register Link */}
          <div className="login-register-container">
            <span className="login-register-text">Don't have an account? </span>
            <button
              type="button"
              className="login-register-link"
              onClick={navigateToRegister}
              disabled={loading}
            >
              Sign Up
            </button>
          </div>

          {/* Debug Info Toggle (Development only) */}
          {isDevelopment && (
            <div className="login-debug-toggle">
              <button
                type="button"
                className="login-debug-toggle-button"
                onClick={toggleDebugInfo}
              >
                {showDebugInfo ? 'Hide Debug Info' : 'Show Debug Info'}
              </button>
              
              {showDebugInfo && (
                <div className="login-debug-info">
                  <p><strong>API Base:</strong> {API_BASE_URL}</p>
                  <p><strong>Email:</strong> {form.email}</p>
                  <p><strong>Password Length:</strong> {form.password.length}</p>
                  <p><strong>Storage:</strong> Browser localStorage</p>
                  <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
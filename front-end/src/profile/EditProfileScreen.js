import { useEffect, useState } from "react";
import "./EditProfileScreen.css";

// Theme configuration
const THEMES = {
  LIGHT: "light",
  DARK: "dark",
};

// Storage utility using web browser localStorage
const DashboardStorage = {
  async getUserData() {
    try {
      const userJson = localStorage.getItem("user_data");
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error("Failed to get user data:", error);
      return null;
    }
  },

  async getAuthToken() {
    try {
      return localStorage.getItem("access_token");
    } catch (error) {
      console.error("Failed to get auth token:", error);
      return null;
    }
  },

  async saveUserData(userData) {
    try {
      localStorage.setItem("user_data", JSON.stringify(userData));
    } catch (error) {
      console.error("Failed to save user data:", error);
    }
  },

  async getTheme() {
    try {
      const theme = localStorage.getItem("app_theme");
      return theme || THEMES.LIGHT;
    } catch (error) {
      console.error("Failed to get theme:", error);
      return THEMES.LIGHT;
    }
  },

  async saveTheme(theme) {
    try {
      localStorage.setItem("app_theme", theme);
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  },

  async clearUserData() {
    try {
      localStorage.removeItem("user_data");
      localStorage.removeItem("access_token");
    } catch (error) {
      console.error("Failed to clear user data:", error);
    }
  },
};

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// API Service using fetch
const ApiService = {
  async getAuthHeaders() {
    const token = await DashboardStorage.getAuthToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  },

  async fetchUserProfile() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/profile`, {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      throw error;
    }
  },

  async updateUserProfile(profileData) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/v1/auth/update-profile`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(profileData),
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to update user profile:", error);
      throw error;
    }
  },
};

const EditProfileScreen = ({ onBack }) => {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    farm_name: "",
    email: "",
    phone: "",
    location: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState(THEMES.LIGHT);

  useEffect(() => {
    loadUserData();
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await DashboardStorage.getTheme();
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } catch (error) {
      console.error("Failed to load theme:", error);
    }
  };

  const applyTheme = (theme) => {
    const root = document.documentElement;
    if (theme === THEMES.DARK) {
      root.setAttribute("data-theme", "dark");
    } else {
      root.setAttribute("data-theme", "light");
    }
  };

  const loadUserData = async () => {
    try {
      const user = await DashboardStorage.getUserData();
      if (user) {
        setFormData({
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          farm_name: user.farm_name || "",
          email: user.email || "",
          phone: user.phone || "",
          location: user.location || "",
        });
      } else {
        // Try to fetch from API if not in localStorage
        const apiUser = await ApiService.fetchUserProfile();
        if (apiUser && apiUser.data) {
          setFormData({
            first_name: apiUser.data.first_name || "",
            last_name: apiUser.data.last_name || "",
            farm_name: apiUser.data.farm_name || "",
            email: apiUser.data.email || "",
            phone: apiUser.data.phone || "",
            location: apiUser.data.location || "",
          });
        }
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
      showAlert("Error", "Failed to load user data");
    } finally {
      setIsLoading(false);
    }
  };

  const showAlert = (title, message) => {
    // You can replace this with a proper modal/alert component
    if (window.confirm(`${title}: ${message}`)) {
      // Handle confirmation if needed
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        farm_name: formData.farm_name,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
      };

      const result = await ApiService.updateUserProfile(updateData);

      if (result && result.success) {
        // Update local storage
        const currentUser = await DashboardStorage.getUserData();
        const updatedUser = { ...currentUser, ...updateData };
        await DashboardStorage.saveUserData(updatedUser);

        showAlert("Success", "Profile updated successfully!");

        if (onBack) {
          onBack();
        } else {
          window.history.back();
        }
      } else {
        showAlert("Error", result?.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Update error:", error);
      showAlert(
        "Error",
        error.message || "Failed to update profile. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-icon">
            <span className="profile-icon">👤</span>
          </div>
          <h2 className="loading-title">Loading Profile</h2>
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="edit-profile-container">
      {/* Header */}
      <div className="edit-profile-header">
        <div className="header-background" />
        <div className="header-content">
          <div className="header-top">
            <button onClick={handleCancel} className="back-button">
              <span className="back-icon">←</span>
            </button>
            <div className="header-title-container">
              <h1 className="title">Edit Profile</h1>
              <p className="subtitle">Update your personal information</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="edit-profile-content">
        {/* Personal Information */}
        <section className="profile-section">
          <div className="section-header">
            <h2 className="section-title">Personal Information</h2>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label className="input-label">First Name *</label>
              <input
                type="text"
                className={`form-input ${
                  errors.first_name ? "input-error" : ""
                }`}
                value={formData.first_name}
                onChange={(e) =>
                  handleInputChange("first_name", e.target.value)
                }
                placeholder="Enter first name"
              />
              {errors.first_name && (
                <span className="error-text">{errors.first_name}</span>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">Last Name *</label>
              <input
                type="text"
                className={`form-input ${
                  errors.last_name ? "input-error" : ""
                }`}
                value={formData.last_name}
                onChange={(e) => handleInputChange("last_name", e.target.value)}
                placeholder="Enter last name"
              />
              {errors.last_name && (
                <span className="error-text">{errors.last_name}</span>
              )}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Email Address *</label>
            <input
              type="email"
              className={`form-input ${errors.email ? "input-error" : ""}`}
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="Enter email address"
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Phone Number</label>
            <input
              type="tel"
              className="form-input"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="Enter phone number"
            />
          </div>
        </section>

        {/* Farm Information */}
        <section className="profile-section">
          <div className="section-header">
            <h2 className="section-title">Farm Information</h2>
          </div>

          <div className="input-group">
            <label className="input-label">Farm Name</label>
            <input
              type="text"
              className="form-input"
              value={formData.farm_name}
              onChange={(e) => handleInputChange("farm_name", e.target.value)}
              placeholder="Enter your farm name"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Location</label>
            <input
              type="text"
              className="form-input"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              placeholder="Enter farm location"
            />
          </div>
        </section>

        {/* Additional Information */}
        <section className="profile-section">
          <div className="section-header">
            <h2 className="section-title">Additional Information</h2>
          </div>
          <p className="helper-text">
            This information helps us provide better pasture analysis
            recommendations specific to your region and farm type.
          </p>
        </section>

        <div className="bottom-spacing" />
      </div>

      {/* Footer Actions */}
      <div className="edit-profile-footer">
        <button
          className="cancel-button"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>

        <button
          className={`save-button ${isSubmitting ? "button-disabled" : ""}`}
          onClick={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? <span className="spinner" /> : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default EditProfileScreen;

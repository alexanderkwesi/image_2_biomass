// components/ViewFarmModal.jsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import "./ViewFarmModal.css"; // We'll create a separate CSS file
import { X, Leaf, MapPin, Calendar, Droplets, Flask, Bug, TrendingUp, 
         Square, CircleCheck, CircleX, Edit, Trash2, UserCircle,
         Crop, Trees, Flower2, Wheat, Sprout, LucideIcon } from "lucide-react";

// Theme colors
const LIGHT_THEME = {
  primary: "#4CAF50",
  primaryLight: "rgba(76, 175, 80, 0.1)",
  secondary: "#FF9800",
  accent: "#2196F3",
  error: "#f44336",
  background: "#f8f9fa",
  surface: "#FFFFFF",
  surfaceVariant: "#f5f5f5",
  textPrimary: "#333333",
  textSecondary: "#666666",
  textDisabled: "#9E9E9E",
  textLight: "#FFFFFF",
  border: "#E0E0E0",
  divider: "#EEEEEE",
  overlay: "rgba(0, 0, 0, 0.5)",
  cardBg: "#FFFFFF",
  headerBg: "#f8f9fa",
};

const DARK_THEME = {
  primary: "#66BB6A",
  primaryLight: "rgba(102, 187, 106, 0.2)",
  secondary: "#FFA726",
  accent: "#42A5F5",
  error: "#EF5350",
  background: "#121212",
  surface: "#1E1E1E",
  surfaceVariant: "#2D2D2D",
  textPrimary: "#FFFFFF",
  textSecondary: "#B0B0B0",
  textDisabled: "#666666",
  textLight: "#FFFFFF",
  border: "#404040",
  divider: "#2D2D2D",
  overlay: "rgba(0, 0, 0, 0.7)",
  cardBg: "#2D2D2D",
  headerBg: "#1A1A1A",
};

const SPACING = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  xxl: "48px",
};

const SOIL_TYPES = [
  "Loam",
  "Clay",
  "Sandy Loam",
  "Silt",
  "Peat",
  "Chalk",
  "Sand",
  "Unknown",
];

const CROP_TYPES = [
  "Vegetables",
  "Fruits",
  "Grains",
  "Herbs",
  "Flowers",
  "Mixed Crops",
  "Other",
];

// Helper functions for localStorage
const storage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return null;
    }
  },

  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error("Error writing to localStorage:", error);
    }
  },

  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Error removing from localStorage:", error);
    }
  },
};

// Get current theme from localStorage
const getCurrentTheme = () => {
  const savedTheme = storage.getItem("app_theme");
  return savedTheme === "dark" ? DARK_THEME : LIGHT_THEME;
};

// Get logged in user from localStorage
const getCurrentUser = () => {
  const userData = storage.getItem("current_user");
  if (userData) {
    try {
      return JSON.parse(userData);
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
  }
  return null;
};

// Farm data structure for better type checking
const defaultFarm = {
  name: "",
  is_active: false,
  area_hectares: null,
  primary_crop: "",
  soil_type: "",
  location: "",
  created_at: null,
  description: "",
};

const ViewFarmModal = ({
  visible,
  farm = defaultFarm,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [isVisible, setIsVisible] = useState(visible);
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme);
  const [currentUser, setCurrentUser] = useState(getCurrentUser);
  const modalRef = useRef(null);
  const overlayRef = useRef(null);

  // Listen for theme changes (from settings page)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "app_theme") {
        setCurrentTheme(getCurrentTheme());
      } else if (e.key === "current_user") {
        setCurrentUser(getCurrentUser());
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Handle visibility changes
  useEffect(() => {
    setIsVisible(visible);
    
    if (visible) {
      document.body.style.overflow = 'hidden';
      // Focus trap for accessibility
      if (modalRef.current) {
        modalRef.current.focus();
      }
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [visible]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && visible) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [visible]);

  // Helper functions - memoized for performance
  const getCropIcon = useCallback((crop) => {
    switch (crop) {
      case "Vegetables":
        return <Crop size={24} />;
      case "Fruits":
        return <Trees size={24} />;
      case "Herbs":
        return <Sprout size={24} />;
      case "Flowers":
        return <Flower2 size={24} />;
      case "Grains":
        return <Wheat size={24} />;
      default:
        return <Leaf size={24} />;
    }
  }, []);

  const getSoilIcon = useCallback((soil) => {
    // Return appropriate soil icon based on soil type
    return <Square size={24} />; // Placeholder
  }, []);

  const getStatusColor = useCallback((isActive) => {
    return isActive ? currentTheme.primary : currentTheme.error;
  }, [currentTheme.primary, currentTheme.error]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300); // Match CSS transition duration
  }, [onClose]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) {
      handleClose();
    }
  }, [handleClose]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "Not specified";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  }, []);

  const formatArea = useCallback((area) => {
    if (!area && area !== 0) return "Not specified";
    return `${parseFloat(area).toFixed(2)} ha`;
  }, []);

  // Memoize farm data with defaults
  const farmData = useMemo(() => ({
    name: farm?.name || "Unnamed Garden",
    is_active: farm?.is_active || false,
    area_hectares: farm?.area_hectares || null,
    primary_crop: farm?.primary_crop || "",
    soil_type: farm?.soil_type || "",
    location: farm?.location || "",
    created_at: farm?.created_at || null,
    description: farm?.description || "",
  }), [farm]);

  // If modal is not visible, don't render anything
  if (!visible && !isVisible) return null;

  return (
    <div 
      className={`modal-overlay ${isVisible ? 'visible' : ''}`} 
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="modal-content"
        ref={modalRef}
        tabIndex={-1}
        style={{
          backgroundColor: currentTheme.surface,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
        }}
      >
        {/* Header */}
        <div 
          className="modal-header"
          style={{
            backgroundColor: currentTheme.headerBg,
            borderBottomColor: currentTheme.divider,
          }}
        >
          <div className="title-section">
            <div 
              className="title-icon"
              style={{
                backgroundColor: currentTheme.primaryLight,
              }}
            >
              <Leaf size={32} color={currentTheme.primary} />
            </div>
            <div className="title-group">
              <h1 
                id="modal-title"
                className="modal-title"
                style={{ color: currentTheme.textPrimary }}
              >
                {farmData.name}
              </h1>
              <p 
                className="modal-subtitle"
                style={{ color: currentTheme.textSecondary }}
              >
                {farmData.is_active ? "Active Garden" : "Inactive Garden"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="close-button"
            style={{
              backgroundColor: currentTheme.surface,
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            }}
            aria-label="Close modal"
          >
            <X size={28} color={currentTheme.textSecondary} />
          </button>
        </div>

        {/* Current user indicator */}
        {currentUser && (
          <div 
            className="user-indicator"
            style={{
              backgroundColor: currentTheme.surfaceVariant,
              borderBottomColor: currentTheme.divider,
            }}
          >
            <UserCircle size={20} color={currentTheme.textSecondary} />
            <span 
              className="user-text"
              style={{ color: currentTheme.textSecondary }}
              title={currentUser.name || currentUser.email || "Unknown User"}
            >
              Viewing as: {currentUser.name || currentUser.email || "Unknown User"}
            </span>
          </div>
        )}

        <div className="modal-scroll-content">
          {/* Garden Info Card */}
          <div 
            className="info-card"
            style={{
              backgroundColor: currentTheme.cardBg,
              borderColor: currentTheme.border,
            }}
          >
            <h2 
              className="card-title"
              style={{
                color: currentTheme.textPrimary,
                borderBottomColor: currentTheme.divider,
              }}
            >
              Garden Information
            </h2>

            <div className="info-row">
              <Square size={24} color={currentTheme.textSecondary} />
              <div className="info-text-group">
                <span 
                  className="info-label"
                  style={{ color: currentTheme.textSecondary }}
                >
                  Area
                </span>
                <span 
                  className="info-value"
                  style={{ color: currentTheme.textPrimary }}
                >
                  {formatArea(farmData.area_hectares)}
                </span>
              </div>
            </div>

            {farmData.primary_crop && (
              <div className="info-row">
                {getCropIcon(farmData.primary_crop)}
                <div className="info-text-group">
                  <span 
                    className="info-label"
                    style={{ color: currentTheme.textSecondary }}
                  >
                    Primary Crop
                  </span>
                  <span 
                    className="info-value"
                    style={{ color: currentTheme.textPrimary }}
                  >
                    {farmData.primary_crop}
                  </span>
                </div>
              </div>
            )}

            {farmData.soil_type && (
              <div className="info-row">
                {getSoilIcon(farmData.soil_type)}
                <div className="info-text-group">
                  <span 
                    className="info-label"
                    style={{ color: currentTheme.textSecondary }}
                  >
                    Soil Type
                  </span>
                  <span 
                    className="info-value"
                    style={{ color: currentTheme.textPrimary }}
                  >
                    {farmData.soil_type}
                  </span>
                </div>
              </div>
            )}

            {farmData.location && (
              <div className="info-row">
                <MapPin size={24} color={currentTheme.textSecondary} />
                <div className="info-text-group">
                  <span 
                    className="info-label"
                    style={{ color: currentTheme.textSecondary }}
                  >
                    Location
                  </span>
                  <span 
                    className="info-value"
                    style={{ color: currentTheme.textPrimary }}
                  >
                    {farmData.location}
                  </span>
                </div>
              </div>
            )}

            <div className="info-row">
              {farmData.is_active ? (
                <CircleCheck size={24} color={getStatusColor(farmData.is_active)} />
              ) : (
                <CircleX size={24} color={getStatusColor(farmData.is_active)} />
              )}
              <div className="info-text-group">
                <span 
                  className="info-label"
                  style={{ color: currentTheme.textSecondary }}
                >
                  Status
                </span>
                <span 
                  className="info-value"
                  style={{ color: getStatusColor(farmData.is_active) }}
                >
                  {farmData.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {farmData.created_at && (
              <div className="info-row">
                <Calendar size={24} color={currentTheme.textSecondary} />
                <div className="info-text-group">
                  <span 
                    className="info-label"
                    style={{ color: currentTheme.textSecondary }}
                  >
                    Created
                  </span>
                  <span 
                    className="info-value"
                    style={{ color: currentTheme.textPrimary }}
                  >
                    {formatDate(farmData.created_at)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Description Card */}
          {farmData.description && (
            <div 
              className="info-card"
              style={{
                backgroundColor: currentTheme.cardBg,
                borderColor: currentTheme.border,
              }}
            >
              <h2 
                className="card-title"
                style={{
                  color: currentTheme.textPrimary,
                  borderBottomColor: currentTheme.divider,
                }}
              >
                Description
              </h2>
              <div className="description-container">
                <Square size={24} color={currentTheme.textSecondary} />
                <p 
                  className="description-text"
                  style={{ color: currentTheme.textPrimary }}
                >
                  {farmData.description}
                </p>
              </div>
            </div>
          )}

          {/* Quick Stats Card */}
          <div 
            className="info-card"
            style={{
              backgroundColor: currentTheme.cardBg,
              borderColor: currentTheme.border,
            }}
          >
            <h2 
              className="card-title"
              style={{
                color: currentTheme.textPrimary,
                borderBottomColor: currentTheme.divider,
              }}
            >
              Quick Stats
            </h2>
            <div className="stats-grid">
              <div 
                className="stat-item"
                style={{
                  backgroundColor: currentTheme.surfaceVariant,
                  borderColor: currentTheme.border,
                }}
              >
                <Droplets size={20} color={currentTheme.accent} />
                <span 
                  className="stat-value"
                  style={{ color: currentTheme.textPrimary }}
                >
                  0
                </span>
                <span 
                  className="stat-label"
                  style={{ color: currentTheme.textSecondary }}
                >
                  Irrigation
                </span>
              </div>
              <div 
                className="stat-item"
                style={{
                  backgroundColor: currentTheme.surfaceVariant,
                  borderColor: currentTheme.border,
                }}
              >
                <Flask size={20} color={currentTheme.secondary} />
                <span 
                  className="stat-value"
                  style={{ color: currentTheme.textPrimary }}
                >
                  0
                </span>
                <span 
                  className="stat-label"
                  style={{ color: currentTheme.textSecondary }}
                >
                  Fertilizers
                </span>
              </div>
              <div 
                className="stat-item"
                style={{
                  backgroundColor: currentTheme.surfaceVariant,
                  borderColor: currentTheme.border,
                }}
              >
                <Bug size={20} color={currentTheme.error} />
                <span 
                  className="stat-value"
                  style={{ color: currentTheme.textPrimary }}
                >
                  0
                </span>
                <span 
                  className="stat-label"
                  style={{ color: currentTheme.textSecondary }}
                >
                  Pests
                </span>
              </div>
              <div 
                className="stat-item"
                style={{
                  backgroundColor: currentTheme.surfaceVariant,
                  borderColor: currentTheme.border,
                }}
              >
                <TrendingUp size={20} color={currentTheme.primary} />
                <span 
                  className="stat-value"
                  style={{ color: currentTheme.textPrimary }}
                >
                  0
                </span>
                <span 
                  className="stat-label"
                  style={{ color: currentTheme.textSecondary }}
                >
                  Harvests
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div 
          className="action-buttons"
          style={{
            borderTopColor: currentTheme.divider,
            backgroundColor: currentTheme.surface,
          }}
        >
          {onDelete && (
            <button
              onClick={onDelete}
              className="action-button delete-button"
              style={{
                backgroundColor: currentTheme.error,
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
              aria-label="Delete garden"
            >
              <Trash2 size={22} color="#fff" />
              <span>Delete</span>
            </button>
          )}

          <button
            onClick={handleClose}
            className="action-button cancel-button"
            style={{
              backgroundColor: currentTheme.surfaceVariant,
              borderColor: currentTheme.border,
            }}
            aria-label="Close"
          >
            <X size={22} color={currentTheme.textSecondary} />
            <span style={{ color: currentTheme.textSecondary }}>Close</span>
          </button>

          {onEdit && (
            <button
              onClick={onEdit}
              className="action-button edit-button"
              style={{
                backgroundColor: currentTheme.primary,
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
              aria-label="Edit garden"
            >
              <Edit size={22} color="#fff" />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewFarmModal;
// components/AddEditFarmScreen.js
import { useState, useEffect } from "react";
import {
  Alert,
  LoadingSpinner,
  Modal,
  Button,
  Input,
  Select,
  Switch,
  Textarea,
  Card,
} from "./ui"; // Assume we have a UI component library
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  FaLeaf,
  FaRuler,
  FaGlobe,
  FaMapMarker,
  FaFileAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowLeft,
  FaPlusCircle,
  FaEdit,
  FaSeedling,
  FaFlower,
  FaFruitApple,
  FaWheat,
  FaSpice,
  FaGrid,
} from "react-icons/fa";

// Soil types for dropdown
const soilTypes = [
  "Loam",
  "Clay",
  "Sandy Loam",
  "Silt",
  "Peat",
  "Chalk",
  "Sand",
  "Unknown",
];

// Crop types for dropdown
const cropTypes = [
  "Vegetables",
  "Fruits",
  "Grains",
  "Herbs",
  "Flowers",
  "Mixed Crops",
  "Other",
];

// API Configuration
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || "http://localhost:5000",
  ENDPOINTS: {
    SAVE_FARM: "/api/v1/farms/save",
    UPDATE_FARM: "/api/v1/farms/update",
    GET_FARM: "/api/v1/farms",
  },
  TIMEOUT: 30000,
};

// Local Storage Utility
const LocalStorage = {
  getItem(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error("LocalStorage get error:", error);
      return null;
    }
  },

  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("LocalStorage set error:", error);
      throw error;
    }
  },

  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("LocalStorage remove error:", error);
      throw error;
    }
  },
};

// Theme Manager
const ThemeManager = {
  THEMES: {
    LIGHT: "light",
    DARK: "dark",
    GREEN: "green",
    BLUE: "blue",
  },

  getCurrentTheme() {
    try {
      return LocalStorage.getItem("app_theme") || this.THEMES.LIGHT;
    } catch (error) {
      console.error("Failed to get theme:", error);
      return this.THEMES.LIGHT;
    }
  },

  setTheme(theme) {
    try {
      LocalStorage.setItem("app_theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
      return theme;
    } catch (error) {
      console.error("Failed to set theme:", error);
      throw error;
    }
  },

  getThemeColors(theme) {
    const themes = {
      light: {
        primary: "#4CAF50",
        background: "#f8f9fa",
        card: "#ffffff",
        text: "#333333",
        textSecondary: "#666666",
        border: "#e8e8e8",
        success: "#4CAF50",
        danger: "#f44336",
        warning: "#ff9800",
        info: "#2196F3",
      },
      dark: {
        primary: "#66BB6A",
        background: "#121212",
        card: "#1e1e1e",
        text: "#ffffff",
        textSecondary: "#b0b0b0",
        border: "#333333",
        success: "#66BB6A",
        danger: "#ef5350",
        warning: "#ffa726",
        info: "#42a5f5",
      },
      green: {
        primary: "#2E7D32",
        background: "#e8f5e9",
        card: "#ffffff",
        text: "#1b5e20",
        textSecondary: "#388e3c",
        border: "#a5d6a7",
        success: "#2E7D32",
        danger: "#c62828",
        warning: "#f9a825",
        info: "#0277bd",
      },
      blue: {
        primary: "#1976D2",
        background: "#e3f2fd",
        card: "#ffffff",
        text: "#0d47a1",
        textSecondary: "#1565c0",
        border: "#90caf9",
        success: "#2E7D32",
        danger: "#d32f2f",
        warning: "#ff8f00",
        info: "#1976D2",
      },
    };

    return themes[theme] || themes.light;
  },
};

// User Storage
const UserStorage = {
  getUserData() {
    try {
      return LocalStorage.getItem("user_data");
    } catch (error) {
      console.error("Failed to get user data:", error);
      return null;
    }
  },

  getAuthToken() {
    try {
      const userData = LocalStorage.getItem("user_data");
      return userData?.access_token || null;
    } catch (error) {
      console.error("Failed to get auth token:", error);
      return null;
    }
  },

  getUserFarms() {
    try {
      const farms = LocalStorage.getItem("user_farms");
      return farms || [];
    } catch (error) {
      console.error("Failed to get user farms:", error);
      return [];
    }
  },

  saveUserFarms(farms) {
    try {
      LocalStorage.setItem("user_farms", farms);
    } catch (error) {
      console.error("Failed to save user farms:", error);
      throw error;
    }
  },
};

// API Service
const FarmAPIService = {
  async saveFarmToDatabase(farmData, authToken) {
    try {
      const endpoint = farmData.id
        ? API_CONFIG.ENDPOINTS.UPDATE_FARM
        : API_CONFIG.ENDPOINTS.SAVE_FARM;

      const url = `${API_CONFIG.BASE_URL}${endpoint}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(farmData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || errorData.message || "Failed to save farm"
        );
      }

      return await response.json();
    } catch (error) {
      console.error("API save error:", error);
      throw error;
    }
  },

  async getFarmFromDatabase(farmId, authToken) {
    try {
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GET_FARM}/${farmId}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch farm");
      }

      return await response.json();
    } catch (error) {
      console.error("API fetch error:", error);
      throw error;
    }
  },
};

export default function AddEditFarmScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { farmId } = useParams();

  const mode = farmId ? "edit" : "add";
  const initialFarmData = location.state?.farmData || null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [currentTheme, setCurrentTheme] = useState(ThemeManager.THEMES.LIGHT);
  const [themeColors, setThemeColors] = useState(
    ThemeManager.getThemeColors(ThemeManager.THEMES.LIGHT)
  );

  const [farm, setFarm] = useState({
    name: "",
    area_hectares: "",
    primary_crop: "",
    soil_type: "",
    description: "",
    location: "",
    is_active: true,
  });

  useEffect(() => {
    initializeScreen();
    loadTheme();

    // Apply theme to body
    document.body.style.backgroundColor = themeColors.background;
    document.body.style.color = themeColors.text;

    return () => {
      // Cleanup if needed
    };
  }, []);

  useEffect(() => {
    // Update styles when theme changes
    document.body.style.backgroundColor = themeColors.background;
    document.body.style.color = themeColors.text;
  }, [themeColors]);

  const loadTheme = () => {
    try {
      const theme = ThemeManager.getCurrentTheme();
      setCurrentTheme(theme);
      setThemeColors(ThemeManager.getThemeColors(theme));
    } catch (error) {
      console.error("Failed to load theme:", error);
    }
  };

  const initializeScreen = async () => {
    try {
      const user = UserStorage.getUserData();
      const token = UserStorage.getAuthToken();

      if (!user || !token) {
        Alert.error("User not found. Please login again.");
        navigate("/login");
        return;
      }

      setUserData(user);
      setAuthToken(token);

      if (mode === "edit") {
        if (initialFarmData) {
          setFarm({
            name: initialFarmData.name || "",
            area_hectares: initialFarmData.area_hectares?.toString() || "",
            primary_crop: initialFarmData.primary_crop || "",
            soil_type: initialFarmData.soil_type || "",
            description: initialFarmData.description || "",
            location: initialFarmData.location || "",
            is_active: initialFarmData.is_active ?? true,
          });
        } else if (farmId) {
          // Fetch farm data from API
          const farmData = await FarmAPIService.getFarmFromDatabase(
            farmId,
            token
          );
          setFarm({
            name: farmData.name || "",
            area_hectares: farmData.area_hectares?.toString() || "",
            primary_crop: farmData.primary_crop || "",
            soil_type: farmData.soil_type || "",
            description: farmData.description || "",
            location: farmData.location || "",
            is_active: farmData.is_active ?? true,
          });
        }
      }
    } catch (error) {
      console.error("Failed to initialize farm screen:", error);
      Alert.error("Failed to load farm data");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!farm.name.trim()) {
      Alert.error("Garden name is required");
      return false;
    }

    const area = parseFloat(farm.area_hectares);
    if (isNaN(area) || area <= 0) {
      Alert.error("Area must be a number greater than 0");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const area = parseFloat(farm.area_hectares);
      const farmDataForAPI = {
        name: farm.name.trim(),
        area_hectares: area,
        primary_crop: farm.primary_crop || null,
        soil_type: farm.soil_type || null,
        description: farm.description.trim() || null,
        location: farm.location.trim() || null,
        is_active: farm.is_active,
        user_id: userData.id,
      };

      if (mode === "edit" && farmId) {
        farmDataForAPI.id = farmId;
      }

      // Save to database via API
      const apiResult = await FarmAPIService.saveFarmToDatabase(
        farmDataForAPI,
        authToken
      );

      // Update local storage
      const existingFarms = UserStorage.getUserFarms();
      let updatedFarms = [];

      if (mode === "edit" && farmId) {
        updatedFarms = existingFarms.map((f) =>
          f.id === farmId
            ? {
                ...f,
                ...farmDataForAPI,
                updated_at: new Date().toISOString(),
                synced: true,
              }
            : f
        );
      } else {
        const newFarm = {
          id: apiResult.id || `farm_${Date.now()}_${userData.id}`,
          ...farmDataForAPI,
          created_at: new Date().toISOString(),
          synced: true,
        };
        updatedFarms = [...existingFarms, newFarm];
      }

      UserStorage.saveUserFarms(updatedFarms);

      Alert.success(
        mode === "edit"
          ? "Garden updated successfully!"
          : "Garden added successfully!"
      );

      navigate("/farms", { state: { refresh: true } });
    } catch (error) {
      console.error("Failed to save farm:", error);

      // Try local save as fallback
      try {
        await handleLocalSave();
        Alert.warning(
          "Saved locally only. Could not connect to server. Data will sync when connection is restored."
        );
        navigate("/farms", { state: { refresh: true } });
      } catch (localError) {
        Alert.error(
          "Failed to save garden. Please check your connection and try again."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLocalSave = () => {
    const area = parseFloat(farm.area_hectares);
    const existingFarms = UserStorage.getUserFarms();
    let updatedFarms = [];

    if (mode === "edit" && farmId) {
      updatedFarms = existingFarms.map((f) =>
        f.id === farmId
          ? {
              ...f,
              name: farm.name.trim(),
              area_hectares: area,
              primary_crop: farm.primary_crop,
              soil_type: farm.soil_type,
              description: farm.description.trim(),
              location: farm.location.trim(),
              is_active: farm.is_active,
              updated_at: new Date().toISOString(),
              synced: false,
            }
          : f
      );
    } else {
      const newFarm = {
        id: `farm_${Date.now()}_${userData.id}`,
        name: farm.name.trim(),
        area_hectares: area,
        primary_crop: farm.primary_crop,
        soil_type: farm.soil_type,
        description: farm.description.trim(),
        location: farm.location.trim(),
        is_active: farm.is_active,
        user_id: userData.id,
        created_at: new Date().toISOString(),
        synced: false,
      };
      updatedFarms = [...existingFarms, newFarm];
    }

    UserStorage.saveUserFarms(updatedFarms);
  };

  const handleCancel = () => {
    navigate("/farms");
  };

  const handleInputChange = (field, value) => {
    setFarm((prev) => ({ ...prev, [field]: value }));
  };

  const getCropIcon = (crop) => {
    switch (crop) {
      case "Vegetables":
        return <FaSeedling />;
      case "Fruits":
        return <FaFruitApple />;
      case "Grains":
        return <FaWheat />;
      case "Herbs":
        return <FaSpice />;
      case "Flowers":
        return <FaFlower />;
      case "Mixed Crops":
        return <FaGrid />;
      default:
        return <FaLeaf />;
    }
  };

  if (loading) {
    return (
      <div
        className="loading-container"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: themeColors.background,
        }}
      >
        <div
          className="loading-content"
          style={{
            textAlign: "center",
            padding: "40px",
          }}
        >
          <div
            className="loading-icon"
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "60px",
              backgroundColor: `${themeColors.primary}20`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              margin: "0 auto 32px",
            }}
          >
            {mode === "edit" ? (
              <FaEdit size={48} color={themeColors.primary} />
            ) : (
              <FaPlusCircle size={48} color={themeColors.primary} />
            )}
          </div>
          <h2
            className="loading-title"
            style={{
              fontSize: "28px",
              fontWeight: "800",
              marginBottom: "16px",
              color: themeColors.text,
            }}
          >
            {mode === "edit" ? "Loading Garden..." : "Preparing New Garden"}
          </h2>
          <LoadingSpinner color={themeColors.primary} size="large" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="add-edit-farm-screen"
      style={{
        minHeight: "100vh",
        backgroundColor: themeColors.background,
        paddingBottom: "60px",
      }}
    >
      {/* Header */}
      <header
        className="farm-header"
        style={{
          backgroundColor: themeColors.primary,
          paddingTop: "70px",
          paddingBottom: "40px",
          paddingLeft: "24px",
          paddingRight: "24px",
          borderBottomLeftRadius: "40px",
          borderBottomRightRadius: "40px",
          marginBottom: "32px",
        }}
      >
        <div
          className="header-content"
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <button
            onClick={handleCancel}
            className="back-button"
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "30px",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              border: "none",
              cursor: "pointer",
              marginRight: "20px",
              color: "#fff",
            }}
          >
            <FaArrowLeft size={24} />
          </button>

          <div className="header-title-container" style={{ flex: 1 }}>
            <h1
              className="title"
              style={{
                fontSize: "32px",
                fontWeight: "900",
                color: "#fff",
                marginBottom: "8px",
              }}
            >
              {mode === "edit" ? "Edit Garden" : "Add New Garden"}
            </h1>
            <p
              className="subtitle"
              style={{
                fontSize: "16px",
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              {mode === "edit"
                ? "Update your garden details"
                : "Create a new garden to manage"}
            </p>
          </div>
        </div>
      </header>

      {/* Form */}
      <main
        className="form-container"
        style={{
          paddingLeft: "24px",
          paddingRight: "24px",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        {/* Garden Name */}
        <div className="form-group" style={{ marginBottom: "28px" }}>
          <label
            className="form-label"
            style={{
              fontSize: "20px",
              fontWeight: "800",
              color: themeColors.text,
              marginBottom: "12px",
              display: "block",
            }}
          >
            Garden Name{" "}
            <span style={{ color: "#f44336", fontWeight: "900" }}>*</span>
          </label>
          <div
            className="input-container"
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: themeColors.card,
              borderRadius: "20px",
              border: `2px solid ${themeColors.border}`,
              overflow: "hidden",
            }}
          >
            <span
              className="input-icon"
              style={{
                marginLeft: "20px",
                marginRight: "16px",
                color: themeColors.primary,
              }}
            >
              <FaLeaf size={20} />
            </span>
            <Input
              type="text"
              value={farm.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter garden name"
              style={{
                flex: 1,
                fontSize: "20px",
                fontWeight: "600",
                color: themeColors.text,
                padding: "20px 20px 20px 0",
                border: "none",
                outline: "none",
                backgroundColor: "transparent",
                minHeight: "60px",
              }}
              autoFocus
            />
          </div>
        </div>

        {/* Area */}
        <div className="form-group" style={{ marginBottom: "28px" }}>
          <label
            className="form-label"
            style={{
              fontSize: "20px",
              fontWeight: "800",
              color: themeColors.text,
              marginBottom: "12px",
              display: "block",
            }}
          >
            Area (hectares){" "}
            <span style={{ color: "#f44336", fontWeight: "900" }}>*</span>
          </label>
          <div
            className="input-container"
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: themeColors.card,
              borderRadius: "20px",
              border: `2px solid ${themeColors.border}`,
              overflow: "hidden",
            }}
          >
            <span
              className="input-icon"
              style={{
                marginLeft: "20px",
                marginRight: "16px",
                color: themeColors.primary,
              }}
            >
              <FaRuler size={20} />
            </span>
            <Input
              type="number"
              step="0.01"
              value={farm.area_hectares}
              onChange={(e) =>
                handleInputChange("area_hectares", e.target.value)
              }
              placeholder="0.0"
              style={{
                flex: 1,
                fontSize: "20px",
                fontWeight: "600",
                color: themeColors.text,
                padding: "20px 20px 20px 0",
                border: "none",
                outline: "none",
                backgroundColor: "transparent",
                minHeight: "60px",
              }}
            />
            <span
              className="input-suffix"
              style={{
                padding: "0 24px",
                backgroundColor: themeColors.background,
                borderLeft: `2px solid ${themeColors.border}`,
                height: "100%",
                display: "flex",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: themeColors.textSecondary,
                }}
              >
                ha
              </span>
            </span>
          </div>
        </div>

        {/* Primary Crop */}
        <div className="form-group" style={{ marginBottom: "28px" }}>
          <label
            className="form-label"
            style={{
              fontSize: "20px",
              fontWeight: "800",
              color: themeColors.text,
              marginBottom: "12px",
              display: "block",
            }}
          >
            Primary Crop Type
          </label>
          <div
            className="picker-container"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            {cropTypes.map((crop) => (
              <button
                key={crop}
                onClick={() => handleInputChange("primary_crop", crop)}
                className={`picker-option ${
                  farm.primary_crop === crop ? "selected" : ""
                }`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "16px 20px",
                  borderRadius: "20px",
                  backgroundColor:
                    farm.primary_crop === crop
                      ? themeColors.primary
                      : themeColors.card,
                  border: `2px solid ${
                    farm.primary_crop === crop
                      ? themeColors.primary
                      : themeColors.border
                  }`,
                  border: "none",
                  cursor: "pointer",
                  minWidth: "140px",
                  transition: "all 0.3s ease",
                }}
              >
                <span
                  className="picker-icon"
                  style={{
                    marginRight: "12px",
                    color:
                      farm.primary_crop === crop
                        ? "#fff"
                        : themeColors.textSecondary,
                  }}
                >
                  {getCropIcon(crop)}
                </span>
                <span
                  className="picker-text"
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    color:
                      farm.primary_crop === crop
                        ? "#fff"
                        : themeColors.textSecondary,
                  }}
                >
                  {crop}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Soil Type */}
        <div className="form-group" style={{ marginBottom: "28px" }}>
          <label
            className="form-label"
            style={{
              fontSize: "20px",
              fontWeight: "800",
              color: themeColors.text,
              marginBottom: "12px",
              display: "block",
            }}
          >
            Soil Type
          </label>
          <div
            className="picker-container"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            {soilTypes.map((soil) => (
              <button
                key={soil}
                onClick={() => handleInputChange("soil_type", soil)}
                className={`picker-option ${
                  farm.soil_type === soil ? "selected" : ""
                }`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "16px 20px",
                  borderRadius: "20px",
                  backgroundColor:
                    farm.soil_type === soil
                      ? themeColors.primary
                      : themeColors.card,
                  border: `2px solid ${
                    farm.soil_type === soil
                      ? themeColors.primary
                      : themeColors.border
                  }`,
                  border: "none",
                  cursor: "pointer",
                  minWidth: "140px",
                  transition: "all 0.3s ease",
                }}
              >
                <span
                  className="picker-icon"
                  style={{
                    marginRight: "12px",
                    color:
                      farm.soil_type === soil
                        ? "#fff"
                        : themeColors.textSecondary,
                  }}
                >
                  <FaGlobe />
                </span>
                <span
                  className="picker-text"
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    color:
                      farm.soil_type === soil
                        ? "#fff"
                        : themeColors.textSecondary,
                  }}
                >
                  {soil}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="form-group" style={{ marginBottom: "28px" }}>
          <label
            className="form-label"
            style={{
              fontSize: "20px",
              fontWeight: "800",
              color: themeColors.text,
              marginBottom: "12px",
              display: "block",
            }}
          >
            Location
          </label>
          <div
            className="input-container"
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: themeColors.card,
              borderRadius: "20px",
              border: `2px solid ${themeColors.border}`,
              overflow: "hidden",
            }}
          >
            <span
              className="input-icon"
              style={{
                marginLeft: "20px",
                marginRight: "16px",
                color: themeColors.primary,
              }}
            >
              <FaMapMarker size={20} />
            </span>
            <Input
              type="text"
              value={farm.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              placeholder="Enter garden location"
              style={{
                flex: 1,
                fontSize: "20px",
                fontWeight: "600",
                color: themeColors.text,
                padding: "20px 20px 20px 0",
                border: "none",
                outline: "none",
                backgroundColor: "transparent",
                minHeight: "60px",
              }}
            />
          </div>
        </div>

        {/* Description */}
        <div className="form-group" style={{ marginBottom: "28px" }}>
          <label
            className="form-label"
            style={{
              fontSize: "20px",
              fontWeight: "800",
              color: themeColors.text,
              marginBottom: "12px",
              display: "block",
            }}
          >
            Description
          </label>
          <div
            className="textarea-container"
            style={{
              backgroundColor: themeColors.card,
              borderRadius: "20px",
              border: `2px solid ${themeColors.border}`,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <span
              className="textarea-icon"
              style={{
                position: "absolute",
                left: "20px",
                top: "24px",
                color: themeColors.primary,
              }}
            >
              <FaFileAlt size={20} />
            </span>
            <Textarea
              value={farm.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe your garden (optional)"
              rows={5}
              style={{
                width: "100%",
                fontSize: "20px",
                fontWeight: "600",
                color: themeColors.text,
                padding: "24px 20px 24px 56px",
                border: "none",
                outline: "none",
                backgroundColor: "transparent",
                resize: "vertical",
                minHeight: "140px",
              }}
            />
          </div>
        </div>

        {/* Active Status */}
        <div className="form-group" style={{ marginBottom: "28px" }}>
          <div
            className="switch-container"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: themeColors.card,
              padding: "24px",
              borderRadius: "20px",
              border: `2px solid ${themeColors.border}`,
            }}
          >
            <div
              className="switch-label-container"
              style={{
                display: "flex",
                alignItems: "center",
                flex: 1,
              }}
            >
              <span
                className="switch-icon"
                style={{
                  marginRight: "20px",
                  color: farm.is_active
                    ? themeColors.primary
                    : themeColors.textSecondary,
                }}
              >
                {farm.is_active ? (
                  <FaCheckCircle size={36} />
                ) : (
                  <FaTimesCircle size={36} />
                )}
              </span>
              <div className="switch-label-text">
                <div
                  className="form-label"
                  style={{
                    fontSize: "20px",
                    fontWeight: "800",
                    color: themeColors.text,
                    marginBottom: "6px",
                  }}
                >
                  Active Status
                </div>
                <div
                  className="switch-subtitle"
                  style={{
                    fontSize: "16px",
                    color: themeColors.textSecondary,
                  }}
                >
                  {farm.is_active
                    ? "Garden is currently active"
                    : "Garden is currently inactive"}
                </div>
              </div>
            </div>
            <Switch
              checked={farm.is_active}
              onChange={(checked) => handleInputChange("is_active", checked)}
              color={themeColors.primary}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className="action-buttons"
          style={{
            display: "flex",
            gap: "20px",
            marginTop: "40px",
            marginBottom: "20px",
          }}
        >
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: themeColors.card,
              padding: "22px",
              borderRadius: "20px",
              border: `2px solid ${themeColors.border}`,
              cursor: "pointer",
              gap: "12px",
            }}
          >
            <FaTimesCircle size={20} color={themeColors.textSecondary} />
            <span
              style={{
                fontSize: "20px",
                fontWeight: "800",
                color: themeColors.textSecondary,
              }}
            >
              Cancel
            </span>
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving}
            loading={saving}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: themeColors.primary,
              padding: "22px",
              borderRadius: "20px",
              border: "none",
              cursor: "pointer",
              gap: "12px",
              boxShadow: `0 8px 16px ${themeColors.primary}66`,
            }}
          >
            {!saving && (
              <>
                {mode === "edit" ? (
                  <FaCheckCircle size={20} color="#fff" />
                ) : (
                  <FaPlusCircle size={20} color="#fff" />
                )}
                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: "900",
                    color: "#fff",
                  }}
                >
                  {mode === "edit" ? "Update Garden" : "Add Garden"}
                </span>
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}

// CSS Styles (could be moved to a separate CSS file)
const styles = `
.add-edit-farm-screen {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
}

.picker-option:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.back-button:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .back-button {
    margin-bottom: 20px;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .picker-container {
    justify-content: center;
  }
}
`;

// Inject styles
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

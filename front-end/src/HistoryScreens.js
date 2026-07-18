// HistoryScreen.jsx
import React, { useState, useEffect, useCallback } from "react";
import "./HistoryScreen.css";

// Replace Ionicons with an icon library for web (FontAwesome or use emoji)
const Icon = ({ name, size = 20, color = "#000" }) => {
  const iconMap = {
    "arrow-back": "←",
    "cube-outline": "📊",
    "cloud-outline": "☁️",
    wifi: "📶",
    "wifi-outline": "📶",
    "document-text-outline": "📄",
    camera: "📸",
    "time-outline": "⏱️",
    leaf: "🍃",
    "arrow-forward": "→",
  };

  return (
    <span className="icon" style={{ fontSize: `${size}px`, color }}>
      {iconMap[name] || "📄"}
    </span>
  );
};

// Storage Service for Web
const StorageService = {
  async getAuthToken() {
    try {
      return localStorage.getItem("access_token");
    } catch (error) {
      console.error("Failed to get auth token:", error);
      return null;
    }
  },

  async setAuthToken(token) {
    localStorage.setItem("access_token", token);
  },

  async getUserData() {
    try {
      const userData = localStorage.getItem("user_data");
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error("Failed to get user data:", error);
      return null;
    }
  },

  async setUserData(userData) {
    localStorage.setItem("user_data", JSON.stringify(userData));
  },

  async isLoggedIn() {
    try {
      const token = await this.getAuthToken();
      const isLoggedIn = localStorage.getItem("is_logged_in");
      return !!(token && isLoggedIn === "true");
    } catch (error) {
      console.error("Failed to check login status:", error);
      return false;
    }
  },

  async setIsLoggedIn(status) {
    localStorage.setItem("is_logged_in", status);
  },

  async clearAllData() {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_data");
      localStorage.removeItem("is_logged_in");
      return true;
    } catch (error) {
      console.error("Failed to clear all data:", error);
      return false;
    }
  },
};

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const API_ENDPOINTS = {
  profile: `${API_BASE_URL}/api/v1/auth/profile`,
  predictionHistory: `${API_BASE_URL}/api/v1/predictions/history`,
  logout: `${API_BASE_URL}/api/v1/auth/logout`,
};

// API Service using fetch
const ApiService = {
  async getAuthHeaders() {
    const token = await StorageService.getAuthToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  },

  async fetchPredictionHistory(limit = 20, offset = 0) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_ENDPOINTS.predictionHistory}?limit=${limit}&offset=${offset}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to fetch prediction history:", error);
      throw error;
    }
  },

  async checkApiConnection() {
    try {
      const token = await StorageService.getAuthToken();
      const response = await fetch(API_ENDPOINTS.profile, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  },
};

// Mock Data Generator
const MockDataService = {
  generateMockPredictions(userId, count = 15) {
    const predictions = [];
    const biomassTypes = [
      { type: "High", threshold: 2000, color: "#4CAF50" },
      { type: "Medium", threshold: 1000, color: "#FF9800" },
      { type: "Low", threshold: 0, color: "#f44336" },
    ];

    const farmNames = [
      "Home Garden",
      "Backyard Orchard",
      "Herb Garden",
      "Urban Farm",
    ];
    const locations = ["Backyard", "Front yard", "Side yard", "Greenhouse"];

    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const totalBiomass = Math.random() * 3000;
      const biomassStatus = biomassTypes.find(
        (type) => totalBiomass > type.threshold
      );

      predictions.push({
        id: `prediction-${userId}-${i}`,
        image_id: `img_${userId}_${i}`,
        prediction_id: `pred_${userId}_${i}_${Date.now()}`,
        dry_total_g: totalBiomass,
        dry_green_g: totalBiomass * 0.7,
        dry_dead_g: totalBiomass * 0.2,
        dry_clover_g: totalBiomass * 0.1,
        gdm_g: totalBiomass * 0.8,
        confidence_score: Math.random() * 0.3 + 0.6,
        processing_time: (Math.random() * 5 + 1).toFixed(1),
        model_version: "v1.0.0",
        created_at: new Date(Date.now() - daysAgo * 86400000).toISOString(),
        image_uri: `https://picsum.photos/seed/${userId}-${i}/300/300`,
        metadata: {
          farm_name: farmNames[Math.floor(Math.random() * farmNames.length)],
          location: locations[Math.floor(Math.random() * locations.length)],
        },
        biomass_status: biomassStatus.type,
        status_color: biomassStatus.color,
      });
    }

    return predictions.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  },
};

// Responsive Utils
const useResponsive = () => {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    width,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
  };
};

// Header Component
const Header = ({
  onBack,
  isDesktop,
  isTablet,
  totalCount,
  dataMode,
  apiConnected,
  onToggleDataMode,
}) => (
  <div className="history-header">
    <div className="header-top">
      <button
        className={`back-button ${isDesktop ? "desktop" : ""} ${
          isTablet ? "tablet" : ""
        }`}
        onClick={onBack}
      >
        <Icon
          name="arrow-back"
          size={isDesktop ? 28 : isTablet ? 26 : 24}
          color="#fff"
        />
        <span className="back-button-text">Back</span>
      </button>

      <div className="header-content">
        <h1
          className={`history-title ${isDesktop ? "desktop" : ""} ${
            isTablet ? "tablet" : ""
          }`}
        >
          Scan History
        </h1>
        <p
          className={`history-subtitle ${isDesktop ? "desktop" : ""} ${
            isTablet ? "tablet" : ""
          }`}
        >
          {totalCount} total scans • {dataMode === "live" ? "Live" : "Demo"}{" "}
          Data
        </p>

        <div
          className={`data-mode-container ${isDesktop ? "desktop" : ""} ${
            isTablet ? "tablet" : ""
          }`}
        >
          <div className="data-mode-buttons">
            <button
              className={`data-mode-button ${
                dataMode === "demo" ? "active" : ""
              }`}
              onClick={() => onToggleDataMode("demo")}
              style={{
                backgroundColor:
                  dataMode === "demo" ? "#FF9800" : "rgba(255, 255, 255, 0.2)",
              }}
            >
              <Icon
                name="cube-outline"
                size={isDesktop ? 20 : isTablet ? 18 : 16}
                color={dataMode === "demo" ? "#fff" : "#fff"}
              />
              <span className="data-mode-button-text">Demo Data</span>
            </button>

            <button
              className={`data-mode-button ${
                dataMode === "live" ? "active" : ""
              } ${!apiConnected ? "disabled" : ""}`}
              onClick={() => onToggleDataMode("live")}
              disabled={!apiConnected}
              style={{
                backgroundColor:
                  dataMode === "live" ? "#4CAF50" : "rgba(255, 255, 255, 0.2)",
              }}
            >
              <Icon
                name="cloud-outline"
                size={isDesktop ? 20 : isTablet ? 18 : 16}
                color={dataMode === "live" ? "#fff" : "#fff"}
              />
              <span
                className={`data-mode-button-text ${
                  !apiConnected ? "disabled" : ""
                }`}
              >
                Live Data
              </span>
            </button>
          </div>

          <div className="api-status">
            <Icon
              name={apiConnected ? "wifi" : "wifi-outline"}
              size={isDesktop ? 16 : isTablet ? 14 : 12}
              color={apiConnected ? "#fff" : "rgba(255, 255, 255, 0.6)"}
            />
            <span className="api-status-text">
              {apiConnected ? "API Connected" : "API Offline"}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Prediction Item Component
const PredictionItem = ({
  item,
  index,
  isDesktop,
  isTablet,
  onViewDetails,
}) => {
  const getBiomassStatus = (totalBiomass) => {
    if (totalBiomass > 2000) return { status: "High", color: "#4CAF50" };
    if (totalBiomass > 1000) return { status: "Medium", color: "#FF9800" };
    return { status: "Low", color: "#f44336" };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const status = getBiomassStatus(item.dry_total_g);

  return (
    <div
      className={`prediction-card ${isDesktop ? "desktop" : ""} ${
        isTablet ? "tablet" : ""
      }`}
    >
      <div className="prediction-image-container">
        {item.image_uri ? (
          <img
            src={item.image_uri}
            alt={`Scan ${index + 1}`}
            className="prediction-image"
          />
        ) : (
          <div className="image-placeholder">
            <Icon name="leaf" size={32} color="#9E9E9E" />
            <span className="placeholder-text">No Image</span>
          </div>
        )}
      </div>

      <div className="prediction-content">
        <div className="prediction-header">
          <div className="header-left">
            <span
              className={`scan-number ${isDesktop ? "desktop" : ""} ${
                isTablet ? "tablet" : ""
              }`}
            >
              Scan #{index + 1}
            </span>
            <span
              className={`scan-date ${isDesktop ? "desktop" : ""} ${
                isTablet ? "tablet" : ""
              }`}
            >
              {formatDate(item.created_at)}
            </span>
          </div>

          <div
            className="status-badge"
            style={{ backgroundColor: status.color }}
          >
            <span className="status-text">{status.status}</span>
          </div>
        </div>

        <div className="biomass-metrics">
          <div className="metric">
            <span className="metric-label">Total</span>
            <span className="metric-value">{item.dry_total_g.toFixed(1)}g</span>
          </div>
          <div className="metric">
            <span className="metric-label">Green</span>
            <span className="metric-value green">
              {item.dry_green_g.toFixed(1)}g
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">Confidence</span>
            <span className="metric-value blue">
              {(item.confidence_score * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="prediction-footer">
          <div className="footer-left">
            <Icon name="time-outline" size={14} color="#666" />
            <span className="processing-time">{item.processing_time}s</span>
            {item.metadata?.farm_name && (
              <span className="farm-name">• {item.metadata.farm_name}</span>
            )}
          </div>

          <button
            className={`view-details-button ${isDesktop ? "desktop" : ""} ${
              isTablet ? "tablet" : ""
            }`}
            onClick={() => onViewDetails(item)}
          >
            <span
              className={`view-details-button-text ${
                isDesktop ? "desktop" : ""
              } ${isTablet ? "tablet" : ""}`}
            >
              View Details
            </span>
            <Icon
              name="arrow-forward"
              size={isDesktop ? 18 : isTablet ? 16 : 14}
              color="#4CAF50"
            />
          </button>
        </div>
      </div>
    </div>
  );
};

// Empty State Component
const EmptyState = ({ isDesktop, isTablet, dataMode, onNewScan }) => (
  <div className="empty-state">
    <Icon
      name="document-text-outline"
      size={isDesktop ? 80 : isTablet ? 70 : 60}
      color="#9E9E9E"
    />
    <h2
      className={`empty-state-title ${isDesktop ? "desktop" : ""} ${
        isTablet ? "tablet" : ""
      }`}
    >
      No Scan History
    </h2>
    <p
      className={`empty-state-text ${isDesktop ? "desktop" : ""} ${
        isTablet ? "tablet" : ""
      }`}
    >
      {dataMode === "live"
        ? "Start scanning to see your prediction history here"
        : "Take your first scan to see demo predictions appear here"}
    </p>
    <button
      className={`new-scan-button ${isDesktop ? "desktop" : ""} ${
        isTablet ? "tablet" : ""
      }`}
      onClick={onNewScan}
    >
      <Icon name="camera" size={20} color="#fff" />
      <span
        className={`new-scan-button-text ${isDesktop ? "desktop" : ""} ${
          isTablet ? "tablet" : ""
        }`}
      >
        Take First Scan
      </span>
    </button>
  </div>
);

// Loading Component
const LoadingState = () => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <span className="loading-text">Loading History...</span>
  </div>
);

// Main HistoryScreen Component
export default function HistoryScreen() {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dataMode, setDataMode] = useState("demo");
  const [apiConnected, setApiConnected] = useState(false);
  const [userData, setUserData] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Initialize screen
  useEffect(() => {
    initializeScreen();
  }, []);

  // Load predictions when data mode changes
  useEffect(() => {
    if (userData && !loading) {
      loadPredictions();
    }
  }, [dataMode]);

  const initializeScreen = async () => {
    try {
      // Check login status
      const isLoggedIn = await StorageService.isLoggedIn();
      if (!isLoggedIn) {
        window.location.href = "/login";
        return;
      }

      // Load user data
      const user = await StorageService.getUserData();
      setUserData(user);

      // Check API connection
      const connected = await ApiService.checkApiConnection();
      setApiConnected(connected);

      // Set initial data mode based on API status
      setDataMode(connected ? "live" : "demo");

      // Load predictions
      await loadPredictions();
    } catch (error) {
      console.error("Failed to initialize:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPredictions = async (pageNum = 1) => {
    try {
      if (pageNum === 1) {
        setRefreshing(true);
      } else {
        setLoadingMore(true);
      }

      if (dataMode === "demo") {
        const mockData = MockDataService.generateMockPredictions(
          userData?.id || "demo",
          20
        );
        setPredictions(mockData);
        setTotalCount(mockData.length);
        setHasMore(false);
      } else {
        const limit = 20;
        const offset = (pageNum - 1) * limit;
        const historyData = await ApiService.fetchPredictionHistory(
          limit,
          offset
        );

        if (pageNum === 1) {
          setPredictions(historyData.predictions || []);
        } else {
          setPredictions((prev) => [
            ...prev,
            ...(historyData.predictions || []),
          ]);
        }

        const total =
          historyData.total_count || historyData.predictions?.length || 0;
        setTotalCount(total);
        setPage(pageNum);
        setHasMore(
          predictions.length + (historyData.predictions?.length || 0) < total
        );
      }
    } catch (error) {
      console.error("Failed to load predictions:", error);
      // Fallback to demo data if live data fails
      if (dataMode === "live") {
        const mockData = MockDataService.generateMockPredictions(
          userData?.id || "demo",
          20
        );
        setPredictions(mockData);
        setTotalCount(mockData.length);
        setHasMore(false);
      }
    } finally {
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = useCallback(() => {
    loadPredictions(1);
  }, [dataMode]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore || dataMode === "demo") return;
    loadPredictions(page + 1);
  }, [loadingMore, hasMore, page, dataMode]);

  const handleToggleDataMode = (mode) => {
    setDataMode(mode);
  };

  const handleViewDetails = (prediction) => {
    // Navigate to prediction details page
    window.location.href = `/prediction/${prediction.id}`;
  };

  const handleNewScan = () => {
    // Navigate to camera/scanner page
    window.location.href = "/scan";
  };

  const handleBack = () => {
    window.history.back();
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="history-container">
      <Header
        onBack={handleBack}
        isDesktop={isDesktop}
        isTablet={isTablet}
        totalCount={totalCount}
        dataMode={dataMode}
        apiConnected={apiConnected}
        onToggleDataMode={handleToggleDataMode}
      />

      <div className="history-content">
        {predictions.length === 0 ? (
          <EmptyState
            isDesktop={isDesktop}
            isTablet={isTablet}
            dataMode={dataMode}
            onNewScan={handleNewScan}
          />
        ) : (
          <>
            <div className="predictions-grid">
              {predictions.map((prediction, index) => (
                <PredictionItem
                  key={prediction.id || index}
                  item={prediction}
                  index={index}
                  isDesktop={isDesktop}
                  isTablet={isTablet}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
            {hasMore && (
              <div className="load-more-container">
                <button
                  className={`load-more-button ${loadingMore ? "loading" : ""}`}
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}

        <div className="refresh-container">
          <button className="refresh-button" onClick={handleRefresh}>
            {refreshing ? "Refreshing..." : "Refresh List"}
          </button>
        </div>
      </div>
    </div>
  );
}

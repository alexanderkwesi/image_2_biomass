// PredictionResultsScreen.jsx - React Web Version
import React, { useState, useEffect } from "react";
import "./PredictionResultsScreen.css";

const PredictionResultsScreen = ({
  prediction = "",
  imageUri = "",
  confidence = 0,
  timestamp = new Date().toISOString(),
  biomassData = "",
  onBack,
  onNewScan,
  onSave,
}) => {
  const [loading, setLoading] = useState(true);
  const [predictionData, setPredictionData] = useState(null);
  const [biomass, setBiomass] = useState({
    dry_total_g: 0,
    dry_green_g: 0,
    dry_dead_g: 0,
    dry_clover_g: 0,
    gdm_g: 0,
  });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const loadPredictionData = async () => {
      setLoading(true);
      try {
        let parsedPrediction = null;

        // Try to parse prediction data
        if (prediction && prediction !== "") {
          try {
            parsedPrediction = JSON.parse(prediction);
          } catch (parseError) {
            console.warn("Could not parse prediction string, using raw data");
            parsedPrediction = prediction;
          }
        }

        // Handle different data structures
        if (parsedPrediction) {
          setPredictionData(parsedPrediction);

          // Extract biomass data from various possible structures
          let biomassDataObj = {};

          // Case 1: biomassData string is provided separately
          if (biomassData && biomassData !== "") {
            try {
              biomassDataObj = JSON.parse(biomassData);
            } catch (e) {
              console.warn("Could not parse biomass data string");
            }
          }
          // Case 2: predictions property exists
          else if (parsedPrediction.predictions) {
            biomassDataObj = parsedPrediction.predictions;
          }
          // Case 3: Direct biomass properties exist
          else if (parsedPrediction.dry_total_g !== undefined) {
            biomassDataObj = {
              dry_total_g: parsedPrediction.dry_total_g,
              dry_green_g: parsedPrediction.dry_green_g || 0,
              dry_dead_g: parsedPrediction.dry_dead_g || 0,
              dry_clover_g: parsedPrediction.dry_clover_g || 0,
              gdm_g: parsedPrediction.gdm_g || 0,
            };
          }
          // Case 4: Different property naming (ML service format)
          else if (parsedPrediction.Dry_Total_g !== undefined) {
            biomassDataObj = {
              dry_total_g: parsedPrediction.Dry_Total_g || 0,
              dry_green_g: parsedPrediction.Dry_Green_g || 0,
              dry_dead_g: parsedPrediction.Dry_Dead_g || 0,
              dry_clover_g: parsedPrediction.Dry_Clover_g || 0,
              gdm_g: parsedPrediction.GDM_g || 0,
            };
          }

          // Normalize property names
          const normalizedBiomass = {
            dry_total_g:
              biomassDataObj.dry_total_g || biomassDataObj.Dry_Total_g || 0,
            dry_green_g:
              biomassDataObj.dry_green_g || biomassDataObj.Dry_Green_g || 0,
            dry_dead_g:
              biomassDataObj.dry_dead_g || biomassDataObj.Dry_Dead_g || 0,
            dry_clover_g:
              biomassDataObj.dry_clover_g || biomassDataObj.Dry_Clover_g || 0,
            gdm_g: biomassDataObj.gdm_g || biomassDataObj.GDM_g || 0,
          };

          setBiomass(normalizedBiomass);
        } else {
          // Fallback to mock data if no prediction data
          loadMockData();
        }
      } catch (error) {
        console.error("Error loading prediction data:", error);
        loadMockData();
      } finally {
        setLoading(false);
      }
    };

    loadPredictionData();
  }, [prediction, biomassData]);

  const loadMockData = () => {
    const mockPrediction = {
      prediction_id: `pred_mock_${Date.now()}`,
      image_id: `img_mock_${Date.now()}`,
      predictions: {
        Dry_Green_g: 1850.5,
        Dry_Dead_g: 420.3,
        Dry_Clover_g: 195.7,
        GDM_g: 2165.2,
        Dry_Total_g: 2466.5,
      },
      confidence: 0.85,
      processing_time: 2.4,
      model_version: "v1.0.0",
      created_at: new Date().toISOString(),
    };

    setPredictionData(mockPrediction);
    setBiomass({
      dry_total_g: mockPrediction.predictions.Dry_Total_g,
      dry_green_g: mockPrediction.predictions.Dry_Green_g,
      dry_dead_g: mockPrediction.predictions.Dry_Dead_g,
      dry_clover_g: mockPrediction.predictions.Dry_Clover_g,
      gdm_g: mockPrediction.predictions.GDM_g,
    });
  };

  const getBiomassStatus = (totalBiomass) => {
    if (!totalBiomass || totalBiomass <= 0)
      return { status: "Unknown", color: "#9E9E9E" };
    if (totalBiomass > 2000) return { status: "High", color: "#4CAF50" };
    if (totalBiomass > 1000) return { status: "Medium", color: "#FF9800" };
    return { status: "Low", color: "#f44336" };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown date";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const formatBiomass = (value) => {
    if (value === undefined || value === null || isNaN(value)) return "N/A";
    return `${parseFloat(value).toFixed(1)} g`;
  };

  const calculatePercentage = (part, total) => {
    if (!total || total === 0 || !part || isNaN(part) || isNaN(total)) return 0;
    return ((part / total) * 100).toFixed(1);
  };

  const handleSavePrediction = async () => {
    try {
      // Get existing history from localStorage
      const existingHistoryJSON = localStorage.getItem("predictionHistory");
      let existingHistory = [];

      if (existingHistoryJSON) {
        existingHistory = JSON.parse(existingHistoryJSON);
      }

      // Create new prediction entry
      const newPrediction = {
        id: `pred_${Date.now()}`,
        date: new Date().toISOString(),
        imageUri: imageUri,
        predictionData: predictionData,
        biomassData: biomass,
        confidence: confidence,
        timestamp: timestamp,
      };

      // Add to beginning of array (most recent first)
      existingHistory.unshift(newPrediction);

      // Save back to localStorage
      localStorage.setItem(
        "predictionHistory",
        JSON.stringify(existingHistory)
      );

      if (onSave) {
        onSave(newPrediction);
      } else {
        alert("Prediction saved to history!");
      }

      if (onBack) onBack();
    } catch (error) {
      console.error("Error saving prediction:", error);
      alert("Failed to save prediction to history.");
    }
  };

  const handleNewScan = () => {
    if (onNewScan) onNewScan();
  };

  const handleBack = () => {
    if (onBack) onBack();
  };

  const totalBiomass = biomass?.dry_total_g || 0;
  const biomassStatus = getBiomassStatus(totalBiomass);
  const confidenceScore = predictionData?.confidence || confidence || 0;

  if (loading) {
    return (
      <div className="prediction-loading-container">
        <div className="prediction-spinner"></div>
        <div className="prediction-loading-text">
          Loading prediction results...
        </div>
      </div>
    );
  }

  return (
    <div className="prediction-container">
      {/* Header with Back Button */}
      <div
        className={`prediction-header ${
          isDesktop ? "prediction-header-desktop" : ""
        } ${isTablet ? "prediction-header-tablet" : ""}`}
      >
        <button
          className={`prediction-back-button ${
            isDesktop ? "prediction-back-button-desktop" : ""
          } ${isTablet ? "prediction-back-button-tablet" : ""}`}
          onClick={handleBack}
        >
          <span className="prediction-back-arrow">←</span>
          <span
            className={`prediction-back-button-text ${
              isDesktop ? "prediction-back-button-text-desktop" : ""
            } ${isTablet ? "prediction-back-button-text-tablet" : ""}`}
          >
            Back
          </span>
        </button>

        <div className="prediction-header-content">
          <h1
            className={`prediction-title ${
              isDesktop ? "prediction-title-desktop" : ""
            } ${isTablet ? "prediction-title-tablet" : ""}`}
          >
            Biomass Analysis Results
          </h1>
          <div
            className={`prediction-subtitle ${
              isDesktop ? "prediction-subtitle-desktop" : ""
            } ${isTablet ? "prediction-subtitle-tablet" : ""}`}
          >
            {predictionData?.image_id || "Scan"} •{" "}
            {formatDate(predictionData?.created_at || timestamp)}
          </div>
        </div>
      </div>

      <div
        className={`prediction-content ${
          isDesktop ? "prediction-content-desktop" : ""
        } ${isTablet ? "prediction-content-tablet" : ""}`}
      >
        {/* Image and Confidence Section */}
        <div
          className={`prediction-image-card ${
            isDesktop ? "prediction-image-card-desktop" : ""
          } ${isTablet ? "prediction-image-card-tablet" : ""}`}
        >
          {imageUri && imageUri !== "" ? (
            <img
              src={imageUri}
              alt="Biomass scan"
              className={`prediction-image ${
                isDesktop ? "prediction-image-desktop" : ""
              } ${isTablet ? "prediction-image-tablet" : ""}`}
            />
          ) : (
            <div
              className={`prediction-image-placeholder ${
                isDesktop ? "prediction-image-desktop" : ""
              } ${isTablet ? "prediction-image-tablet" : ""}`}
            >
              <div className="prediction-leaf-icon">🍃</div>
              <div className="prediction-placeholder-text">
                No image available
              </div>
            </div>
          )}

          <div className="prediction-confidence-container">
            <div className="prediction-confidence-badge">
              <div className="prediction-confidence-label">Confidence</div>
              <div className="prediction-confidence-value">
                {(confidenceScore * 100).toFixed(1)}%
              </div>
            </div>

            <div
              className="prediction-status-badge"
              style={{ backgroundColor: biomassStatus.color }}
            >
              <div className="prediction-status-text">
                {biomassStatus.status} Biomass
              </div>
            </div>
          </div>
        </div>

        {/* Biomass Summary Card */}
        <div
          className={`prediction-summary-card ${
            isDesktop ? "prediction-summary-card-desktop" : ""
          } ${isTablet ? "prediction-summary-card-tablet" : ""}`}
        >
          <h2
            className={`prediction-section-title ${
              isDesktop ? "prediction-section-title-desktop" : ""
            } ${isTablet ? "prediction-section-title-tablet" : ""}`}
          >
            Total Biomass Estimate
          </h2>

          <div className="prediction-total-biomass-container">
            <div
              className={`prediction-total-biomass-value ${
                isDesktop ? "prediction-total-biomass-value-desktop" : ""
              } ${isTablet ? "prediction-total-biomass-value-tablet" : ""}`}
            >
              {formatBiomass(totalBiomass)}
            </div>
            <div className="prediction-total-biomass-label">
              Dry Weight Total
            </div>
          </div>

          <div className="prediction-metrics-grid">
            <div className="prediction-metric-item">
              <div className="prediction-metric-label">Green Biomass</div>
              <div
                className="prediction-metric-value"
                style={{ color: "#4CAF50" }}
              >
                {formatBiomass(biomass?.dry_green_g)}
              </div>
              <div className="prediction-metric-percentage">
                {calculatePercentage(biomass?.dry_green_g, totalBiomass)}%
              </div>
            </div>

            <div className="prediction-metric-item">
              <div className="prediction-metric-label">Dead Biomass</div>
              <div
                className="prediction-metric-value"
                style={{ color: "#795548" }}
              >
                {formatBiomass(biomass?.dry_dead_g)}
              </div>
              <div className="prediction-metric-percentage">
                {calculatePercentage(biomass?.dry_dead_g, totalBiomass)}%
              </div>
            </div>

            <div className="prediction-metric-item">
              <div className="prediction-metric-label">Clover Biomass</div>
              <div
                className="prediction-metric-value"
                style={{ color: "#2196F3" }}
              >
                {formatBiomass(biomass?.dry_clover_g)}
              </div>
              <div className="prediction-metric-percentage">
                {calculatePercentage(biomass?.dry_clover_g, totalBiomass)}%
              </div>
            </div>

            <div className="prediction-metric-item">
              <div className="prediction-metric-label">GDM (Grazing)</div>
              <div
                className="prediction-metric-value"
                style={{ color: "#FF9800" }}
              >
                {formatBiomass(biomass?.gdm_g)}
              </div>
              <div className="prediction-metric-percentage">
                {calculatePercentage(biomass?.gdm_g, totalBiomass)}%
              </div>
            </div>
          </div>
        </div>

        {/* Processing Details Card */}
        <div
          className={`prediction-details-card ${
            isDesktop ? "prediction-details-card-desktop" : ""
          } ${isTablet ? "prediction-details-card-tablet" : ""}`}
        >
          <h2
            className={`prediction-section-title ${
              isDesktop ? "prediction-section-title-desktop" : ""
            } ${isTablet ? "prediction-section-title-tablet" : ""}`}
          >
            Processing Details
          </h2>

          <div className="prediction-details-grid">
            <div className="prediction-detail-item">
              <div className="prediction-detail-icon">⏱️</div>
              <div className="prediction-detail-content">
                <div className="prediction-detail-label">Processing Time</div>
                <div className="prediction-detail-value">
                  {predictionData?.processing_time
                    ? `${parseFloat(predictionData.processing_time).toFixed(
                        1
                      )}s`
                    : "N/A"}
                </div>
              </div>
            </div>

            <div className="prediction-detail-item">
              <div className="prediction-detail-icon">🖥️</div>
              <div className="prediction-detail-content">
                <div className="prediction-detail-label">Model Version</div>
                <div className="prediction-detail-value">
                  {predictionData?.model_version || "v1.0.0"}
                </div>
              </div>
            </div>

            <div className="prediction-detail-item">
              <div className="prediction-detail-icon">📋</div>
              <div className="prediction-detail-content">
                <div className="prediction-detail-label">Prediction ID</div>
                <div
                  className="prediction-detail-value"
                  title={predictionData?.prediction_id || "N/A"}
                >
                  {predictionData?.prediction_id || "N/A"}
                </div>
              </div>
            </div>

            <div className="prediction-detail-item">
              <div className="prediction-detail-icon">🖼️</div>
              <div className="prediction-detail-content">
                <div className="prediction-detail-label">Image ID</div>
                <div
                  className="prediction-detail-value"
                  title={predictionData?.image_id || "N/A"}
                >
                  {predictionData?.image_id || "N/A"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className={`prediction-button-container ${
            isDesktop ? "prediction-button-container-desktop" : ""
          } ${isTablet ? "prediction-button-container-tablet" : ""}`}
        >
          <button
            className="prediction-button prediction-new-scan-button"
            onClick={handleNewScan}
          >
            <span className="prediction-button-icon">📷</span>
            <span className="prediction-button-text prediction-new-scan-button-text">
              New Scan
            </span>
          </button>

          <button
            className="prediction-button prediction-save-button"
            onClick={handleSavePrediction}
          >
            <span className="prediction-button-icon">💾</span>
            <span className="prediction-button-text prediction-save-button-text">
              Save to History
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PredictionResultsScreen;

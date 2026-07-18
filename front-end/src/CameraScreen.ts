// components/CameraScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CameraView from "./CameraView";
import { useTheme } from "../contexts/ThemeContext";
import "./CameraScreen.css";

// Import icons (using react-icons or similar)
import { 
  FaCamera, 
  FaCameraRotate, 
  FaMobileAlt, 
  FaTabletAlt, 
  FaDesktop,
  FaUser,
  FaSun,
  FaMoon,
  FaLeaf,
  FaWater,
  FaLightbulb,
  FaSyncAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaQuestionCircle,
  FaSpinner
} from "react-icons/fa";

type CameraMode = "mobile" | "webcam" | "tablet";
type CameraPosition = "front" | "back";
type PredictionResult = {
  biomass: string;
  quality: string;
  recommendation: string;
  confidence: number;
  captureType: CameraMode;
  cameraPosition: CameraPosition;
  deviceType: string;
};

interface CameraScreenProps {
  // Navigation prop replaced with useNavigate hook
}

// Device detection
const IS_MOBILE_WEB: boolean = /Mobi|Android/i.test(navigator.userAgent);
const IS_TABLET_WEB: boolean = /Tablet|iPad/i.test(navigator.userAgent);

// Web Storage Manager
const useWebStorage = () => {
  const USER_STORAGE_KEY = "pasture_ai_user";
  const RECENT_ANALYSIS_KEY = "pasture_ai_recent_analysis";

  const getItem = (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error("Error reading from storage:", error);
      return null;
    }
  };

  const setItem = (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error("Error writing to storage:", error);
    }
  };

  const removeItem = (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Error removing from storage:", error);
    }
  };

  // User management
  const getCurrentUser = () => {
    const userData = getItem(USER_STORAGE_KEY);
    return userData ? JSON.parse(userData) : null;
  };

  const setCurrentUser = (user: any) => {
    setItem(USER_STORAGE_KEY, JSON.stringify(user));
  };

  const clearUser = () => {
    removeItem(USER_STORAGE_KEY);
  };

  // Recent analysis management
  const getRecentAnalysis = (limit: number = 5) => {
    const recentData = getItem(RECENT_ANALYSIS_KEY);
    const analyses = recentData ? JSON.parse(recentData) : [];
    return analyses.slice(0, limit);
  };

  const addRecentAnalysis = (analysis: any) => {
    const recentData = getItem(RECENT_ANALYSIS_KEY);
    let analyses = recentData ? JSON.parse(recentData) : [];
    
    // Add new analysis at the beginning
    analyses.unshift({
      ...analysis,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    });
    
    // Keep only last 10 analyses
    if (analyses.length > 10) {
      analyses = analyses.slice(0, 10);
    }
    
    setItem(RECENT_ANALYSIS_KEY, JSON.stringify(analyses));
  };

  const clearRecentAnalysis = () => {
    removeItem(RECENT_ANALYSIS_KEY);
  };

  return {
    getItem,
    setItem,
    removeItem,
    getCurrentUser,
    setCurrentUser,
    clearUser,
    getRecentAnalysis,
    addRecentAnalysis,
    clearRecentAnalysis,
  };
};

const CameraScreen = () => {
  const navigate = useNavigate();
  const cameraRef = useRef<any>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Use ThemeContext
  const { currentTheme, setTheme, toggleTheme, getColors, isLoading: themeLoading } = useTheme();
  const colors = getColors();
  
  const [cameraMode, setCameraMode] = useState<CameraMode>(() => {
    if (IS_MOBILE_WEB) return "mobile";
    if (IS_TABLET_WEB) return "tablet";
    return "webcam";
  });
  
  const [cameraPosition, setCameraPosition] = useState<CameraPosition>("back");
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [availablePositions, setAvailablePositions] = useState<CameraPosition[]>(["back"]);
  
  const storage = useWebStorage();

  // Initialize user from web storage
  useEffect(() => {
    const loadUser = () => {
      const user = storage.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
    };

    loadUser();
  }, []);

  const initializeCamera = async () => {
    try {
      // Check if camera is available in browser
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );
        setHasPermission(videoDevices.length > 0);
        return videoDevices.length > 0;
      }
      return false;
    } catch (error) {
      console.error("Error initializing camera:", error);
      setHasPermission(false);
      return false;
    }
  };

  const requestCameraPermission = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Media devices not supported in this browser");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      stream.getTracks().forEach((track) => track.stop());
      setHasPermission(true);
      return true;
    } catch (error) {
      console.error("Permission request error:", error);
      alert("Camera Permission Required: Please allow camera access to use this feature.");
      return false;
    }
  };

  const validateCapturedImage = async (uri: string) => {
    const score = cameraPosition === "front" ? 80 : // Front camera usually lower quality
                  IS_MOBILE_WEB ? 85 : 
                  IS_TABLET_WEB ? 88 : 90;
    
    return {
      isValid: true,
      score,
      issues: cameraPosition === "front" ? ["Using front camera - consider switching to rear for better quality"] : [],
      metadata: {
        platform: 'web',
        mode: cameraMode,
        position: cameraPosition,
        deviceType: IS_MOBILE_WEB ? "mobile_browser" : 
                   IS_TABLET_WEB ? "tablet_browser" : "desktop_browser",
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || "anonymous",
        userName: currentUser?.name || "Guest",
        theme: currentTheme,
      },
    };
  };

  const processImage = async (image: any, metadata: any) => {
    setIsProcessing(true);
    setUploadProgress(0.1);

    // Simulate upload/processing with device-specific delays
    const delay = cameraPosition === "front" ? 200 :
                  IS_MOBILE_WEB ? 250 : 
                  IS_TABLET_WEB ? 200 : 150;
    
    for (let i = 0; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      setUploadProgress(0.1 + i * 0.09);
    }

    // Return mock prediction based on camera mode, position, and device
    const basePrediction: PredictionResult = {
      biomass: cameraMode === "mobile" ? "450 kg/ha" :
               cameraMode === "tablet" ? "460 kg/ha" : "455 kg/ha",
      quality: cameraPosition === "front" ? "Fair" : "Good",
      recommendation: cameraPosition === "front" 
        ? "Consider using rear camera for better analysis" 
        : "Ready for grazing",
      confidence: cameraPosition === "front" ? 75 :
                 IS_MOBILE_WEB ? 85 : 
                 IS_TABLET_WEB ? 88 : 90,
      captureType: cameraMode,
      cameraPosition: cameraPosition,
      deviceType: IS_MOBILE_WEB ? "Mobile Browser" : 
                 IS_TABLET_WEB ? "Tablet Browser" : 
                 "Desktop Browser",
    };

    setIsProcessing(false);
    setUploadProgress(0);
    return basePrediction;
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setShowPreview(false);
    setValidationResult(null);
  };

  const hookCaptureImage = async () => {
    if (cameraRef.current) {
      return await cameraRef.current.takePicture();
    }
    return null;
  };

  useEffect(() => {
    const init = async () => {
      const granted = await initializeCamera();
      if (!granted) {
        const shouldRequest = window.confirm(
          "Camera permission is required for pasture analysis. Grant permission?"
        );
        if (shouldRequest) {
          await requestCameraPermission();
        }
      }
      setCameraInitialized(true);
    };
    init();
  }, []);

  useEffect(() => {
    // Get device info and available positions from camera component
    if (cameraRef.current) {
      if (cameraRef.current.getDeviceInfo) {
        const info = cameraRef.current.getDeviceInfo();
        setDeviceInfo(info);
      }
      
      if (cameraRef.current.getAvailableCameraPositions) {
        const positions = cameraRef.current.getAvailableCameraPositions();
        setAvailablePositions(positions);
        // If back camera is available, use it by default
        if (positions.includes("back")) {
          setCameraPosition("back");
        } else if (positions.length > 0) {
          setCameraPosition(positions[0]);
        }
      }
    }
  }, [cameraRef.current]);

  const handleCapture = useCallback(async (image: any) => {
    if (image) {
      setCapturedImage(image);
      const validation = await validateCapturedImage(image.uri);
      setValidationResult(validation);
      setShowPreview(true);
    }
  }, [cameraMode, cameraPosition, currentUser, currentTheme]);

  const handleUsePhoto = useCallback(async () => {
    if (!capturedImage) return;

    setShowPreview(false);

    const metadata = {
      timestamp: new Date().toISOString(),
      platform: 'web',
      cameraMode: cameraMode,
      cameraPosition: cameraPosition,
      deviceType: IS_MOBILE_WEB ? "mobile_browser" : 
                 IS_TABLET_WEB ? "tablet_browser" : "desktop_browser",
      userId: currentUser?.id || "anonymous",
      userName: currentUser?.name || "Guest",
      userEmail: currentUser?.email,
      theme: currentTheme,
    };

    try {
      const prediction = await processImage(capturedImage, metadata);

      if (prediction) {
        // Create analysis record with user info
        const analysisRecord = {
          prediction,
          image: capturedImage.uri ? capturedImage.uri.substring(0, 100) + "..." : "no-image",
          metadata,
          validation: validationResult,
          user: currentUser ? {
            id: currentUser.id,
            name: currentUser.name,
          } : null,
        };

        // Store recent analysis in web storage
        storage.addRecentAnalysis(analysisRecord);

        // Navigate to results screen
        navigate("/prediction-results", {
          state: {
            prediction,
            image: capturedImage,
            metadata,
            validation: validationResult,
            user: currentUser,
          }
        });
      } else {
        alert("Could not analyze the image.");
        retakePhoto();
      }
    } catch (error) {
      console.error("Error processing image:", error);
      alert("An error occurred while analyzing the image.");
      retakePhoto();
    }
  }, [capturedImage, validationResult, navigate, cameraMode, cameraPosition, storage, currentUser, currentTheme]);

  const handleRetake = useCallback(() => {
    setShowPreview(false);
    setValidationResult(null);
    retakePhoto();
  }, []);

  const handleManualCapture = useCallback(async () => {
    const image = await hookCaptureImage();
    if (image) handleCapture(image);
  }, [handleCapture]);

  const handleModeChange = (mode: CameraMode) => {
    setCameraMode(mode);
    if (cameraRef.current && cameraRef.current.setCameraMode) {
      cameraRef.current.setCameraMode(mode);
    }
  };

  const handleCameraPositionChange = (position: CameraPosition) => {
    setCameraPosition(position);
    if (cameraRef.current && cameraRef.current.setCameraPosition) {
      cameraRef.current.setCameraPosition(position);
    }
  };

  const getAvailableModes = (): CameraMode[] => {
    const modes: CameraMode[] = [];
    
    if (IS_MOBILE_WEB || IS_TABLET_WEB) {
      modes.push("mobile");
      if (IS_TABLET_WEB) modes.push("tablet");
    }
    
    modes.push("webcam");
    
    return modes;
  };

  const handleUserLogin = () => {
    // Mock login - integrate with your actual auth system
    const mockUser = {
      id: "user_" + Date.now(),
      name: "Farmer User",
      email: "farmer@example.com",
      farmId: "farm_123",
      subscription: "premium",
      loginTime: new Date().toISOString(),
    };
    
    storage.setCurrentUser(mockUser);
    setCurrentUser(mockUser);
    alert(`Welcome ${mockUser.name}!`);
  };

  const handleUserLogout = () => {
    storage.clearUser();
    setCurrentUser(null);
    alert("You have been logged out.");
  };

  const handleThemeChange = (themeName: string) => {
    if (setTheme) {
      setTheme(themeName);
    }
  };

  if (themeLoading || !cameraInitialized) {
    return (
      <div className="camera-screen-loading" style={{ backgroundColor: colors.background }}>
        <div className="loading-spinner">
          <FaSpinner className="spinner-icon" style={{ color: colors.primary }} />
        </div>
        <p className="loading-text" style={{ color: colors.textPrimary }}>
          {themeLoading ? "Loading theme..." : "Checking camera availability..."}
        </p>
      </div>
    );
  }

  return (
    <div className="camera-screen" style={{ backgroundColor: colors.background }}>
      {!showPreview ? (
        <div className="camera-container">
          <CameraView
            ref={cameraRef}
            onImageCapture={handleCapture}
            onValidation={validateCapturedImage}
            hasPermission={hasPermission ?? undefined}
            onRequestPermission={requestCameraPermission}
          />

          {/* User info bar */}
          <div className="user-info-container">
            {currentUser ? (
              <div className="user-info" style={{ backgroundColor: colors.overlay }}>
                <span className="user-name" style={{ color: colors.textLight }}>
                  <FaUser /> {currentUser.name}
                </span>
                <button
                  className="logout-button"
                  style={{ backgroundColor: colors.error, color: colors.textLight }}
                  onClick={handleUserLogout}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                className="login-button"
                style={{ backgroundColor: colors.primary, color: colors.textLight }}
                onClick={handleUserLogin}
              >
                <FaUser /> Login / Sign Up
              </button>
            )}
            
            {/* Theme selector */}
            <div className="theme-selector" style={{ backgroundColor: colors.overlay }}>
              <button
                className={`theme-button ${currentTheme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
                aria-label="Light theme"
              >
                <FaSun />
              </button>
              <button
                className={`theme-button ${currentTheme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
                aria-label="Dark theme"
              >
                <FaMoon />
              </button>
              <button
                className={`theme-button ${currentTheme === 'green' ? 'active' : ''}`}
                onClick={() => handleThemeChange('green')}
                aria-label="Green theme"
              >
                <FaLeaf />
              </button>
              <button
                className={`theme-button ${currentTheme === 'blue' ? 'active' : ''}`}
                onClick={() => handleThemeChange('blue')}
                aria-label="Blue theme"
              >
                <FaWater />
              </button>
            </div>
          </div>

          {/* Camera position selector */}
          {hasPermission && availablePositions.length > 1 && (
            <div className="position-selector-container" style={{ backgroundColor: colors.overlay }}>
              <p className="position-selector-title" style={{ color: colors.textLight }}>
                Camera Position:
              </p>
              <div className="position-buttons">
                {availablePositions.map((position) => (
                  <button
                    key={position}
                    className={`position-button ${cameraPosition === position ? 'active' : ''}`}
                    style={{ 
                      backgroundColor: cameraPosition === position ? colors.primary : colors.surfaceVariant,
                      color: colors.textLight 
                    }}
                    onClick={() => handleCameraPositionChange(position)}
                  >
                    {position === "front" ? (
                      <>
                        <FaCameraRotate /> Front
                      </>
                    ) : (
                      <>
                        <FaCamera /> Rear
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode selector */}
          {hasPermission && (
            <div className="mode-selector-container" style={{ backgroundColor: colors.overlay }}>
              <p className="mode-selector-title" style={{ color: colors.textLight }}>
                Camera Source:
              </p>
              <div className="mode-buttons">
                {getAvailableModes().map((mode) => (
                  <button
                    key={mode}
                    className={`mode-button ${cameraMode === mode ? 'active' : ''}`}
                    style={{ 
                      backgroundColor: cameraMode === mode ? colors.primary : colors.surfaceVariant,
                      color: colors.textLight 
                    }}
                    onClick={() => handleModeChange(mode)}
                  >
                    {mode === "mobile" ? (
                      <>
                        <FaMobileAlt /> Mobile
                      </>
                    ) : mode === "tablet" ? (
                      <>
                        <FaTabletAlt /> Tablet
                      </>
                    ) : (
                      <>
                        <FaDesktop /> Webcam
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="preview-container" style={{ backgroundColor: colors.surfaceVariant }}>
          <h2 className="preview-title" style={{ color: colors.primary }}>
            Image Preview
          </h2>
          <p className="preview-subtitle" style={{ color: colors.textPrimary }}>
            {cameraMode === "tablet" ? (
              <>
                <FaTabletAlt /> Tablet Capture
              </>
            ) : cameraMode === "webcam" ? (
              <>
                <FaDesktop /> Webcam Capture
              </>
            ) : (
              <>
                <FaMobileAlt /> Mobile Capture
              </>
            )}
          </p>
          <p className="device-info-text" style={{ color: colors.textSecondary }}>
            {cameraPosition === "front" ? (
              <>
                <FaCameraRotate /> Front Camera
              </>
            ) : (
              <>
                <FaCamera /> Rear Camera
              </>
            )}{" "}
            | Device:{" "}
            {IS_MOBILE_WEB
              ? "Mobile Browser"
              : IS_TABLET_WEB
              ? "Tablet Browser"
              : "Desktop Browser"}
          </p>
          {currentUser && (
            <p className="user-info-text" style={{ color: colors.primary }}>
              <FaUser /> {currentUser.name} | Theme: {currentTheme}
            </p>
          )}
          <button
            className="use-button"
            style={{ backgroundColor: colors.primary, color: colors.textLight }}
            onClick={handleUsePhoto}
          >
            <FaCheckCircle /> Analyze This Image
          </button>
          <button
            className="retake-button"
            style={{ backgroundColor: colors.surfaceVariant, color: colors.textPrimary }}
            onClick={handleRetake}
          >
            <FaSyncAlt /> Retake
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="modal-overlay" style={{ backgroundColor: colors.overlay }}>
          <div className="modal-content" style={{ backgroundColor: colors.surface }}>
            <FaSpinner className="spinner-icon" style={{ color: colors.primary }} />
            <h3 style={{ color: colors.textPrimary }}>Analyzing Pasture Biomass</h3>
            <p style={{ color: colors.textSecondary }}>
              {cameraMode === "mobile"
                ? "Processing mobile camera image..."
                : cameraMode === "tablet"
                ? "Processing tablet camera image..."
                : "Processing webcam image for nutrient estimation..."}
            </p>
            {cameraPosition === "front" && (
              <p className="camera-note" style={{ color: colors.secondary }}>
                Note: Using front camera - results may be less accurate
              </p>
            )}
            {uploadProgress > 0 && (
              <div className="progress-container">
                <div 
                  className="progress-bar" 
                  style={{ 
                    width: `${uploadProgress * 100}%`,
                    backgroundColor: colors.primary 
                  }}
                />
                <span className="progress-text" style={{ color: colors.primary }}>
                  {Math.round(uploadProgress * 100)}% complete
                </span>
              </div>
            )}
            {currentUser && (
              <p className="user-info-text" style={{ color: colors.textSecondary }}>
                Analysis for: {currentUser.name}
              </p>
            )}
          </div>
        </div>
      )}

      {!showPreview && hasPermission && (
        <button
          className="help-button"
          style={{ backgroundColor: colors.overlay, color: colors.secondary }}
          onClick={() => {
            const tips: Record<CameraMode, string> = {
              mobile: cameraPosition === "front" 
                ? "• Use rear camera if possible\n• Good lighting\n• Hold phone steady\n• Avoid glare"
                : "• Capture in daylight\n• Hold phone steady\n• Include entire pasture\n• Avoid glare and shadows",
              tablet: cameraPosition === "front"
                ? "• Rear camera recommended\n• Landscape orientation\n• Good lighting\n• Stable position"
                : "• Landscape orientation\n• Keep tablet stable\n• Good lighting\n• Capture from chest height",
              webcam: "• Ensure good lighting\n• Keep camera steady\n• Include entire pasture\n• Avoid shadows"
            };
            alert(`${cameraMode.toUpperCase()} Capture Tips\n\n${tips[cameraMode] || ""}`);
          }}
        >
          <FaLightbulb /> {cameraMode} Tips
        </button>
      )}

      {process.env.NODE_ENV === "development" && !showPreview && hasPermission && (
        <button
          className="debug-button"
          style={{ backgroundColor: colors.error, color: colors.textLight }}
          onClick={handleManualCapture}
        >
          Manual Capture
        </button>
      )}
    </div>
  );
};

export default CameraScreen;
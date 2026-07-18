// LoadingSpinner.jsx - React Web Version
import React, { useState, useEffect } from "react";
import "./LoadingSpinner.css";

// Using a local colors file instead of importing from a specific path
const COLORS = {
  primary: "#007AFF",
  textPrimary: "#000000",
  textSecondary: "#666666",
  white: "#FFFFFF",
  black: "#000000",
  success: "#34C759",
  error: "#FF3B30",
  gray200: "#E5E5EA",
};

const LoadingSpinner = ({
  visible = false,
  text = "Loading...",
  subtitle,
  size = "large", // 'large', 'medium', 'small'
  color = COLORS.primary,
  overlayColor = "rgba(0, 0, 0, 0.7)",
  textColor = COLORS.textPrimary,
  subtitleColor = COLORS.textSecondary,
  spinnerOnly = false,
  type = "spinner", // 'spinner' or 'dots' or 'success' or 'error'
  duration = 3000, // for success/error types
  onDismiss,
  showProgress = false,
  progress = 0,
}) => {
  const [animationValue, setAnimationValue] = useState(0);

  useEffect(() => {
    if (visible && (type === "success" || type === "error")) {
      // Auto-dismiss after duration for success/error states
      const timer = setTimeout(() => {
        if (onDismiss) onDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, type, duration, onDismiss]);

  useEffect(() => {
    if (visible) {
      // CSS animations handle the fade-in
      setAnimationValue(1);
    } else {
      setAnimationValue(0);
    }
  }, [visible]);

  if (!visible && !spinnerOnly) return null;

  const renderIcon = () => {
    switch (type) {
      case "success":
        return (
          <div
            className="loading-icon-container"
            style={{ backgroundColor: COLORS.success }}
          >
            <span className="loading-checkmark">✓</span>
          </div>
        );
      case "error":
        return (
          <div
            className="loading-icon-container"
            style={{ backgroundColor: COLORS.error }}
          >
            <span className="loading-error-icon">✕</span>
          </div>
        );
      case "dots":
        return (
          <div className="loading-dots-container">
            <div className="loading-dot" style={{ backgroundColor: color }} />
            <div className="loading-dot" style={{ backgroundColor: color }} />
            <div className="loading-dot" style={{ backgroundColor: color }} />
          </div>
        );
      default:
        // Spinner type - using CSS animation
        const spinnerSize = size === "small" ? 20 : size === "medium" ? 40 : 60;
        return (
          <div
            className="loading-spinner"
            style={{
              width: `${spinnerSize}px`,
              height: `${spinnerSize}px`,
              borderColor: color,
              borderTopColor: "transparent",
            }}
          />
        );
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case "small":
        return "loading-small";
      case "medium":
        return "loading-medium";
      case "large":
        return "loading-large";
      default:
        return "loading-large";
    }
  };

  if (spinnerOnly) {
    return (
      <div className={`loading-spinner-only ${getSizeClass()}`}>
        {renderIcon()}
        {text && (
          <div
            className="loading-spinner-only-text"
            style={{ color: textColor }}
          >
            {text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`loading-modal ${
        visible ? "loading-modal-visible" : "loading-modal-hidden"
      }`}
      style={{ backgroundColor: overlayColor }}
      onClick={onDismiss}
      role="dialog"
      aria-label="Loading"
      aria-busy={true}
      aria-live="polite"
    >
      <div
        className={`loading-container ${getSizeClass()}`}
        onClick={(e) => e.stopPropagation()}
      >
        {renderIcon()}

        <div className="loading-text-container">
          {text && (
            <div className="loading-text" style={{ color: textColor }}>
              {text}
            </div>
          )}
          {subtitle && (
            <div className="loading-subtitle" style={{ color: subtitleColor }}>
              {subtitle}
            </div>
          )}
        </div>

        {showProgress && (
          <div className="loading-progress-container">
            <div className="loading-progress-background">
              <div
                className="loading-progress-fill"
                style={{
                  width: `${progress * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <div className="loading-progress-text">
              {Math.round(progress * 100)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;

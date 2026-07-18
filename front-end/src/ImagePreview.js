// ImagePreview.jsx
import React from "react";
import "./ImagePreview.css";

// Icon component using emoji or FontAwesome (optional)
const Icon = ({ name, size = 20, color = "#000" }) => {
  const iconMap = {
    "checkmark-circle": "✅",
    warning: "⚠️",
    close: "✕",
    checkmark: "✓",
  };

  return (
    <span className="icon" style={{ fontSize: `${size}px`, color }}>
      {iconMap[name] || "📷"}
    </span>
  );
};

// Or use FontAwesome (if installed):
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faCheckCircle, faExclamationTriangle, faTimes, faCheck } from '@fortawesome/free-solid-svg-icons';
//
// const Icon = ({ name, size = 20, color = '#000' }) => {
//   const iconMap = {
//     'checkmark-circle': faCheckCircle,
//     'warning': faExclamationTriangle,
//     'close': faTimes,
//     'checkmark': faCheck,
//   };
//
//   return <FontAwesomeIcon icon={iconMap[name]} style={{ fontSize: `${size}px`, color }} />;
// };

const ImagePreview = ({
  image,
  validationResult,
  onUsePhoto,
  onRetake,
  isProcessing = false,
}) => {
  const renderValidationStatus = () => {
    if (!validationResult) return null;

    const { isValid, issues = [] } = validationResult;

    return (
      <div className="validation-container">
        <div className="validation-header">
          <Icon
            name={isValid ? "checkmark-circle" : "warning"}
            size={20}
            color={isValid ? "#4CAF50" : "#FF9800"}
          />
          <span className="validation-text bold">
            {isValid ? "Image Valid" : "Validation Issues"}
          </span>
        </div>

        {issues.length > 0 && (
          <div className="issues-list">
            {issues.map((issue, index) => (
              <span key={index} className="validation-text small">
                • {issue}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isProcessing) {
    return (
      <div className="preview-container">
        <img
          src={image.url || image.previewUrl || image.uri}
          alt="Preview"
          className="preview-image"
        />
        <div className="processing-overlay">
          <div className="loading-spinner"></div>
          <span className="processing-text">Processing image...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-container">
      <img
        src={image.url || image.previewUrl || image.uri}
        alt="Preview"
        className="preview-image"
      />

      {renderValidationStatus()}

      <div className="controls">
        <button className="control-button retake-button" onClick={onRetake}>
          <Icon name="close" size={20} color="#fff" />
          <span className="control-button-text">Retake</span>
        </button>

        <button
          className="control-button use-photo-button"
          onClick={onUsePhoto}
          disabled={isProcessing}
        >
          <Icon name="checkmark" size={20} color="#fff" />
          <span className="control-button-text">Use Photo</span>
        </button>
      </div>
    </div>
  );
};

export default ImagePreview;

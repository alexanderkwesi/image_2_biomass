// InputField.jsx
import React, { useState } from "react";
import "./InputField.css";

// Icon component using emoji or FontAwesome (optional)
const Icon = ({ name, size = 20, color = "#666", onClick, className = "" }) => {
  const iconMap = {
    mail: "✉️",
    "lock-closed": "🔒",
    person: "👤",
    eye: "👁️",
    "eye-off": "👁️‍🗨️",
    search: "🔍",
    calendar: "📅",
    phone: "📱",
    location: "📍",
    "information-circle": "ℹ️",
    "checkmark-circle": "✅",
    "alert-circle": "⚠️",
  };

  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const iconElement = (
    <span
      className={`icon ${className}`}
      style={{ fontSize: `${size}px`, color }}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? "button" : "presentation"}
      tabIndex={onClick ? 0 : -1}
    >
      {iconMap[name] || "📝"}
    </span>
  );

  return iconElement;
};

// Or use FontAwesome (if installed):
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import {
//   faEnvelope, faLock, faUser, faEye, faEyeSlash, faSearch,
//   faCalendar, faPhone, faMapMarkerAlt, faInfoCircle, faCheckCircle, faExclamationCircle
// } from '@fortawesome/free-solid-svg-icons';
//
// const Icon = ({ name, size = 20, color = '#666', onClick, className = '' }) => {
//   const iconMap = {
//     'mail': faEnvelope,
//     'lock-closed': faLock,
//     'person': faUser,
//     'eye': faEye,
//     'eye-off': faEyeSlash,
//     'search': faSearch,
//     'calendar': faCalendar,
//     'phone': faPhone,
//     'location': faMapMarkerAlt,
//     'information-circle': faInfoCircle,
//     'checkmark-circle': faCheckCircle,
//     'alert-circle': faExclamationCircle,
//   };
//
//   const handleClick = (e) => {
//     if (onClick) {
//       e.preventDefault();
//       onClick();
//     }
//   };
//
//   return (
//     <FontAwesomeIcon
//       icon={iconMap[name] || faEdit}
//       style={{ fontSize: `${size}px`, color }}
//       className={`icon ${className} ${onClick ? 'clickable' : ''}`}
//       onClick={onClick ? handleClick : undefined}
//       role={onClick ? 'button' : 'presentation'}
//       tabIndex={onClick ? 0 : -1}
//     />
//   );
// };

const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  helperText,
  disabled = false,
  icon,
  onIconClick,
  autoCapitalize = "off",
  multiline = false,
  rows = 1,
  className = "",
  containerClassName = "",
  required = false,
  id,
  name,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getBorderColor = () => {
    if (error) return "var(--error-color, #f44336)";
    if (isFocused) return "var(--primary-color, #4CAF50)";
    return "var(--border-color, #ddd)";
  };

  const getInputType = () => {
    if (type === "password") {
      return showPassword ? "text" : "password";
    }
    return type;
  };

  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  // Generate unique ID if not provided
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`input-field-container ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="required-asterisk">*</span>}
        </label>
      )}

      <div
        className={`input-wrapper ${error ? "error" : ""} ${
          isFocused ? "focused" : ""
        } ${disabled ? "disabled" : ""}`}
        style={{ borderColor: getBorderColor() }}
      >
        {icon && !onIconClick && (
          <Icon
            name={icon}
            size={20}
            color="var(--icon-color, #666)"
            className="input-icon"
          />
        )}

        {icon && onIconClick && (
          <button
            type="button"
            className="icon-button"
            onClick={onIconClick}
            disabled={disabled}
            aria-label={`${icon} button`}
          >
            <Icon name={icon} size={20} color="var(--primary-color, #4CAF50)" />
          </button>
        )}

        {multiline ? (
          <textarea
            id={inputId}
            className={`input-field textarea ${className}`}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            onFocus={handleFocus}
            onBlur={handleBlur}
            rows={rows}
            autoCapitalize={autoCapitalize}
            name={name}
            {...props}
          />
        ) : (
          <input
            id={inputId}
            type={getInputType()}
            className={`input-field ${className}`}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoCapitalize={autoCapitalize}
            name={name}
            {...props}
          />
        )}

        {type === "password" && (
          <button
            type="button"
            className="password-toggle"
            onClick={togglePasswordVisibility}
            disabled={disabled}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <Icon
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color="var(--icon-color, #666)"
            />
          </button>
        )}
      </div>

      {(error || helperText) && (
        <div className={`input-message ${error ? "error" : "helper"}`}>
          {error || helperText}
        </div>
      )}
    </div>
  );
};

export default InputField;

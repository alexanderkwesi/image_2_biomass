// components/Button.jsx
import React from "react";
import { COLORS } from "./colors";
import { FiLoader } from "react-icons/fi"; // or any icon library of your choice

const Button = ({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  icon,
  iconPosition = "left",
  type = "button",
  fullWidth = false,
  className = "",
  style,
  textStyle,
  children,
  ...props
}) => {
  const getButtonClasses = () => {
    const baseClasses = [
      "button",
      `button-${variant}`,
      `button-${size}`,
      disabled && "button-disabled",
      loading && "button-loading",
      fullWidth && "button-full-width",
      className,
    ].filter(Boolean).join(" ");

    return baseClasses;
  };

  const getButtonStyles = () => {
    const baseStyle = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "8px",
      border: "none",
      cursor: disabled || loading ? "not-allowed" : "pointer",
      opacity: disabled ? 0.6 : 1,
      transition: "all 0.2s ease",
      fontFamily: "inherit",
      fontWeight: 600,
      textDecoration: "none",
      width: fullWidth ? "100%" : "auto",
      userSelect: "none",
      ...style,
    };

    const sizeStyles = {
      small: {
        padding: "8px 16px",
        fontSize: "14px",
        height: "36px",
      },
      medium: {
        padding: "12px 24px",
        fontSize: "16px",
        height: "44px",
      },
      large: {
        padding: "16px 32px",
        fontSize: "18px",
        height: "52px",
      },
    };

    const variantStyles = {
      primary: {
        backgroundColor: COLORS.primary,
        color: COLORS.white,
        border: `1px solid ${COLORS.primary}`,
      },
      secondary: {
        backgroundColor: COLORS.secondary,
        color: COLORS.white,
        border: `1px solid ${COLORS.secondary}`,
      },
      outline: {
        backgroundColor: "transparent",
        color: COLORS.primary,
        border: `1px solid ${COLORS.primary}`,
      },
      danger: {
        backgroundColor: COLORS.error,
        color: COLORS.white,
        border: `1px solid ${COLORS.error}`,
      },
      success: {
        backgroundColor: COLORS.success,
        color: COLORS.white,
        border: `1px solid ${COLORS.success}`,
      },
      ghost: {
        backgroundColor: "transparent",
        color: COLORS.primary,
        border: "1px solid transparent",
      },
      link: {
        backgroundColor: "transparent",
        color: COLORS.primary,
        border: "none",
        padding: 0,
        height: "auto",
        textDecoration: "underline",
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const getTextStyles = () => {
    const baseStyle = {
      lineHeight: 1,
      ...textStyle,
    };

    return baseStyle;
  };

  const renderIcon = () => {
    if (!icon) return null;

    // You can use different icon libraries or custom icons
    const IconComponent = icon;
    const iconColor = variant === "outline" || variant === "ghost" || variant === "link" 
      ? COLORS.primary 
      : COLORS.white;

    return (
      <span className={`button-icon button-icon-${iconPosition}`}>
        {typeof icon === "string" ? (
          <span style={{ color: iconColor, fontSize: "20px" }}>{icon}</span>
        ) : (
          <IconComponent size={20} color={iconColor} />
        )}
      </span>
    );
  };

  const handleClick = (e) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    onPress?.(e);
  };

  const content = children || title;

  return (
    <button
      type={type}
      className={getButtonClasses()}
      style={getButtonStyles()}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className="button-loader">
          <FiLoader className="spinner" size={20} />
          <span className="sr-only">Loading...</span>
        </span>
      ) : (
        <>
          {iconPosition === "left" && renderIcon()}
          <span className="button-text" style={getTextStyles()}>
            {content}
          </span>
          {iconPosition === "right" && renderIcon()}
        </>
      )}
    </button>
  );
};

// Button Group Component
export const ButtonGroup = ({ children, direction = "horizontal", align = "start", ...props }) => {
  const groupClasses = [
    "button-group",
    `button-group-${direction}`,
    `button-group-align-${align}`,
  ].join(" ");

  return (
    <div className={groupClasses} {...props}>
      {children}
    </div>
  );
};

// Icon Button Component
export const IconButton = ({ icon, size = "medium", ...props }) => {
  const sizeStyles = {
    small: { width: "36px", height: "36px", padding: "8px" },
    medium: { width: "44px", height: "44px", padding: "12px" },
    large: { width: "52px", height: "52px", padding: "16px" },
  };

  return (
    <Button
      {...props}
      icon={icon}
      size={size}
      style={{
        ...sizeStyles[size],
        padding: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    />
  );
};

export default Button;
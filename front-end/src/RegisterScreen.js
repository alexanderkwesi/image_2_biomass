// RegisterScreen.jsx - React Web Version
import React, { useState } from "react";
import "./RegisterScreen.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api/v1";

// Custom Icon Components
const MailIcon = () => <span className="register-icon">📧</span>;
const LockIcon = () => <span className="register-icon">🔒</span>;
const EyeIcon = () => <span className="register-icon">👁️</span>;
const EyeOffIcon = () => <span className="register-icon">🚫</span>;
const CheckmarkIcon = () => <span className="register-checkmark">✓</span>;
const LeafIcon = () => <span className="register-leaf-icon">🌿</span>;

export default function RegisterScreen({ onNavigate, onRegisterSuccess }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!form.firstName.trim()) newErrors.firstName = "First name is required";
    if (!form.lastName.trim()) newErrors.lastName = "Last name is required";
    
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long";
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!form.agreeToTerms) {
      newErrors.agreeToTerms = "Please agree to the Terms of Service and Privacy Policy";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setForm({ ...form, [field]: value });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const registerData = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.toLowerCase().trim(),
        password: form.password,
        confirm_password: form.confirmPassword,
      };

      console.log("Sending registration request to:", `${API_BASE_URL}/db/register`);

      const response = await fetch(`${API_BASE_URL}/db/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.detail || `Registration failed with status: ${response.status}`;
        throw new Error(errorMessage);
      }

      if (data.success && data.access_token) {
        console.log("Registration successful, token stored");

        if (onRegisterSuccess) {
          onRegisterSuccess(data);
        } else {
          alert("Success: Registration successful!");
          if (onNavigate) {
            onNavigate('login');
          }
        }
      } else {
        throw new Error(data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);

      let errorMessage = "An error occurred. Please try again.";

      if (error.message) {
        const message = error.message.toLowerCase();

        if (message.includes("passwords do not match")) {
          errorMessage = "Passwords do not match. Please check and try again.";
        } else if (
          message.includes("email already exists") ||
          message.includes("user with this email already exists")
        ) {
          errorMessage = "An account with this email already exists. Please use a different email or try logging in.";
          setErrors({ ...errors, email: errorMessage });
        } else if (message.includes("password must be at least 6 characters")) {
          errorMessage = "Password must be at least 6 characters long.";
          setErrors({ ...errors, password: errorMessage });
        } else if (message.includes("valid email")) {
          errorMessage = "Please enter a valid email address.";
          setErrors({ ...errors, email: errorMessage });
        } else if (message.includes("name cannot be empty")) {
          errorMessage = "First name and last name are required.";
          setErrors({ 
            ...errors, 
            firstName: "First name is required",
            lastName: "Last name is required"
          });
        } else if (
          message.includes("network request failed") ||
          message.includes("fetch")
        ) {
          errorMessage = "Cannot connect to server. Please check your connection and try again.";
        } else if (message.includes("timeout")) {
          errorMessage = "Request timeout. Please try again.";
        } else if (message.includes("too many registration attempts")) {
          errorMessage = "Too many registration attempts. Please try again later.";
        } else {
          errorMessage = error.message;
        }
      }

      if (!errors.email && !errors.password) {
        alert(`Registration Failed: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    if (onNavigate) onNavigate('login');
  };

  const navigateToTerms = () => {
    if (onNavigate) onNavigate('terms');
  };

  const navigateToPrivacy = () => {
    if (onNavigate) onNavigate('privacy');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleRegister();
    }
  };

  return (
    <div className="register-container" onKeyDown={handleKeyPress}>
      <div className="register-content">
        {/* Header */}
        <div className="register-header">
          <LeafIcon />
          <h1 className="register-title">Create Account</h1>
          <p className="register-subtitle">Join our plant community</p>
        </div>

        {/* Form */}
        <div className="register-form">
          {/* Name Row */}
          <div className="register-name-row">
            <div className={`register-input-container register-half-input ${errors.firstName ? 'register-input-error' : ''}`}>
              <input
                type="text"
                className="register-input"
                placeholder="First Name"
                value={form.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                disabled={loading}
                autoCapitalize="words"
              />
              {errors.firstName && (
                <div className="register-error-message">{errors.firstName}</div>
              )}
            </div>
            <div className={`register-input-container register-half-input ${errors.lastName ? 'register-input-error' : ''}`}>
              <input
                type="text"
                className="register-input"
                placeholder="Last Name"
                value={form.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                disabled={loading}
                autoCapitalize="words"
              />
              {errors.lastName && (
                <div className="register-error-message">{errors.lastName}</div>
              )}
            </div>
          </div>

          {/* Email Input */}
          <div className={`register-input-container ${errors.email ? 'register-input-error' : ''}`}>
            <MailIcon />
            <input
              type="email"
              className="register-input"
              placeholder="Email Address"
              value={form.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={loading}
              autoCapitalize="none"
              autoComplete="email"
            />
            {errors.email && (
              <div className="register-error-message">{errors.email}</div>
            )}
          </div>

          {/* Password Input */}
          <div className={`register-input-container ${errors.password ? 'register-input-error' : ''}`}>
            <LockIcon />
            <input
              type={showPassword ? "text" : "password"}
              className="register-input"
              placeholder="Password"
              value={form.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              disabled={loading}
              autoCapitalize="none"
            />
            <button
              type="button"
              className="register-eye-button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
            {errors.password && (
              <div className="register-error-message">{errors.password}</div>
            )}
          </div>

          {/* Confirm Password Input */}
          <div className={`register-input-container ${errors.confirmPassword ? 'register-input-error' : ''}`}>
            <LockIcon />
            <input
              type={showConfirmPassword ? "text" : "password"}
              className="register-input"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              disabled={loading}
              autoCapitalize="none"
            />
            <button
              type="button"
              className="register-eye-button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={loading}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
            {errors.confirmPassword && (
              <div className="register-error-message">{errors.confirmPassword}</div>
            )}
          </div>

          {/* Terms Agreement */}
          <div className={`register-terms-container ${errors.agreeToTerms ? 'register-terms-error' : ''}`}>
            <button
              type="button"
              className={`register-checkbox ${form.agreeToTerms ? 'register-checkbox-checked' : ''}`}
              onClick={() => setForm({ ...form, agreeToTerms: !form.agreeToTerms })}
              disabled={loading}
              aria-label={form.agreeToTerms ? "Terms agreed" : "Agree to terms"}
            >
              {form.agreeToTerms && <CheckmarkIcon />}
            </button>
            <span className="register-terms-text">
              I agree to the{" "}
              <button
                type="button"
                className="register-terms-link"
                onClick={navigateToTerms}
                disabled={loading}
              >
                Terms of Service
              </button>{" "}
              and{" "}
              <button
                type="button"
                className="register-terms-link"
                onClick={navigateToPrivacy}
                disabled={loading}
              >
                Privacy Policy
              </button>
            </span>
          </div>
          {errors.agreeToTerms && (
            <div className="register-error-message">{errors.agreeToTerms}</div>
          )}

          {/* Register Button */}
          <button
            type="button"
            className={`register-button ${loading ? 'register-button-disabled' : ''}`}
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="register-spinner"></div>
                <span>Creating Account...</span>
              </>
            ) : (
              "Create Account"
            )}
          </button>

          {/* Login Link */}
          <div className="register-login-container">
            <span className="register-login-text">Already have an account? </span>
            <button
              type="button"
              className="register-login-link"
              onClick={navigateToLogin}
              disabled={loading}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
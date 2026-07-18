// ForgotPasswordScreen.jsx
import React, { useState } from 'react';
import './ForgottenPasswordScreen.css';

// Using emoji icons instead of image files for simplicity
const ArrowBackIcon = () => <span className="icon">⬅️</span>;
const LockIcon = () => <span className="icon lock-icon">🔒</span>;
const CheckmarkIcon = () => <span className="icon checkmark-icon">✅</span>;
const MailIcon = () => <span className="icon mail-icon">✉️</span>;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      alert('Error: Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      alert('Error: Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      // Replace with your actual password reset API endpoint
      const response = await fetch('YOUR_PASSWORD_RESET_API_ENDPOINT', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reset email');
      }

      setEmailSent(true);
    } catch (error) {
      alert('Error: Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  const navigateBack = () => {
    window.history.back();
  };

  if (emailSent) {
    return (
      <div className="forgot-password-container">
        <div className="success-container">
          <div className="success-icon">
            <CheckmarkIcon />
          </div>
          <h1 className="success-title">Email Sent!</h1>
          <p className="success-message">
            We've sent a password reset link to<br />
            <span className="email-text">{email}</span>
          </p>
          <p className="instructions">
            Please check your inbox and follow the instructions to reset your password.
          </p>
          <button className="back-button" onClick={navigateToLogin}>
            Back to Login
          </button>
          
          <button className="resend-button" onClick={handleResetPassword}>
            Resend Email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password-container">
      <div className="form-wrapper">
        {/* Header */}
        <div className="header">
          <button className="back-arrow" onClick={navigateBack}>
            <ArrowBackIcon />
          </button>
          <div className="lock-icon-wrapper">
            <LockIcon />
          </div>
          <h1 className="title">Forgot Password</h1>
          <p className="subtitle">
            Enter your email and we'll send you a link to reset your password
          </p>
        </div>

        {/* Form */}
        <div className="form">
          {/* Email Input */}
          <div className="input-container">
            <div className="input-icon-wrapper">
              <MailIcon />
            </div>
            <input
              type="email"
              className="input"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="off"
              autoComplete="email"
            />
          </div>

          {/* Reset Button */}
          <button
            className={`reset-button ${loading ? 'disabled' : ''}`}
            onClick={handleResetPassword}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          {/* Back to Login */}
          <button className="back-to-login" onClick={navigateToLogin}>
            <ArrowBackIcon />
            <span className="back-to-login-text">Back to Login</span>
          </button>
        </div>
      </div>
    </div>
  );
}
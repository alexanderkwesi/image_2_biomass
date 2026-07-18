// components/layouts/AuthLayout.jsx
import React from "react";
import { Outlet, Link } from "react-router-dom";
import { COLORS } from "./colors";

const AuthLayout = () => {
  return (
    <div className="auth-layout" style={{
      minHeight: "100vh",
      backgroundColor: COLORS.background,
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Auth Header */}
      <header className="auth-header" style={{
        backgroundColor: COLORS.primary,
        padding: "1rem 2rem",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      }}>
        <div className="auth-header-content" style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <Link to="/" className="auth-logo" style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: COLORS.white,
            textDecoration: "none",
          }}>
            Your App Name
          </Link>
          
          <nav className="auth-nav">
            <Link 
              to="/login" 
              className="auth-nav-link"
              style={{
                color: COLORS.white,
                textDecoration: "none",
                marginLeft: "1.5rem",
                opacity: 0.9,
              }}
            >
              Login
            </Link>
            <Link 
              to="/register" 
              className="auth-nav-link"
              style={{
                color: COLORS.white,
                textDecoration: "none",
                marginLeft: "1.5rem",
                opacity: 0.9,
              }}
            >
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="auth-main" style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}>
        <div className="auth-container" style={{
          width: "100%",
          maxWidth: "450px",
          backgroundColor: COLORS.white,
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          padding: "2.5rem",
        }}>
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="auth-footer" style={{
        backgroundColor: COLORS.primary,
        color: COLORS.white,
        padding: "1.5rem 2rem",
        textAlign: "center",
        fontSize: "0.9rem",
      }}>
        <p style={{ margin: 0, opacity: 0.8 }}>
          &copy; {new Date().getFullYear()} Your App Name. All rights reserved.
        </p>
        <div className="auth-footer-links" style={{ marginTop: "0.5rem" }}>
          <Link 
            to="/privacy" 
            style={{
              color: COLORS.white,
              textDecoration: "none",
              margin: "0 0.5rem",
              opacity: 0.8,
            }}
          >
            Privacy Policy
          </Link>
          <Link 
            to="/terms" 
            style={{
              color: COLORS.white,
              textDecoration: "none",
              margin: "0 0.5rem",
              opacity: 0.8,
            }}
          >
            Terms of Service
          </Link>
          <Link 
            to="/contact" 
            style={{
              color: COLORS.white,
              textDecoration: "none",
              margin: "0 0.5rem",
              opacity: 0.8,
            }}
          >
            Contact Us
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default AuthLayout;
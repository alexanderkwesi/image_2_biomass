// LandingScreen.tsx - React Web Version (Rewritten)
import React, { useState, useEffect } from "react";
import "./LandingScreen.css";

// Define navigation types
type NavigationType =
  | "register"
  | "login"
  | "about"
  | "privacy"
  | "terms"
  | "contact";

// Component props interface
interface LandingPageProps {
  onNavigate?: (screen: NavigationType) => void;
}

// Feature data interface
interface Feature {
  id: number;
  icon: string;
  title: string;
  description: string;
  isPremium?: boolean;
}

// Statistic data interface
interface Statistic {
  id: number;
  value: string;
  label: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [windowWidth, setWindowWidth] = useState < number > window.innerWidth;

  // Responsive breakpoints
  const isSmallScreen = windowWidth < 375;
  const isMediumScreen = windowWidth >= 375 && windowWidth < 768;
  const isLargeScreen = windowWidth >= 768;

  // Feature data
  const features: Feature[] = [
    {
      id: 1,
      icon: "🌿",
      title: "Smart Identification",
      description:
        "Instantly identify over 10,000 plant species with our advanced ML image recognition",
    },
    {
      id: 2,
      icon: "📊",
      title: "Health Analytics",
      description:
        "Track plant health metrics, receive growth predictions, and get actionable insights",
    },
    {
      id: 3,
      icon: "🏡",
      title: "Farm and Garden Management",
      description:
        "Organize multiple gardens, schedule tasks, and monitor progress in one dashboard",
    },
    {
      id: 4,
      icon: "🤖",
      title: "ML-Powered Recommendations",
      description:
        "Get personalized care recommendations based on plant type, location, and environment",
      isPremium: true,
    },
  ];

  // Statistics data
  const statistics: Statistic[] = [
    { id: 1, value: "10K+", label: "Plants Identified" },
    { id: 2, value: "5K+", label: "Happy Farmers and Gardeners" },
    { id: 3, value: "99%", label: "Accuracy Rate" },
  ];

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Navigation handler
  const handleNavigate = (page: NavigationType) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      // Default web navigation
      switch (page) {
        case "register":
          window.location.href = "/register";
          break;
        case "login":
          window.location.href = "/login";
          break;
        case "about":
          window.location.href = "/about";
          break;
        case "privacy":
          window.location.href = "/privacy";
          break;
        case "terms":
          window.location.href = "/terms";
          break;
        case "contact":
          window.location.href = "/contact";
          break;
      }
    }
  };

  // Image error handler
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = "none";
  };

  // Responsive class generator
  const getResponsiveClass = (baseClass: string) => {
    return `${baseClass} ${isSmallScreen ? `${baseClass}-small` : ""} ${
      isLargeScreen ? `${baseClass}-large` : ""
    }`.trim();
  };

  // Render statistics section
  const renderStatistics = () => (
    <section className={getResponsiveClass("stats-section")}>
      {statistics.map((stat, index) => (
        <React.Fragment key={stat.id}>
          <div className="stat-item">
            <div className="stat-number">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
          {index < statistics.length - 1 && (
            <div className="stat-divider"></div>
          )}
        </React.Fragment>
      ))}
    </section>
  );

  // Render features section
  const renderFeatures = () => (
    <section className="features-container">
      <h2 className={getResponsiveClass("section-title")}>
        Why Choose PlantGuard ML?
      </h2>

      <div
        className={`features-grid ${
          isLargeScreen ? "features-row" : "features-column"
        }`}
      >
        {features.slice(0, 3).map((feature) => (
          <div
            key={feature.id}
            className={`feature-card ${
              isLargeScreen ? "feature-card-large" : ""
            }`}
          >
            <div className="feature-icon-container">
              <span className="feature-icon">{feature.icon}</span>
            </div>
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-text">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Premium Feature */}
      <div
        className={`feature-card premium-feature ${
          isLargeScreen ? "premium-large" : ""
        }`}
      >
        <div className="feature-icon-container">
          <span className="feature-icon">{features[3].icon}</span>
        </div>
        <h3 className="feature-title">{features[3].title}</h3>
        <p className="feature-text">{features[3].description}</p>
      </div>
    </section>
  );

  // Render call-to-action section
  const renderCallToAction = () => (
    <section className="cta-section">
      <h2 className={getResponsiveClass("cta-title")}>
        Ready to Transform Your Farm and Garden?
      </h2>
      <p className={`cta-text ${isSmallScreen ? "cta-text-small" : ""}`}>
        Join thousands of successful farmers and gardeners today
      </p>
    </section>
  );

  // Render action buttons
  const renderActionButtons = () => (
    <section className="actions-container">
      <h2 className={getResponsiveClass("action-title")}>Start Your Journey</h2>

      <div
        className={`button-group ${
          isLargeScreen ? "button-group-row" : "button-group-column"
        }`}
      >
        <button
          className={`primary-button ${isLargeScreen ? "button-large" : ""}`}
          onClick={() => handleNavigate("register")}
          aria-label="Create free account"
        >
          <span className="primary-button-text">Create Free Account</span>
          <span className="button-subtext">No credit card required</span>
        </button>

        <button
          className={`secondary-button ${isLargeScreen ? "button-large" : ""}`}
          onClick={() => handleNavigate("login")}
          aria-label="Sign in to existing account"
        >
          <span className="secondary-button-text">Sign In</span>
          <span className="button-subtext secondary-subtext">
            Existing users
          </span>
        </button>
      </div>

      <button
        className="tertiary-button"
        onClick={() => handleNavigate("about")}
        aria-label="Learn more about features"
      >
        <span className="tertiary-button-text">Learn More About Features</span>
      </button>
    </section>
  );

  // Render footer
  const renderFooter = () => (
    <footer className="footer">
      <p className="footer-text">© 2024 PlantGuard ML. All rights reserved.</p>
      <div
        className={`footer-links ${
          isSmallScreen ? "footer-column" : "footer-row"
        }`}
      >
        <button
          className="footer-link"
          onClick={() => handleNavigate("privacy")}
          aria-label="View privacy policy"
        >
          Privacy Policy
        </button>
        <span className="footer-divider">•</span>
        <button
          className="footer-link"
          onClick={() => handleNavigate("terms")}
          aria-label="View terms of service"
        >
          Terms of Service
        </button>
        <span className="footer-divider">•</span>
        <button
          className="footer-link"
          onClick={() => handleNavigate("contact")}
          aria-label="Contact us"
        >
          Contact Us
        </button>
      </div>
    </footer>
  );

  return (
    <div className="landing-container">
      <div className="scroll-container">
        {/* Hero Section */}
        <section className={getResponsiveClass("hero-section")}>
          <div className="hero-content">
            <img
              src="/assets/images/icon.png"
              alt="PlantGuard ML Logo"
              className={getResponsiveClass("logo")}
              onError={handleImageError}
            />

            <h1 className={getResponsiveClass("title")}>PlantGuard ML</h1>

            <h2 className={getResponsiveClass("subtitle")}>
              Your Intelligent Farming and Gardening Companion
            </h2>

            <p className={`tagline ${isSmallScreen ? "tagline-small" : ""}`}>
              Identify plants, track farm and garden health, and get ML-powered
              insights
            </p>
          </div>
        </section>

        {/* Stats Section */}
        {renderStatistics()}

        {/* Features Section */}
        {renderFeatures()}

        {/* Testimonial Section */}
        <section className="testimonial-section">
          <h2 className={getResponsiveClass("section-title")}>
            What Farmers and Gardeners Say
          </h2>
          <div className="testimonial-card">
            <div className="quote">"</div>
            <p className="testimonial-text">
              PlantGuard ML transformed my gardening experience. The
              identification feature is incredibly accurate!
            </p>
            <p className="testimonial-author">
              - Sarah M., Urban Farmer and Gardener
            </p>
          </div>
        </section>

        {/* CTA Section */}
        {renderCallToAction()}

        {/* Action Buttons */}
        {renderActionButtons()}

        {/* Footer */}
        {renderFooter()}
      </div>
    </div>
  );
};

export default LandingPage;

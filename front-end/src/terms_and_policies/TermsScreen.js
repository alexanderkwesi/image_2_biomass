import React, { useState } from "react";
import "./TermsScreen.css";

const TermsOfService = ({ navigation }) => {
  const [expandedSections, setExpandedSections] = useState({});
  const competitionLink = "https://www.kaggle.com/competitions/csiro-biomass";

  // Icon mapping using Unicode characters
  const icons = {
    Back: "←",
    ExpandMore: "▼",
    ExpandLess: "▲",
    Check: "✓",
    Info: "ⓘ",
    ExternalLink: "↗",
    Document: "📄",
    Trophy: "🏆",
    Business: "🏢",
    School: "🎓",
    Stats: "📊",
    Cube: "⬛",
    Shield: "🛡️",
    Scale: "⚖️",
    Help: "❓",
  };

  const openLink = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const toggleSection = (id) => {
    setExpandedSections({
      ...expandedSections,
      [id]: !expandedSections[id],
    });
  };

  const handleBack = () => {
    if (navigation && navigation.navigate) {
      navigation.navigate("Home");
    } else if (navigation && navigation.goBack) {
      navigation.goBack();
    } else {
      window.history.back();
    }
  };

  const renderIcon = (iconName, size = 26, color = "#27ae60") => {
    return (
      <span className="icon-text" style={{ fontSize: `${size}px`, color }}>
        {icons[iconName] || "○"}
      </span>
    );
  };

  const termsSections = [
    {
      id: 1,
      title: "Purpose and Nature",
      icon: "Document",
      content:
        "PlantGuard ML is a demonstration project created for educational and research purposes. This application is specifically developed as an entry for the CSIRO Kaggle Biomass Prediction Competition.",
      items: [
        "Demonstrate machine learning capabilities in agricultural applications",
        "Participate in scientific research and competition",
        "Showcase technical implementation possibilities",
        "Provide educational insights into biomass prediction",
      ],
    },
    {
      id: 2,
      title: "Competition Entry",
      icon: "Trophy",
      content:
        "This project is participating in the CSIRO Kaggle Biomass Prediction Competition. All model development, data processing, and predictions are made in accordance with competition rules and guidelines.",
      items: [
        "Follows all Kaggle competition rules",
        "Uses competition-provided datasets",
        "Submissions follow competition format",
        "Complies with competition timeline",
      ],
    },
    {
      id: 3,
      title: "No Commercial Use",
      icon: "Business",
      content:
        "PlantGuard ML is not intended for commercial use. The application, models, and predictions are provided 'as-is' for demonstration purposes only.",
      items: [
        "No warranties or guarantees of accuracy",
        "Not for production use",
        "No commercial licensing",
        "Educational use only",
      ],
    },
    {
      id: 4,
      title: "Academic and Research Focus",
      icon: "School",
      content:
        "This project serves academic and research objectives. All methodologies, algorithms, and results are shared transparently for educational purposes.",
      items: [
        "Open for academic reference",
        "Transparent methodologies",
        "Educational documentation",
        "Research-focused implementation",
      ],
    },
    {
      id: 5,
      title: "Data Usage Limitations",
      icon: "Stats",
      content:
        "Data used in this demonstration project comes from specific sources with clear limitations:",
      items: [
        "Competition data from CSIRO/Kaggle",
        "Synthetic or sample data for demonstration",
        "No real-time production agricultural data",
        "All data handling follows competition rules",
      ],
    },
    {
      id: 6,
      title: "Model Limitations",
      icon: "Cube",
      content:
        "The machine learning models in this demonstration have specific limitations:",
      items: [
        "Are experimental and for demonstration only",
        "Should not be used for actual agricultural decisions",
        "May not reflect real-world performance",
        "Are subject to competition evaluation metrics",
      ],
    },
    {
      id: 7,
      title: "Intellectual Property",
      icon: "Shield",
      content:
        "Proper attribution and respect for intellectual property are maintained throughout this project:",
      items: [
        "Competition data remains property of CSIRO and Kaggle",
        "Implementation code is open for educational review",
        "Model architectures follow standard ML practices",
        "All sources are properly cited",
      ],
    },
    {
      id: 8,
      title: "Liability Disclaimer",
      icon: "Shield",
      content:
        "THE CREATORS OF PLANTGUARD ML MAKE NO REPRESENTATIONS OR WARRANTIES OF ANY KIND:",
      items: [
        "No guarantees of completeness or accuracy",
        "No warranty of reliability or suitability",
        "No liability for decisions based on predictions",
        "Use at your own risk and discretion",
      ],
    },
    {
      id: 9,
      title: "Competition Compliance",
      icon: "Scale",
      content:
        "This project operates under and complies with specific standards and guidelines:",
      items: [
        "Kaggle Competition Rules",
        "CSIRO Research Guidelines",
        "Academic Integrity Standards",
        "Open Science Principles",
      ],
    },
    {
      id: 10,
      title: "Contact Information",
      icon: "Help",
      content:
        "For questions about this demonstration project or competition entry:",
      items: [
        "Kaggle Competition Page",
        "Project GitHub Repository",
        "Competition Discussion Forum",
        "CSIRO Research Contacts",
      ],
      links: [{ text: "Visit Competition Page", url: competitionLink }],
    },
  ];

  const renderTermSection = (section) => (
    <div
      key={section.id}
      className="section-card"
      onClick={() => toggleSection(section.id)}
    >
      <div className="section-header">
        <div className="section-icon-container">
          {renderIcon(section.icon, 26, "#27ae60")}
        </div>
        <div className="section-title-container">
          <h3 className="section-title">{section.title}</h3>
          <p className="section-number">Article {section.id}</p>
        </div>
        {renderIcon(
          expandedSections[section.id] ? "ExpandLess" : "ExpandMore",
          28,
          "#27ae60"
        )}
      </div>

      {expandedSections[section.id] && (
        <div className="section-content">
          <p className="section-content-text">{section.content}</p>

          {section.items.map((item, index) => (
            <div key={index} className="list-item">
              {renderIcon("Check", 20, "#27ae60")}
              <span className="list-item-text">{item}</span>
            </div>
          ))}

          {section.links && (
            <div className="links-container">
              {section.links.map((link, index) => (
                <button
                  key={index}
                  className="link-button"
                  onClick={() => openLink(link.url)}
                  type="button"
                >
                  {renderIcon("ExternalLink", 20, "#3498db")}
                  <span className="link-text">{link.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="container">
      {/* Header with Back Button */}
      <header className="header">
        <div className="header-top">
          <button onClick={handleBack} className="back-button" type="button">
            {renderIcon("Back", 28, "white")}
          </button>
          <h1 className="header-title">Terms of Service</h1>
          <div className="header-spacer" />
        </div>
        <p className="header-subtitle">
          PlantGuard ML Demonstration • Last Updated:{" "}
          {new Date().toLocaleDateString()}
        </p>
      </header>

      {/* Competition Banner */}
      <div className="competition-banner">
        {renderIcon("Trophy", 28, "#FFD700")}
        <div className="banner-content">
          <h3 className="banner-title">CSIRO Kaggle Competition Entry</h3>
          <p className="banner-text">
            These terms apply specifically to our competition demonstration
            project
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="content">
        <div className="sections-container">
          {termsSections.map(renderTermSection)}
        </div>

        {/* Final Notice */}
        <div className="final-notice">
          <div className="notice-header">
            {renderIcon("Info", 28, "#27ae60")}
            <h3 className="notice-title">Important Notice</h3>
          </div>
          <p className="notice-text">
            This is a demonstration project created for the CSIRO Kaggle Biomass
            Prediction Competition. It is for educational and research purposes
            only, not for commercial use. By using this application, you agree
            to these terms and acknowledge the experimental nature of this
            project.
          </p>

          <button
            className="competition-button"
            onClick={() => openLink(competitionLink)}
            type="button"
          >
            {renderIcon("ExternalLink", 24, "white")}
            <span className="competition-button-text">
              View Official Competition
            </span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;

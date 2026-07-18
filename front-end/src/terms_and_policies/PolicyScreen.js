import React, { useState, useEffect } from "react";
import "./PolicyScreen.css";

const PrivacyPolicy = ({ navigation }) => {
  const [expandedSections, setExpandedSections] = useState({});
  const [lastReadDate, setLastReadDate] = useState(null);
  const competitionLink = "https://www.kaggle.com/competitions/csiro-biomass";
  const kagglePrivacyLink = "https://www.kaggle.com/privacy";

  // Icon mapping using HTML entities and Unicode
  const icons = {
    info: "ℹ️",
    data: "📊",
    settings: "⚙️",
    storage: "💾",
    link: "🔗",
    security: "🔒",
    trophy: "🏆",
    child: "👶",
    update: "🔄",
    contact: "📞",
    warning: "⚠️",
    check: "✅",
    external: "↗️",
    expandLess: "▲",
    expandMore: "▼",
  };

  // For web, we'll use localStorage for persistence
  useEffect(() => {
    loadLastReadDate();
  }, []);

  const loadLastReadDate = () => {
    try {
      const savedDate = localStorage.getItem("privacyPolicyLastRead");
      if (savedDate) {
        setLastReadDate(new Date(savedDate));
      }
    } catch (error) {
      console.error("Error loading last read date:", error);
    }
  };

  const markAsRead = () => {
    try {
      const currentDate = new Date().toISOString();
      localStorage.setItem("privacyPolicyLastRead", currentDate);
      setLastReadDate(new Date(currentDate));

      // Navigate back or to another screen
      if (navigation && navigation.goBack) {
        navigation.goBack();
      } else if (navigation && navigation.navigate) {
        navigation.navigate("Home");
      } else {
        // For web, you might want to use window.location or a router
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Error saving read date:", error);
      alert("Failed to save preference");
    }
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

  const policySections = [
    {
      id: 1,
      title: "Project Nature and Purpose",
      icon: icons.info,
      content:
        "PlantGuard ML is a demonstration machine learning application created for:",
      items: [
        "Participation in CSIRO Kaggle Biomass Prediction Competition",
        "Educational demonstration of ML in agriculture",
        "Research and academic purposes only",
        "Non-commercial, experimental use",
      ],
    },
    {
      id: 2,
      title: "Data Sources",
      icon: icons.data,
      content: "This demonstration uses the following data:",
      items: [
        "Competition Dataset: Provided by CSIRO through Kaggle",
        "Synthetic/Test Data: Generated for application demonstration",
        "No Personal Data: This application does not collect personal user information",
        "No Real Agricultural Data: Outside of competition datasets",
      ],
    },
    {
      id: 3,
      title: "Data Processing for Competition",
      icon: icons.settings,
      content: "As a competition entry, data processing follows:",
      items: [
        "Kaggle competition rules and guidelines",
        "CSIRO research data protocols",
        "Standard ML preprocessing techniques",
        "Academic research standards",
      ],
    },
    {
      id: 4,
      title: "Data Storage and Retention",
      icon: icons.storage,
      content: "Data handling in this demonstration:",
      items: [
        "Competition data: Stored locally for model training",
        "No cloud storage of user data",
        "No database of user interactions",
        "All processing occurs on-device or in local notebooks",
      ],
    },
    {
      id: 5,
      title: "Third-Party Services",
      icon: icons.link,
      content: "This demonstration may interact with:",
      items: [
        "Kaggle Platform: For competition data and submission",
        "Kaggle Privacy Policy applies to competition participation",
      ],
      links: [
        { text: "View Competition", url: competitionLink },
        { text: "View Kaggle Privacy Policy", url: kagglePrivacyLink },
      ],
    },
    {
      id: 6,
      title: "User Privacy Protection",
      icon: icons.security,
      content: "For this demonstration project:",
      items: [
        "No user accounts are created",
        "No login credentials are stored",
        "No tracking of individual users",
        "No collection of device information",
        "No analytics or usage tracking",
      ],
    },
    {
      id: 7,
      title: "Competition-Specific Considerations",
      icon: icons.trophy,
      content: "As a Kaggle competition entry:",
      items: [
        "Submission data becomes part of public competition results",
        "Model performance metrics are publicly visible on leaderboard",
        "Code may be shared publicly as per competition rules",
        "All handling follows competition data use agreement",
      ],
    },
    {
      id: 8,
      title: "Children's Privacy",
      icon: icons.child,
      content: "This demonstration project:",
      items: [
        "Is not directed at children",
        "Does not knowingly collect any information from children",
        "Is an educational/research tool for competition participants",
      ],
    },
    {
      id: 9,
      title: "Policy Updates",
      icon: icons.update,
      content:
        "As a demonstration project, this privacy policy may be updated to reflect:",
      items: [
        "Changes in competition requirements",
        "Additional demonstration features",
        "Research methodology updates",
      ],
    },
    {
      id: 10,
      title: "Contact Information",
      icon: icons.contact,
      content: "For privacy-related questions about this demonstration:",
      items: [
        "Refer to Kaggle competition guidelines",
        "Review competition data use agreements",
        "Contact through competition platform if needed",
      ],
    },
  ];

  const renderPolicySection = (section) => (
    <div
      key={section.id}
      className="section-card"
      onClick={() => toggleSection(section.id)}
    >
      <div className="section-header">
        <div className="section-icon-container">
          <span className="section-icon-text">{section.icon}</span>
        </div>
        <div className="section-title-container">
          <h3 className="section-title">{section.title}</h3>
        </div>
        <span className="expand-icon">
          {expandedSections[section.id] ? icons.expandLess : icons.expandMore}
        </span>
      </div>

      {expandedSections[section.id] && (
        <div className="section-content">
          <p className="section-content-text">{section.content}</p>

          {section.items.map((item, index) => (
            <div key={index} className="list-item">
              <span className="check-icon">{icons.check}</span>
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
                  <span className="external-icon">{icons.external}</span>
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
      {/* Header */}
      <header className="header">
        <h1 className="header-title">Privacy Policy</h1>
        <p className="header-subtitle">
          PlantGuard ML Demonstration • Last Updated:{" "}
          {new Date().toLocaleDateString()}
        </p>
        {lastReadDate && (
          <p className="last-read-text">
            Last read: {lastReadDate.toLocaleDateString()}
          </p>
        )}
      </header>

      {/* Disclaimer Banner */}
      <div className="disclaimer-banner">
        <span className="warning-icon">{icons.warning}</span>
        <div className="disclaimer-content">
          <h3 className="disclaimer-title">Demonstration Project Notice</h3>
          <p className="disclaimer-text">
            This is a demonstration project for the CSIRO Kaggle Biomass
            Prediction Competition. All data handling is for
            educational/research purposes only.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="content">
        <div className="sections-container">
          {policySections.map(renderPolicySection)}
        </div>

        {/* Important Note */}
        <div className="important-note">
          <span className="info-icon">{icons.info}</span>
          <div className="note-content">
            <h3 className="note-title">Important Note</h3>
            <p className="note-text">
              This Privacy Policy applies only to the PlantGuard ML
              demonstration project for the CSIRO Kaggle Biomass Prediction
              Competition. For official competition policies, please refer to
              Kaggle's terms and conditions.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="buttons-container">
          <button
            className="button accept-button"
            onClick={markAsRead}
            type="button"
          >
            Accept & Continue
          </button>

          <button
            className="button back-button"
            onClick={() => {
              if (navigation && navigation.goBack) {
                navigation.goBack();
              } else {
                window.history.back();
              }
            }}
            type="button"
          >
            Go Back
          </button>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
